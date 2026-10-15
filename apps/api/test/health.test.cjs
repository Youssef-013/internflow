require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/database/prisma.service');

let app;
let baseUrl;
let databaseAvailable = true;
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({ $queryRaw: async () => {
      if (!databaseAvailable) throw new Error('postgres://secret-should-not-leak');
      return [{ '?column?': 1 }];
    } })
    .compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});
after(async () => { await app?.close(); });

test('liveness responds through the actual Nest HTTP server', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'internflow-api' });
});
test('readiness checks the database', async () => {
  const response = await fetch(`${baseUrl}/api/health/ready`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' });
});
test('database failure returns 503 without leaking connection details; liveness survives', async () => {
  databaseAvailable = false;
  try {
    const response = await fetch(`${baseUrl}/api/health/ready`);
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.match(body, /Database unavailable/);
    assert.doesNotMatch(body, /postgres|secret/);
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
  } finally { databaseAvailable = true; }
});
