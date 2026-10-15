// Run only against a disposable, migrated development/test database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

test('migration supports user/application relations, defaults, isolation and cascading deletion', async () => {
  const prisma = new PrismaClient();
  const ids = [];
  try {
    const user = await prisma.user.create({ data: { email: `test-${randomUUID()}@example.invalid`, passwordHash: 'integration-test-only' } });
    ids.push(user.id);
    const other = await prisma.user.create({ data: { email: `test-${randomUUID()}@example.invalid`, passwordHash: 'integration-test-only' } });
    ids.push(other.id);
    const application = await prisma.application.create({ data: { company: 'Test', position: 'Intern', userId: user.id } });
    assert.equal(application.status, 'DRAFT');
    assert.equal((await prisma.application.findMany({ where: { userId: other.id } })).length, 0);
    await assert.rejects(prisma.user.create({ data: { email: user.email, passwordHash: 'test' } }), { code: 'P2002' });
    await prisma.user.delete({ where: { id: user.id } });
    assert.equal(await prisma.application.count({ where: { id: application.id } }), 0);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
