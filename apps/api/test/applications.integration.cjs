// Run only against the migrated development/test database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createApp } = require('../dist/app');
const { PrismaService } = require('../dist/database/prisma.service');
const { TokenService } = require('../dist/auth/token.service');

test('PostgreSQL CRUD preserves ownership, filters, nullable fields and atomic mutations', async () => {
  const app = await createApp();
  const prisma = app.get(PrismaService);
  const ids = [];
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const users = [];
    for (let i = 0; i < 2; i++) {
      const user = await prisma.user.create({ data: { email: `crud-${randomUUID()}@example.invalid`, passwordHash: 'integration-only-no-login' } });
      ids.push(user.id);
      users.push(user);
    }
    const jwt = app.get(TokenService);
    const tokens = users.map(user => jwt.sign(user.id));
    const request = (method, path = '', body, owner = 0) => fetch(`${base}/api/applications${path}`, {
      method, signal: AbortSignal.timeout(10000),
      headers: { authorization: `Bearer ${tokens[owner]}`, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const creation = await request('POST', '', { company: ' First ', position: 'Intern', notes: 'Private' });
    assert.equal(creation.status, 201);
    const item = await creation.json();
    assert.equal(item.company, 'First');
    assert.equal(item.status, 'DRAFT');
    assert.equal('userId' in item, false);
    assert.equal((await prisma.application.findUniqueOrThrow({ where: { id: item.id } })).userId, users[0].id);
    assert.equal((await request('POST', '', { company: 'Other account', position: 'Intern' }, 1)).status, 201);
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      assert.equal((await request(method, `/${item.id}`, method === 'PATCH' ? { company: 'Stolen' } : undefined, 1)).status, 404);
    }
    assert.equal((await prisma.application.findUniqueOrThrow({ where: { id: item.id } })).company, 'First');
    assert.equal((await (await request('GET', '', undefined, 1)).json()).total, 1);
    const updated = await request('PATCH', `/${item.id}`, { status: 'INTERVIEW', appliedAt: '2026-10-17T12:00:00Z', deadline: '2026-11-01', notes: 'Updated' });
    assert.equal(updated.status, 200);
    const detail = await (await request('GET', `/${item.id}`)).json();
    assert.equal(detail.status, 'INTERVIEW');
    assert.equal(detail.appliedAt, '2026-10-17T12:00:00.000Z');
    assert.equal((await request('PATCH', `/${item.id}`, { notes: null, appliedAt: null, deadline: null })).status, 200);
    const cleared = await prisma.application.findUniqueOrThrow({ where: { id: item.id } });
    assert.equal(cleared.notes, null);
    assert.equal(cleared.appliedAt, null);
    assert.equal(cleared.deadline, null);
    assert.equal((await request('POST', '', { company: 'Second', position: 'Intern', status: 'INTERVIEW' })).status, 201);
    const list = await (await request('GET', '?status=INTERVIEW&pageSize=1')).json();
    const next = await (await request('GET', '?status=INTERVIEW&pageSize=1&page=2')).json();
    assert.equal(list.total, 2);
    assert.equal(list.items.length, 1);
    assert.notEqual(list.items[0].id, next.items[0].id);
    assert.equal((await request('POST', '', { company: 'Attempt', position: 'Intern', userId: users[1].id })).status, 400);
    assert.equal((await request('PATCH', `/${item.id}`, {})).status, 400);
    assert.equal((await request('DELETE', `/${item.id}`)).status, 204);
    assert.equal(await prisma.application.count({ where: { id: item.id } }), 0);
    assert.equal((await request('GET', `/${item.id}`)).status, 404);
    assert.equal((await (await request('GET', '', undefined, 1)).json()).total, 1);
  } finally {
    try { if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } }); }
    finally { await app.close(); }
  }
});
