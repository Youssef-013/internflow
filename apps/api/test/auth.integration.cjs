// Run only against the migrated development/test database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createApp } = require('../dist/app');
const { PrismaService } = require('../dist/database/prisma.service');

test('registration, login and protected profile work against PostgreSQL without leaking credentials', async () => {
  const app = await createApp();
  const prisma = app.get(PrismaService);
  const email = `auth-${randomUUID()}@example.invalid`;
  const password = 'Integration password 123!';
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const post = (path, credentials) => fetch(`${base}/api/auth/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
    });
    const registration = await post('register', { email, password });
    assert.equal(registration.status, 201);
    const registered = await registration.json();
    assert.equal(registered.user.email, email);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    assert.notEqual(stored.passwordHash, password);
    assert.match(stored.passwordHash, /^scrypt-v1\$/);
    assert.equal((await post('register', { email: email.toUpperCase(), password })).status, 409);
    assert.equal((await post('login', { email, password: 'Wrong integration password!' })).status, 401);
    const login = await post('login', { email, password });
    assert.equal(login.status, 200);
    const session = await login.json();
    const response = await fetch(`${base}/api/auth/me`, { headers: { authorization: `Bearer ${session.accessToken}` } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), registered.user);
    assert.equal((await fetch(`${base}/api/auth/me`)).status, 401);
    await prisma.user.delete({ where: { email } });
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: { authorization: `Bearer ${session.accessToken}` } })).status, 401);
  } finally {
    try { await prisma.user.deleteMany({ where: { email } }); } finally { await app.close(); }
  }
});
