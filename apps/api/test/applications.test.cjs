require('reflect-metadata');
process.env.JWT_SECRET = 'applications-test-secret-not-production-123456789';
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../dist/app.module');
const { configureApp } = require('../dist/app');
const { PrismaService } = require('../dist/database/prisma.service');
const { TokenService } = require('../dist/auth/token.service');

let app, base, rows, tokens;
const valid = { company: ' Example ', position: ' Backend intern ' };
const pick = (row, select) => select ? Object.fromEntries(Object.keys(select).filter(key => select[key]).map(key => [key, row[key]])) : row;
const matches = (row, where) => Object.entries(where).every(([key, value]) => value === undefined || row[key] === value);
const missing = () => Object.assign(new Error('not found'), { code: 'P2025' });

beforeEach(async () => {
  rows = new Map();
  let sequence = 0;
  const users = new Map(['owner-a', 'owner-b'].map(id => [id, { id, email: `${id}@example.invalid`, createdAt: new Date() }]));
  const find = where => [...rows.values()].filter(row => matches(row, where));
  const prisma = {
    user: { findUnique: async ({ where, select }) => users.has(where.id) ? pick(users.get(where.id), select) : null },
    application: {
      async create({ data, select }) {
        const date = new Date(Date.UTC(2026, 0, 1) + ++sequence * 1000);
        const row = { id: randomUUID(), status: 'DRAFT', notes: null, appliedAt: null, deadline: null, createdAt: date, updatedAt: date };
        for (const [key, value] of Object.entries(data)) if (value !== undefined) row[key] = value;
        rows.set(row.id, row);
        return pick(row, select);
      },
      async findFirst({ where, select }) { const row = find(where)[0]; return row ? pick(row, select) : null; },
      async findMany({ where, select, skip, take }) {
        return find(where).sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).slice(skip, skip + take).map(row => pick(row, select));
      },
      async count({ where }) { return find(where).length; },
      async update({ where, data, select }) {
        const row = find(where)[0];
        if (!row) throw missing();
        Object.assign(row, data, { updatedAt: new Date() });
        return pick(row, select);
      },
      async delete({ where, select }) {
        const row = find(where)[0];
        if (!row) throw missing();
        rows.delete(row.id);
        return pick(row, select);
      },
    },
    $queryRaw: async () => [{ value: 1 }],
  };
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(prisma).compile();
  app = configureApp(module.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  const jwt = app.get(TokenService);
  tokens = { a: jwt.sign('owner-a'), b: jwt.sign('owner-b') };
});
afterEach(async () => { await app?.close(); });

