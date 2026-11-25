import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import { executeJob, REGISTERED_JOBS } from '../../src/jobs/scheduler.js';

describe('Scalability & Reliability Features', () => {
  test('Readiness endpoint GET /api/v1/ready returns 200 and ready state', async () => {
    const res = await request(app).get('/api/v1/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
    assert.equal(res.body.database, 'connected');
    assert.ok(res.body.memory);
    assert.ok(typeof res.body.memory.heapUsedMB === 'number');
  });

  test('Readiness check route /readyz returns 200 and ready state', async () => {
    const res = await request(app).get('/readyz');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
  });

  test('PostgreSQL advisory lock prevents concurrent job execution', async () => {
    const testJobKey = 'email_outbox';
    const lockKey = `job:${testJobKey}`;

    // Create an independent DB connection representing a separate instance/worker
    const peerInstanceClient = new PrismaClient();
    await peerInstanceClient.$connect();

    try {
      // Peer instance acquires the session advisory lock
      const lockAcquired = await peerInstanceClient.$queryRawUnsafe(
        'SELECT pg_try_advisory_lock(hashtext($1)) as acquired',
        lockKey
      );
      assert.equal(lockAcquired[0].acquired, true);

      // Main application executeJob should detect that the lock is held by another session
      const result = await executeJob(testJobKey, 'TEST_RUNNER');
      assert.equal(result.success, true);
      assert.equal(result.skipped, true);
      assert.equal(result.reason, 'LOCKED_BY_ANOTHER_INSTANCE');

      // Peer instance releases the lock
      await peerInstanceClient.$queryRawUnsafe('SELECT pg_advisory_unlock(hashtext($1)) as unlocked', lockKey);
    } finally {
      await peerInstanceClient.$disconnect();
    }

    // Now executeJob should be able to run without skipping
    const normalResult = await executeJob(testJobKey, 'TEST_RUNNER');
    assert.equal(normalResult.success, true);
    assert.notEqual(normalResult.skipped, true);
  });
});
