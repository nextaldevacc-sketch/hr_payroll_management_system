import test from 'node:test';
import assert from 'node:assert/strict';
import { maskPii, errorHandler } from '../src/middleware/errorHandler.js';

test('Error Sanitization and Log PII Masking (B2)', async (t) => {
  await t.test('maskPii masks UAE IBAN numbers', () => {
    const raw = 'Error processing transfer to AE070331234567890123456 during pay run';
    const masked = maskPii(raw);
    assert.ok(!masked.includes('AE070331234567890123456'));
    assert.ok(masked.includes('AE07****************456'));
  });

  await t.test('maskPii masks Emirates ID numbers', () => {
    const raw = 'Verification failed for Emirates ID 784-1990-1234567-1 on record';
    const masked = maskPii(raw);
    assert.ok(!masked.includes('784-1990-1234567-1'));
    assert.ok(masked.includes('784-****-*******-*'));
  });

  await t.test('maskPii masks Passport numbers', () => {
    const raw = 'Document validation error for passport P1234567';
    const masked = maskPii(raw);
    assert.ok(!masked.includes('P1234567'));
    assert.ok(masked.includes('P*******'));
  });

  await t.test('errorHandler sanitizes Prisma internal messages and hides stack in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Invalid `prisma.users.findUnique()` invocation:\nRaw DB Connection error');
    err.code = 'P2010';

    let sentStatus = null;
    let sentJson = null;

    const res = {
      status(code) {
        sentStatus = code;
        return this;
      },
      json(payload) {
        sentJson = payload;
        return this;
      },
    };

    try {
      errorHandler(err, {}, res, () => {});
      assert.equal(sentStatus, 500);
      assert.equal(sentJson.status, 'error');
      // Must not leak Prisma details
      assert.ok(!sentJson.message.includes('prisma'));
      assert.ok(!sentJson.message.includes('findUnique'));
      assert.equal(sentJson.stack, undefined);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

