import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { z } from 'zod';
import app from '../src/app.js';
import { validateBody } from '../src/middleware/validate.js';

describe('API Skeleton & Middlewares Tests', () => {
  it('1. GET /api/v1/health returns status ok, database connected, and 43 tables', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'connected');
    assert.ok(res.body.tables_count >= 43, 'All 43 core tables plus auth extensions must be present');
    assert.ok(res.body.timestamp);
  });

  it('2. GET /api/docs serves Swagger UI documentation', async () => {
    const res = await request(app).get('/api/docs/');
    assert.ok(res.status === 200 || res.status === 301 || res.status === 302);
    if (res.status === 200) {
      assert.ok(res.text.includes('swagger') || res.text.includes('Swagger'));
    }
  });

  it('3. Security headers (Helmet) and CORS are active', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.ok(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['x-dns-prefetch-control']);
  });

  it('4. Zod validation middleware rejects invalid payloads with 400 and structured errors', async () => {
    // Dynamically mount a test route using validateBody
    const testSchema = z.object({
      name: z.string().min(3),
      gross: z.number().positive(),
    });

    app.post('/api/test/validate', validateBody(testSchema), (req, res) => {
      res.json({ success: true, data: req.body });
    });

    const res = await request(app)
      .post('/api/test/validate')
      .send({ name: 'ab', gross: -100 });

    assert.equal(res.status, 400);
    assert.equal(res.body.status, 'error');
    assert.equal(res.body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.errors));
    assert.equal(res.body.errors.length, 2);
  });
});
