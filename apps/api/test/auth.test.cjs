require('reflect-metadata');
process.env.JWT_SECRET = 'auth-test-secret-not-for-production-123456789';
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { Controller, Get } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../dist/app.module');
const { configureApp } = require('../dist/app');
const { PrismaService } = require('../dist/database/prisma.service');
const { PasswordService } = require('../dist/auth/password.service');
const { readAuthSecret } = require('../dist/auth/token.service');

class PrivateProbe { read() { return { protected: true }; } }
Controller('private-probe')(PrivateProbe);
Get()(PrivateProbe.prototype, 'read', Object.getOwnPropertyDescriptor(PrivateProbe.prototype, 'read'));

let app;
let base;
let users;
const credentials = { email: 'candidate@example.com', password: 'Correct horse battery staple!' };
const publicUser = ({ id, email, createdAt }) => ({ id, email, createdAt });

beforeEach(async () => {
  users = new Map();
  const prisma = { user: {
    async create({ data }) {
      if (users.has(data.email)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      const user = { ...data, id: randomUUID(), createdAt: new Date() };
      users.set(user.email, user);
      return publicUser(user);
    },
    async findUnique({ where, select }) {
      const user = where.email ? users.get(where.email) : [...users.values()].find(value => value.id === where.id);
      return user ? (select ? publicUser(user) : user) : null;
    },
  }, $queryRaw: async () => [{ value: 1 }] };
  const module = await Test.createTestingModule({ imports: [AppModule], controllers: [PrivateProbe] })
    .overrideProvider(PrismaService).useValue(prisma).compile();
  app = configureApp(module.createNestApplication({ logger: false }));
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterEach(async () => { await app?.close(); });

async function request(path, { body, token, headers = {} } = {}) {
  return fetch(`${base}/api${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function register(body = credentials) {
  const response = await request('/auth/register', { body });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.json();
}

test('registration normalizes email, hashes password and returns only public user data', async () => {
  const session = await register({ ...credentials, email: ' Candidate@Example.COM ' });
  assert.equal(session.user.email, credentials.email);
  assert.equal(session.expiresIn, 900);
  assert.equal(session.tokenType, 'Bearer');
  assert.deepEqual(Object.keys(session.user).sort(), ['createdAt', 'email', 'id']);
  const stored = users.get(credentials.email).passwordHash;
  assert.match(stored, /^scrypt-v1\$/);
  assert.notEqual(stored, credentials.password);
  assert.equal(await new PasswordService().verify(credentials.password, stored), true);
  assert.equal(jwt.decode(session.accessToken).sub, session.user.id);
});

test('login succeeds and the protected profile contains no password hash', async () => {
  const registered = await register();
  const response = await request('/auth/login', { body: credentials });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const session = await response.json();
  const me = await request('/auth/me', { token: session.accessToken });
  assert.equal(me.status, 200);
  assert.equal(me.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await me.json(), registered.user);
});

test('duplicate email, including normalized spelling, returns a conflict', async () => {
  await register();
  const response = await request('/auth/register', { body: { ...credentials, email: ' CANDIDATE@example.com ' } });
  assert.equal(response.status, 409);
  assert.equal(users.size, 1);
});

test('invalid DTOs, short/oversized passwords and extra properties are rejected before persistence', async () => {
  for (const body of [
    { ...credentials, email: 'bad' }, { ...credentials, email: 5 },
    { ...credentials, password: 'short' }, { ...credentials, password: 'a'.repeat(129) },
    { ...credentials, role: 'admin' }, { email: credentials.email },
  ]) assert.equal((await request('/auth/register', { body })).status, 400);
  assert.equal(users.size, 0);
});

test('wrong password and unknown account return the same generic error', async () => {
  await register();
  const wrong = await request('/auth/login', { body: { ...credentials, password: 'Wrong password still long!' } });
  const missing = await request('/auth/login', { body: { ...credentials, email: 'missing@example.com' } });
  assert.equal(wrong.status, 401);
  assert.equal(missing.status, 401);
  assert.deepEqual(await wrong.json(), await missing.json());
});

test('all routes are protected by default, while health remains public', async () => {
  assert.equal((await request('/auth/me')).status, 401);
  assert.equal((await request('/private-probe')).status, 401);
  assert.equal((await request('/health')).status, 200);
  const session = await register();
  assert.equal((await request('/private-probe', { token: session.accessToken })).status, 200);
});

test('tampered, expired, wrong-issuer/audience, unsigned and missing-expiry tokens are rejected', async () => {
  const session = await register();
  const options = { algorithm: 'HS256', subject: session.user.id, issuer: 'internflow-api', audience: 'internflow-web', expiresIn: 900 };
  const sign = (payload, overrides = {}, secret = process.env.JWT_SECRET) => jwt.sign(payload, secret, { ...options, ...overrides });
  const tokens = [
    sign({}, {}, 'another-test-secret-not-valid-1234567890'),
    sign({ iat: Math.floor(Date.now() / 1000) - 1000 }),
    sign({}, { issuer: 'other-api' }), sign({}, { audience: 'other-client' }),
    sign({}, { expiresIn: 1800 }),
    jwt.sign({ sub: session.user.id, iss: 'internflow-api', aud: 'internflow-web' }, process.env.JWT_SECRET, { algorithm: 'HS256' }),
    jwt.sign({ sub: session.user.id }, '', { algorithm: 'none' }),
    'not.a.token',
  ];
  for (const token of tokens) assert.equal((await request('/auth/me', { token })).status, 401);
  assert.equal((await request('/auth/me', { headers: { authorization: `Basic ${session.accessToken}` } })).status, 401);
});

test('deleting an account invalidates its protected access immediately', async () => {
  const session = await register();
  users.clear();
  assert.equal((await request('/auth/me', { token: session.accessToken })).status, 401);
});

test('authentication attempts are limited, and a forwarded IP cannot bypass the limit', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await request('/auth/login', { body: {}, headers: { 'x-forwarded-for': `192.0.2.${i}` } })).status, 400);
  assert.equal((await request('/auth/login', { body: {} })).status, 429);
});

test('startup refuses missing, short and placeholder JWT secrets', () => {
  const original = process.env.JWT_SECRET;
  try {
    for (const secret of ['', 'short', 'REPLACE_WITH_A_PRIVATE_RANDOM_SECRET_OF_AT_LEAST_32_BYTES']) {
      process.env.JWT_SECRET = secret;
      assert.throws(readAuthSecret, /JWT_SECRET/);
    }
  } finally { process.env.JWT_SECRET = original; }
});
