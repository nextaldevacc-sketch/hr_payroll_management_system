import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';

test('STEP 10 Security: App Hardening, Body Limits, Auth Rate Limiting & CSRF', async (t) => {
  await t.test('1. JSON payload > 100kb is rejected with 413 Payload Too Large', async () => {
    // Generate a payload slightly greater than 100kb (e.g. 120kb of data)
    const largeString = 'X'.repeat(120 * 1024);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'test@example.com', password: largeString });

    assert.equal(res.status, 413, 'Payload > 100kb must be rejected with 413');
  });

  await t.test('2. JSON payload < 100kb is parsed successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'nonexistent@example.com', password: 'ShortPassword123!' });

    // Should not be 413 (expect 401 for bad credentials)
    assert.notEqual(res.status, 413, 'Payload < 100kb must not be rejected with 413');
  });

  await t.test('3. CSRF origin check blocks unauthorized origin on state-changing requests when enforced', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .set('Origin', 'https://malicious-attacker-site.com')
      .set('x-test-csrf-enforce', 'true')
      .send({ email: 'test@example.com', password: 'password123' });

    assert.equal(res.status, 403, 'Unauthorized origin must be blocked with 403');
    assert.equal(res.body.code, 'CSRF_BLOCKED');
  });

  await t.test('4. CSRF origin check permits allowed origin or localhost in dev/test', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'nonexistent@example.com', password: 'password123' });

    assert.notEqual(res.status, 403, 'Allowed origin must not be blocked by CSRF');
  });

  await t.test('5. CSRF origin check permits requests with Bearer Authorization token', async () => {
    const res = await request(app)
      .post('/api/v1/approvals/requests')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer dummy-token')
      .send({});

    assert.notEqual(res.body?.code, 'CSRF_BLOCKED', 'Bearer authorized API calls must bypass CSRF origin block');
  });
});
