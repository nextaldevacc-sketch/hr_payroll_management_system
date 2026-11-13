import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

// Ensure we benchmark against the test database with full seeded records BEFORE Prisma client initializes
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';

import request from 'supertest';
import crypto from 'node:crypto';
import { STATUTORY_UAE_DEFAULT_RULES } from '@nextal/shared';

// Dynamic imports so DATABASE_URL is guaranteed before Prisma client is instantiated
const { default: app } = await import('../backend/src/app.js');
const { default: prisma } = await import('../backend/src/lib/prisma.js');
const { PayrollService } = await import('../backend/src/services/payrollService.js');

const payrollService = new PayrollService(prisma);

async function runBenchmark() {
  console.log('================================================================');
  console.log(' Nextal HR & Payroll — E6 Performance Sanity Benchmark');
  console.log(' Targets: List screens p95 < 3s | 500-Emp Payroll Calculation < 60s');
  console.log('          SIF Generation < 5s   | Payslip PDF Generation < 3s');
  console.log('================================================================\n');

  // 1. Authenticate tokens for relevant role endpoints
  const adminLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'admin@gulftech.ae',
    password: 'Nextal@2026!',
  });
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

  // 2. Measure Endpoint Latencies (Warmup + 20 iterations each)
  const endpoints = [
    { name: 'Dashboard Overview', path: '/api/v1/dashboard/overview', token: adminToken },
    { name: 'Employees Directory', path: '/api/v1/employees?limit=50', token: adminToken },
    { name: 'Payroll Runs List', path: '/api/v1/payroll/runs', token: payrollToken },
    { name: 'Attendance Grid', path: '/api/v1/attendance/grid?month=2026-10', token: hrToken },
    { name: 'Compliance Overview', path: '/api/v1/compliance/overview', token: adminToken },
    { name: 'Compliance Documents', path: '/api/v1/compliance/documents?limit=50', token: adminToken },
    { name: 'Headcount Report Data', path: '/api/v1/reports/headcount?year=2026', token: adminToken },
    { name: 'Audit Log Ledger', path: '/api/v1/audit/logs?limit=50', token: adminToken },
  ];

  const results = [];

  for (const ep of endpoints) {
    const latencies = [];
    // Warmup request
    await request(app).get(ep.path).set('Authorization', `Bearer ${ep.token}`);

    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      const res = await request(app).get(ep.path).set('Authorization', `Bearer ${ep.token}`);
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
      Target: ep.name,
      Type: 'List / API Screen',
      Min_ms: Number(min.toFixed(1)),
      Avg_ms: Number(avg.toFixed(1)),
      p95_ms: Number(p95.toFixed(1)),
      Threshold_ms: 3000,
      Status: p95 < 3000 ? 'PASS (< 3.0s)' : 'FAIL (> 3.0s)',
    });
  }

  // 3. Setup Dedicated 500-Employee Benchmark Cohort (500 employees x 12 months data)
  console.log('\n[E6 Setup] Generating 500 employees for high-volume payroll calculation benchmark...');
  const benchCompany = await prisma.$base().companies.create({
    data: {
      name: `Benchmark E6 Corp ${Date.now()}`,
      trade_license_no: `TL-E6-${Date.now()}`.slice(0, 20),
      status: 'Active',
      default_cutoff_day: 25,
      variance_threshold_pct: 10.0,
    },
  });

  let benchPayRunId = null;
  let calculationTimeMs = 0;
  let sifTimeMs = 0;
  let pdfTimeMs = 0;

  try {
    const benchVisa = await prisma.$base().company_visas.create({
      data: {
        company_id: benchCompany.id,
        name: 'Benchmark Visa 500',
        mol_establishment_id: `MOHRE-${Date.now()}`.slice(0, 18),
        bank_routing_code: 'ENBD001',
        emirate: 'Dubai',
      },
    });

    const benchBranch = await prisma.$base().branches.create({
      data: {
        company_id: benchCompany.id,
        company_visa_id: benchVisa.id,
        name: 'Main Operations Branch',
        emirate: 'Dubai',
      },
    });

    const benchDept = await prisma.$base().departments.create({
      data: { company_id: benchCompany.id, name: 'Operations Logistics' },
    });

    const benchJob = await prisma.$base().jobs.create({
      data: { company_id: benchCompany.id, department_id: benchDept.id, title: 'Logistics Specialist' },
    });

    const benchShift = await prisma.$base().shifts.create({
      data: {
        company_id: benchCompany.id,
        name: 'Standard Shift',
        start_time: '09:00:00',
        end_time: '18:00:00',
        break_minutes: 60,
        weekly_off_days: [0, 6],
      },
    });

    const benchPolicy = await prisma.$base().attendance_policies.create({
      data: { company_id: benchCompany.id, name: 'Standard Attendance' },
    });

    const benchStructure = await prisma.$base().salary_structures.create({
      data: {
        company_id: benchCompany.id,
        code: 'STD_BENCH',
        name: 'Standard Benchmark Salary Structure',
        is_active: true,
      },
    });

    for (const rule of STATUTORY_UAE_DEFAULT_RULES) {
      await prisma.$base().salary_rules.create({
        data: {
          company_id: benchCompany.id,
          structure_id: benchStructure.id,
          code: rule.code,
          name: rule.name,
          category: rule.category,
          sequence: rule.sequence,
          amount_type: rule.amount_type,
          formula: rule.formula,
          appears_on_payslip: true,
          is_pensionable: ['BASIC', 'HRA'].includes(rule.code),
        },
      });
    }

    const employeeCount = 500;
    const empBatch = [];
    for (let i = 1; i <= employeeCount; i++) {
      empBatch.push({
        id: crypto.randomUUID(),
        company_id: benchCompany.id,
        company_visa_id: benchVisa.id,
        branch_id: benchBranch.id,
        employee_code: `E6-${String(i).padStart(4, '0')}`,
        name: `Benchmark Employee ${i}`,
        gender: i % 2 === 0 ? 'Female' : 'Male',
        nationality: i % 10 === 0 ? 'ARE' : 'IND',
        residency_type: i % 10 === 0 ? 'UAENational' : 'Expat',
        status: 'Active',
        joining_date: new Date('2025-01-01'),
      });
    }

    await prisma.$base().employees.createMany({ data: empBatch });

    const contractBatch = [];
    const bankBatch = [];
    for (let i = 0; i < employeeCount; i++) {
      const empId = empBatch[i].id;
      const basic = 5000 + (i % 10) * 500;
      const housing = 2500 + (i % 10) * 250;
      const transport = 500;
      const other = 200;
      const gross = basic + housing + transport + other;

      contractBatch.push({
        company_id: benchCompany.id,
        employee_id: empId,
        department_id: benchDept.id,
        job_id: benchJob.id,
        shift_id: benchShift.id,
        attendance_policy_id: benchPolicy.id,
        structure_id: benchStructure.id,
        version_no: 1,
        effective_date: new Date('2025-01-01'),
        start_date: new Date('2025-01-01'),
        contract_type: 'Limited',
        basic,
        housing,
        transport,
        other_allowances: other,
        gross,
        status: 'Active',
      });

      bankBatch.push({
        company_id: benchCompany.id,
        employee_id: empId,
        bank_name: 'First Abu Dhabi Bank',
        iban: `AE${String(i + 1).padStart(21, '0')}`.slice(0, 23),
        routing_code: 'FAB001',
        is_primary: true,
        is_active: true,
      });
    }

    await prisma.$base().contracts.createMany({ data: contractBatch });
    await prisma.$base().bank_accounts.createMany({ data: bankBatch });

    // Create Draft Pay Run
    const benchPayRun = await prisma.$base().pay_runs.create({
      data: {
        company_id: benchCompany.id,
        company_visa_id: benchVisa.id,
        period_month: new Date('2026-10-01'),
        cutoff_date: new Date('2026-10-25'),
        run_type: 'Regular',
        status: 'Draft',
      },
    });
    benchPayRunId = benchPayRun.id;

    // 4. Measure 500-Employee Payroll Calculation
    console.log('[E6 Measure] Calculating payroll for 500 employees...');
    const calcStart = performance.now();
    const calcResult = await payrollService.calculatePayRun(benchCompany.id, benchPayRun.id, null);
    calculationTimeMs = performance.now() - calcStart;

    results.push({
      Target: '500-Employee Payroll Calculation',
      Type: 'Batch Calculation Engine',
      Min_ms: Number(calculationTimeMs.toFixed(1)),
      Avg_ms: Number(calculationTimeMs.toFixed(1)),
      p95_ms: Number(calculationTimeMs.toFixed(1)),
      Threshold_ms: 60000,
      Status: calculationTimeMs < 60000 ? 'PASS (< 60.0s)' : 'FAIL (> 60.0s)',
    });

    // 5. Validate & Lock pay run to test SIF Export
    await prisma.$base().pay_runs.update({
      where: { id: benchPayRun.id },
      data: { status: 'Locked', locked_at: new Date() },
    });

    // 6. Measure SIF Generation
    console.log('[E6 Measure] Generating UAE WPS SIF for 500 employees...');
    const sifStart = performance.now();
    const sifResult = await payrollService.getPayRunSif(benchCompany.id, benchPayRun.id);
    sifTimeMs = performance.now() - sifStart;

    results.push({
      Target: 'WPS SIF Export (500 Employees)',
      Type: 'File Generation',
      Min_ms: Number(sifTimeMs.toFixed(1)),
      Avg_ms: Number(sifTimeMs.toFixed(1)),
      p95_ms: Number(sifTimeMs.toFixed(1)),
      Threshold_ms: 5000,
      Status: sifTimeMs < 5000 ? 'PASS (< 5.0s)' : 'FAIL (> 5.0s)',
    });

    // 7. Measure Payslip PDF Generation
    const samplePayslip = await prisma.$base().payslips.findFirst({
      where: { pay_run_id: benchPayRun.id },
    });

    console.log('[E6 Measure] Generating Payslip PDF...');
    const pdfStart = performance.now();
    const pdfBuffer = await payrollService.getPayslipPdf(benchCompany.id, samplePayslip.id);
    pdfTimeMs = performance.now() - pdfStart;

    results.push({
      Target: 'Payslip Bilingual PDF Generation',
      Type: 'Document Rendering',
      Min_ms: Number(pdfTimeMs.toFixed(1)),
      Avg_ms: Number(pdfTimeMs.toFixed(1)),
      p95_ms: Number(pdfTimeMs.toFixed(1)),
      Threshold_ms: 3000,
      Status: pdfTimeMs < 3000 ? 'PASS (< 3.0s)' : 'FAIL (> 3.0s)',
    });

  } finally {
    // 8. Strict Cleanup of Generated Test Data
    console.log('\n[E6 Cleanup] Removing generated benchmark cohort and records...');
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE audit_logs DISABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE payslip_lines DISABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE payslips DISABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE pay_runs DISABLE TRIGGER ALL;');

      await prisma.$base().pay_run_issues.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().payslip_lines.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().payslips.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().pay_runs.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().contracts.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().bank_accounts.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().employees.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().jobs.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().departments.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().attendance_policies.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().shifts.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().salary_rules.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().salary_structures.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().branches.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().company_visas.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().audit_logs.deleteMany({ where: { company_id: benchCompany.id } });
      await prisma.$base().companies.delete({ where: { id: benchCompany.id } });

      await prisma.$executeRawUnsafe('ALTER TABLE audit_logs ENABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE payslip_lines ENABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE payslips ENABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE pay_runs ENABLE TRIGGER ALL;');
      console.log('[E6 Cleanup] Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.warn('[WARN] Cleanup error:', cleanupErr.message);
    }
  }

  // Also clean up any lingering benchmark company records from previous test runs if any
  try {
    const lingering = await prisma.$base().companies.findMany({
      where: { name: { startsWith: 'Benchmark E6 Corp' } },
      select: { id: true },
    });
    if (lingering.length > 0) {
      await prisma.$executeRawUnsafe('ALTER TABLE audit_logs DISABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE payslip_lines DISABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE payslips DISABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE pay_runs DISABLE TRIGGER ALL;');

      for (const c of lingering) {
        await prisma.$base().pay_run_issues.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().payslip_lines.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().payslips.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().pay_runs.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().contracts.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().bank_accounts.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().employees.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().jobs.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().departments.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().attendance_policies.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().shifts.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().salary_rules.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().salary_structures.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().branches.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().company_visas.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().audit_logs.deleteMany({ where: { company_id: c.id } });
        await prisma.$base().companies.delete({ where: { id: c.id } });
      }

      await prisma.$executeRawUnsafe('ALTER TABLE audit_logs ENABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE payslip_lines ENABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE payslips ENABLE TRIGGER ALL;');
      await prisma.$executeRawUnsafe('ALTER TABLE pay_runs ENABLE TRIGGER ALL;');
    }
  } catch {}

  console.log('\n================================================================');
  console.log(' BENCHMARK SUMMARY RESULTS TABLE');
  console.log('================================================================');
  console.table(results);

  const failures = results.filter((r) => r.Status.startsWith('FAIL'));
  if (failures.length > 0) {
    console.error(`\n[ERROR] ${failures.length} benchmark targets failed SLA thresholds!`);
    process.exit(1);
  }

  console.log('\n[SUCCESS] All performance sanity targets satisfied SLAs.');
  await prisma.$disconnect();
}

runBenchmark().catch((err) => {
  console.error('Fatal benchmark execution error:', err);
  process.exit(1);
});