function request(method, path = '/applications', { body, token = tokens.a } = {}) {
  return fetch(`${base}/api${path}`, {
    method, signal: AbortSignal.timeout(10000),
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
async function create(body = valid, token = tokens.a) {
  const response = await request('POST', '/applications', { body, token });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
}

test('creation validates text, assigns the authenticated owner and applies defaults', async () => {
  const item = await create();
  assert.equal(item.company, 'Example');
  assert.equal(item.position, 'Backend intern');
  assert.equal(item.status, 'DRAFT');
  assert.equal(item.notes, null);
  assert.equal(rows.get(item.id).userId, 'owner-a');
  assert.equal('userId' in item, false);
  const response = await request('GET', `/applications/${item.id}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), item);
});

test('the owner can update all editable fields, clear nullable fields and delete', async () => {
  const item = await create();
  const response = await request('PATCH', `/applications/${item.id}`, { body: {
    company: ' Updated ', position: ' Fullstack intern ', status: 'INTERVIEW',
    appliedAt: '2026-10-17T12:30:00Z', deadline: '2026-11-01T00:00:00Z', notes: 'Call on Monday',
  } });
  assert.equal(response.status, 200);
  const updated = await response.json();
  assert.equal(updated.company, 'Updated');
  assert.equal(updated.position, 'Fullstack intern');
  assert.equal(updated.status, 'INTERVIEW');
  assert.equal(updated.appliedAt, '2026-10-17T12:30:00.000Z');
  assert.equal(updated.notes, 'Call on Monday');
  const cleared = await request('PATCH', `/applications/${item.id}`, { body: { notes: null, appliedAt: null, deadline: null } });
  assert.equal(cleared.status, 200);
  assert.equal((await cleared.json()).appliedAt, null);
  const deleted = await request('DELETE', `/applications/${item.id}`);
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');
  assert.equal(rows.size, 0);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    assert.equal((await request(method, `/applications/${item.id}`, { body: method === 'PATCH' ? { status: 'OFFER' } : undefined })).status, 404);
  }
});

test('another user cannot read, update or delete an application or see it in lists', async () => {
  const item = await create({ ...valid, notes: 'Private A' });
  await create({ ...valid, notes: 'Private B' }, tokens.b);
  const nonexistent = await request('GET', '/applications/not-found', { token: tokens.b });
  const expectedError = await nonexistent.json();
  assert.equal(nonexistent.status, 404);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const response = await request(method, `/applications/${item.id}`, { token: tokens.b, body: method === 'PATCH' ? { company: 'Stolen' } : undefined });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), expectedError);
  }
  assert.equal(rows.get(item.id).company, 'Example');
  for (const [token, note] of [[tokens.a, 'Private A'], [tokens.b, 'Private B']]) {
    const list = await (await request('GET', '/applications', { token })).json();
    assert.equal(list.total, 1);
    assert.deepEqual(list.items.map(row => row.notes), [note]);
  }
});

test('status filters and deterministic pagination count only the current owner', async () => {
  await create({ ...valid, status: 'APPLIED' });
  await create({ ...valid, status: 'APPLIED' });
  await create({ ...valid, status: 'REJECTED' });
  await create({ ...valid, status: 'APPLIED' }, tokens.b);
  const first = await (await request('GET', '/applications?status=APPLIED&pageSize=1')).json();
  const second = await (await request('GET', '/applications?status=APPLIED&pageSize=1&page=2')).json();
  assert.equal(first.total, 2);
  assert.equal(first.page, 1);
  assert.equal(first.pageSize, 1);
  assert.equal(first.items.length, 1);
  assert.equal(second.total, 2);
  assert.notEqual(first.items[0].id, second.items[0].id);
  const empty = await (await request('GET', '/applications?status=APPLIED&page=10')).json();
  assert.equal(empty.total, 2);
  assert.deepEqual(empty.items, []);
});

test('creation rejects invalid fields, impossible dates and ownership/mass-assignment attempts', async () => {
  for (const body of [
    { position: 'Intern' }, { ...valid, company: '   ' }, { ...valid, company: null },
    { ...valid, company: 'a'.repeat(201) }, { ...valid, position: 4 },
    { ...valid, status: 'ADMIN' }, { ...valid, status: null },
    { ...valid, appliedAt: '2026-02-30' }, { ...valid, deadline: 'yesterday' },
    { ...valid, appliedAt: '2026-W42' }, { ...valid, deadline: '2026-290' },
    { ...valid, notes: 'a'.repeat(10001) }, { ...valid, userId: 'owner-b' },
    { ...valid, id: 'chosen-id' }, { ...valid, createdAt: '2026-01-01' },
  ]) assert.equal((await request('POST', '/applications', { body })).status, 400);
  assert.equal(rows.size, 0);
});

test('invalid patches, identifiers and list queries return 400 without changing data', async () => {
  const item = await create();
  for (const body of [{}, { company: null }, { position: '  ' }, { status: null }, { notes: 1 }, { appliedAt: 'bad' }, { deadline: '2026-W42' }, { userId: 'owner-b' }]) {
    assert.equal((await request('PATCH', `/applications/${item.id}`, { body })).status, 400);
  }
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=1000001', 'pageSize=101', 'pageSize=0', 'status=ADMIN', 'userId=owner-b']) {
    assert.equal((await request('GET', `/applications?${query}`)).status, 400);
  }
  assert.equal((await request('GET', '/applications/bad%20id')).status, 400);
  assert.equal(rows.get(item.id).company, 'Example');
});

test('all CRUD endpoints require a valid authenticated account', async () => {
  for (const [method, path, body] of [
    ['GET', '/applications'], ['GET', '/applications/example'],
    ['POST', '/applications', valid], ['PATCH', '/applications/example', { status: 'OFFER' }],
    ['DELETE', '/applications/example'],
  ]) assert.equal((await request(method, path, { body, token: null })).status, 401);
  assert.equal(rows.size, 0);
});
