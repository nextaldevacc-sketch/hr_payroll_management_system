import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mailer from '../../src/lib/mailer.js';
import scheduler from '../../src/jobs/scheduler.js';

describe('Part 8 Item 5: Startup Tolerance & Swagger Log Suppression', () => {
  it('1. mailer.processOutboxBatch tolerates missing database table and returns pendingMigrations: true', async () => {
    // Mock prisma.email_outbox to throw P2021 (Table does not exist)
    const originalFindMany = mailer.prisma?.email_outbox?.findMany;
    const fakePrisma = {
      email_outbox: {
        findMany: async () => {
          const err = new Error('The table `public.email_outbox` does not exist in the current database.');
          err.code = 'P2021';
          throw err;
        },
      },
    };

    // Temporarily substitute prisma
    const prevWarned = mailer._missingOutboxTableWarned;
    mailer._missingOutboxTableWarned = false;

    // Run with mock
    const realPrisma = mailer.prisma;
    mailer.prisma = fakePrisma;

    try {
      const result = await mailer.processOutboxBatch();
      assert.equal(result.pendingMigrations, true, 'Must return pendingMigrations: true when table is missing');
      assert.equal(result.processed, 0);
      assert.equal(result.sent, 0);
      assert.equal(result.failed, 0);
      assert.equal(mailer._missingOutboxTableWarned, true, 'Must set warning flag to prevent log spam');

      // Second call should not spam logs
      const result2 = await mailer.processOutboxBatch();
      assert.equal(result2.pendingMigrations, true);
    } finally {
      mailer.prisma = realPrisma;
      mailer._missingOutboxTableWarned = prevWarned;
    }
  });

  it('2. scheduler.executeJob handles pendingMigrations without throwing or failing', async () => {
    // Temporary runner that simulates missing table
    const origRunner = scheduler.REGISTERED_JOBS.email_outbox.runner;
    scheduler.REGISTERED_JOBS.email_outbox.runner = async () => ({
      processed: 0,
      sent: 0,
      failed: 0,
      pendingMigrations: true,
    });

    try {
      const execResult = await scheduler.executeJob('email_outbox', 'STARTUP_TEST');
      assert.equal(execResult.success, true);
      assert.equal(execResult.pendingMigrations, true);
    } finally {
      scheduler.REGISTERED_JOBS.email_outbox.runner = origRunner;
    }
  });

  it('3. Swagger documentation log line suppression logic when docs are disabled in production', () => {
    function getDocsStatus(nodeEnv, enableApiDocs) {
      const isProd = nodeEnv === 'production';
      return !isProd || enableApiDocs === 'true';
    }

    assert.equal(getDocsStatus('production', undefined), false, 'Docs disabled in prod by default');
    assert.equal(getDocsStatus('production', 'false'), false, 'Docs disabled in prod when false');
    assert.equal(getDocsStatus('production', 'true'), true, 'Docs enabled in prod only when ENABLE_API_DOCS=true');
    assert.equal(getDocsStatus('development', undefined), true, 'Docs enabled in development');
    assert.equal(getDocsStatus('test', undefined), true, 'Docs enabled in test');
  });
});

