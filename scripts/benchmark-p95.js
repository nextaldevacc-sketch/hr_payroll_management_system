import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

// Ensure we benchmark against the test database with full seeded records BEFORE Prisma client initializes
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';

import request from 'supertest';
import crypto from 'node:crypto';

// Dynamic imports so DATABASE_URL is guaranteed before Prisma client is instantiated
const { default: app } = await import('../backend/src/app.js');
const { default: prisma } = await import('../backend/src/lib/prisma.js');

async function runBenchmark() {
  console.log('================================================================');
  console.log(' Nextal HR & Payroll — Step 4 Latency Benchmark (100 reqs/endpoint)');
  console.log(' Target SLA: warm cache API p95 < 60ms (threshold < 80ms)');
  console.log('================================================================\n');

  // Authenticate tokens for test accounts
  const adminLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'admin@gulftech.ae',
    password: 'Nextal@2026!',
  });
  if (adminLogin.status !== 200 || !adminLogin.body.token) {
    throw new Error(`Failed to login as admin: ${adminLogin.status} ${JSON.stringify(adminLogin.body)}`);
  }
  const adminToken = adminLogin.body.token;

  const payrollLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'payroll@gulftech.ae',
    password: 'Nextal@2026!',
  });
  const payrollToken = payrollLogin.body.token;

  const hrLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'hr.mgr@gulftech.ae',
    password: 'Nextal@2026!',
  });
  const hrToken = hrLogin.body.token;

  // The 4 required endpoints: 100 requests each
  const targetEndpoints = [
    { name: 'GET /api/v1/employees?limit=25', path: '/api/v1/employees?limit=25', token: adminToken },
    { name: 'GET /api/v1/payroll/runs', path: '/api/v1/payroll/runs', token: payrollToken },
    { name: 'GET /api/v1/approvals/pending', path: '/api/v1/approvals/pending', token: hrToken },
    { name: 'GET /api/v1/me/rejections', path: '/api/v1/me/rejections', token: adminToken },
  ];

  const results = [];
  const REQUEST_COUNT = 100;

  for (const ep of targetEndpoints) {
    // 1. Warmup (5 requests)
    for (let w = 0; w < 5; w++) {
      await request(app).get(ep.path).set('Authorization', `Bearer ${ep.token}`);
    }

    // 2. Timed run (100 requests)
    const latencies = [];
    for (let i = 0; i < REQUEST_COUNT; i++) {
      const start = performance.now();
      const res = await request(app).get(ep.path).set('Authorization', `Bearer ${ep.token}`);
      const duration = performance.now() - start;
      if (res.status >= 400) {
        console.warn(`[WARN] ${ep.name} returned status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      latencies.push(duration);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    results.push({
      Endpoint: ep.name,
      Requests: REQUEST_COUNT,
      'Min (ms)': Number(min.toFixed(2)),
      'p50 (ms)': Number(p50.toFixed(2)),
      'p95 (ms)': Number(p95.toFixed(2)),
      'p99 (ms)': Number(p99.toFixed(2)),
      'Max (ms)': Number(max.toFixed(2)),
      'Avg (ms)': Number(avg.toFixed(2)),
      Status: p95 < 60 ? 'PASS (< 60ms)' : p95 < 80 ? 'ACCEPTABLE (< 80ms)' : 'FAIL (> 80ms)',
    });
  }

  console.table(results);
  await prisma.$disconnect();
  return results;
}

runBenchmark().catch((err) => {
  console.error('Fatal benchmark execution error:', err);
  process.exit(1);
});
