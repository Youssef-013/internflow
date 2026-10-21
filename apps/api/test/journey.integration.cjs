// Full authenticated API lifecycle against a migrated, disposable PostgreSQL database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createApp } = require('../dist/app');
const { PrismaService } = require('../dist/database/prisma.service');

test('real JWT sessions preserve Kanban totals, pagination, ownership and persisted status', { timeout: 60000 }, async () => {
  const app = await createApp();
  const prisma = app.get(PrismaService);
  const emails = [0, 1].map(() => `journey-${randomUUID()}@example.invalid`);
  const password = 'Journey test password 123!';
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const request = (method, path, token, body) => fetch(`${base}/api${path}`, {
      method, signal: AbortSignal.timeout(10000),
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sessions = [];
    for (const email of emails) {
      const registration = await request('POST', '/auth/register', null, { email, password });
      assert.equal(registration.status, 201);
      const login = await request('POST', '/auth/login', null, { email, password });
      assert.equal(login.status, 200); sessions.push(await login.json());
    }
    const token = sessions[0].accessToken, otherToken = sessions[1].accessToken;
    const creation = await request('POST', '/applications', token, { company: 'Journey company', position: 'Intern', status: 'APPLIED', notes: 'Preserve me' });
    assert.equal(creation.status, 201); const item = await creation.json();
    await prisma.application.createMany({ data: Array.from({ length: 20 }, (_, index) => ({ userId: sessions[0].user.id, company: `Page ${index}`, position: 'Intern', status: 'APPLIED' })) });
    await prisma.application.create({ data: { userId: sessions[1].user.id, company: 'Private other account', position: 'Intern', status: 'OFFER' } });
    const read = async (path, access = token) => {
      const response = await request('GET', path, access); assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store'); return response.json();
    };
    const first = await read('/applications?status=APPLIED&page=1&pageSize=20');
    const second = await read('/applications?status=APPLIED&page=2&pageSize=20');
    assert.equal(first.total, 21); assert.equal(first.items.length, 20); assert.equal(second.items.length, 1);
    assert.equal(new Set([...first.items, ...second.items].map(row => row.id)).size, 21);
    assert.equal((await request('PATCH', `/applications/${item.id}`, otherToken, { status: 'OFFER' })).status, 404);
    assert.equal((await request('PATCH', `/applications/${item.id}`, null, { status: 'OFFER' })).status, 401);
    assert.equal((await request('PATCH', `/applications/${item.id}`, token, { status: 'INTERVIEW' })).status, 200);
    const persisted = await prisma.application.findUniqueOrThrow({ where: { id: item.id } });
    assert.equal(persisted.status, 'INTERVIEW'); assert.equal(persisted.notes, 'Preserve me');
    const totals = {};
    for (const status of ['DRAFT', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED']) totals[status] = (await read(`/applications?status=${status}`)).total;
    assert.deepEqual(totals, { DRAFT: 0, APPLIED: 20, INTERVIEW: 1, OFFER: 0, REJECTED: 0 });
    assert.equal((await read('/applications', otherToken)).total, 1);
    const relogin = await request('POST', '/auth/login', null, { email: emails[0], password });
    assert.equal(relogin.status, 200);
    assert.equal((await read(`/applications/${item.id}`, (await relogin.json()).accessToken)).status, 'INTERVIEW');
    assert.equal((await request('DELETE', `/applications/${item.id}`, token)).status, 204);
    assert.equal((await read('/applications')).total, 20);
  } finally {
    try { await prisma.user.deleteMany({ where: { email: { in: emails } } }); }
    finally { await app.close(); }
  }
});
