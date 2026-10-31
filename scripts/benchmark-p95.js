import request from 'supertest';
import app from '../backend/src/app.js';
import prisma from '../backend/src/lib/prisma.js';

async function runBenchmark() {
  console.log('Running API p95 Latency Benchmark across Main Screens...');

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'admin@gulftech.ae',
    password: 'Nextal@2026!',
  });
  const token = loginRes.body.token;

  const endpoints = [
    { name: 'Dashboard Overview', path: '/api/v1/dashboard/overview' },
    { name: 'Employees Directory', path: '/api/v1/employees?limit=50' },
    { name: 'Payroll Runs List', path: '/api/v1/payroll/runs' },
    { name: 'Attendance Grid', path: '/api/v1/attendance/grid?month=2026-10' },
    { name: 'Compliance Overview', path: '/api/v1/compliance/overview' },
    { name: 'Compliance Documents', path: '/api/v1/compliance/documents?limit=50' },
    { name: 'Headcount Report Data', path: '/api/v1/reports/headcount?year=2026' },
    { name: 'Audit Log Ledger', path: '/api/v1/audit/logs?limit=50' },
  ];

  const results = [];

  for (const ep of endpoints) {
    const latencies = [];
    // Warmup request
    await request(app).get(ep.path).set('Authorization', `Bearer ${token}`);

    // Measure 20 iterations
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      const res = await request(app).get(ep.path).set('Authorization', `Bearer ${token}`);
      const duration = performance.now() - start;
      if (res.status >= 400) {
        console.warn(`[WARN] ${ep.name} returned status ${res.status}`);
      }
      latencies.push(duration);
    }

    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    results.push({
      name: ep.name,
      path: ep.path,
      min: Number(min.toFixed(2)),
      avg: Number(avg.toFixed(2)),
      p95: Number(p95.toFixed(2)),
      max: Number(max.toFixed(2)),
      status: p95 < 2000 ? 'PASS (< 2.0s)' : 'FAIL (> 2.0s)',
    });
  }

  console.table(results);
  await prisma.$disconnect();
  return results;
}

runBenchmark().catch(console.error);
