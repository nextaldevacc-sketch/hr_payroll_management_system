import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../src/lib/prisma.js';
import { PayrollService } from '../../src/services/payrollService.js';
import { STATUTORY_UAE_DEFAULT_RULES } from '@nextal/shared';

const payrollService = new PayrollService(prisma);

describe('NFR-7: 500-Employee Payroll Calculation Performance Benchmark (< 30s)', () => {
  let perfCompany;
  let perfVisa;
  let perfStructure;
  let perfUser;
  let perfPayRun;
  const benchmarkEmployeeCount = 500;

  before(async () => {
    // 1. Create dedicated benchmark company
    perfCompany = await prisma.$base().companies.create({
      data: {
        name: `Perf Benchmark LLC ${Date.now()}`,
        trade_license_no: `TL-PERF-${Date.now()}`.slice(0, 20),
        status: 'Active',
        default_cutoff_day: 25,
        variance_threshold_pct: 10.0,
      },
    });

    perfVisa = await prisma.$base().company_visas.create({
      data: {
        company_id: perfCompany.id,
        name: 'Perf Visa Main',
        mol_establishment_id: `MOHRE-${Date.now()}`.slice(0, 18),
        bank_routing_code: 'ENBD001',
        emirate: 'Dubai',
      },
    });

    const perfBranch = await prisma.$base().branches.create({
      data: {
        company_id: perfCompany.id,
        company_visa_id: perfVisa.id,
        name: 'Perf Main Branch',
        emirate: 'Dubai',
      },
    });

    perfUser = await prisma.$base().users.create({
      data: {
        company_id: perfCompany.id,
        email: `benchmark.${Date.now()}@perf.ae`,
        password_hash: 'hashedpassword',
        status: 'Active',
      },
    });

    // 2. Create organizational dependencies for contracts
    const perfDept = await prisma.$base().departments.create({
      data: {
        company_id: perfCompany.id,
        name: 'Benchmark Operations Dept',
      },
    });

    const perfJob = await prisma.$base().jobs.create({
      data: {
        company_id: perfCompany.id,
        department_id: perfDept.id,
        title: 'Benchmark Operator',
      },
    });

    const perfShift = await prisma.$base().shifts.create({
      data: {
        company_id: perfCompany.id,
        name: 'Standard 9 to 6',
        start_time: '09:00:00',
        end_time: '18:00:00',
        break_minutes: 60,
        weekly_off_days: [0, 6],
      },
    });

    const perfPolicy = await prisma.$base().attendance_policies.create({
      data: {
        company_id: perfCompany.id,
        name: 'Benchmark Attendance Policy',
      },
    });

    perfStructure = await prisma.$base().salary_structures.create({
      data: {
        company_id: perfCompany.id,
        code: 'BENCHMARK',
        name: 'Standard Benchmark Salary Structure',
        is_active: true,
      },
    });

    for (const rule of STATUTORY_UAE_DEFAULT_RULES) {
      await prisma.$base().salary_rules.create({
        data: {
          company_id: perfCompany.id,
          structure_id: perfStructure.id,
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

    // 3. Bulk insert 500 employees, contracts, and bank accounts
    console.log(`Setting up ${benchmarkEmployeeCount} employees for performance benchmark...`);
    const empBatch = [];

    for (let i = 1; i <= benchmarkEmployeeCount; i++) {
      empBatch.push({
        id: crypto.randomUUID(),
        company_id: perfCompany.id,
        company_visa_id: perfVisa.id,
        branch_id: perfBranch.id,
        employee_code: `PEMP-${String(i).padStart(4, '0')}`,
        name: `Benchmark Worker ${i}`,
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

    for (let i = 0; i < benchmarkEmployeeCount; i++) {
      const empId = empBatch[i].id;
      const basic = 6000 + (i % 5) * 1000;
      const housing = 3000 + (i % 5) * 500;
      const transport = 500;
      const other = 500;
      const gross = basic + housing + transport + other;

      contractBatch.push({
        company_id: perfCompany.id,
        employee_id: empId,
        department_id: perfDept.id,
        job_id: perfJob.id,
        shift_id: perfShift.id,
        attendance_policy_id: perfPolicy.id,
        structure_id: perfStructure.id,
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
        company_id: perfCompany.id,
        employee_id: empId,
        bank_name: 'Emirates NBD',
        iban: `AE${String(i).padStart(21, '0')}`.slice(0, 23),
        routing_code: 'ENBD001',
        is_primary: true,
        is_active: true,
      });
    }

    await prisma.$base().contracts.createMany({ data: contractBatch });
    await prisma.$base().bank_accounts.createMany({ data: bankBatch });

    // 4. Create Pay Run in Draft
    perfPayRun = await prisma.$base().pay_runs.create({
      data: {
        company_id: perfCompany.id,
        company_visa_id: perfVisa.id,
        period_month: new Date('2026-10-01'),
        cutoff_date: new Date('2026-10-25'),
        run_type: 'Regular',
        status: 'Draft',
        created_by: perfUser.id,
      },
    });
  });

  after(async () => {
    try {
      if (perfCompany) {
        // Direct cleanup
        await prisma.$base().$executeRaw`UPDATE pay_runs SET status = 'Draft' WHERE company_id = ${perfCompany.id}::uuid`;
        await prisma.$base().pay_run_issues.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().payslip_lines.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().payslips.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().pay_runs.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().contracts.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().bank_accounts.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().employees.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().jobs.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().departments.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().attendance_policies.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().shifts.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().salary_rules.deleteMany({ where: { company_id: perfCompany.id } });
        await prisma.$base().salary_structures.deleteMany({ where: { company_id: perfCompany.id } });
      }
    } catch (e) {
      // Non-fatal cleanup
    } finally {
      await prisma.$disconnect();
    }
  });

  it('Calculates 500 employee payslips in under 30 seconds (NFR-7)', async () => {
    const startTime = performance.now();
    const result = await payrollService.calculatePayRun(perfCompany.id, perfPayRun.id, perfUser.id);
    const durationMs = performance.now() - startTime;

    console.log(`\n========================================`);
    console.log(`NFR-7 BENCHMARK RESULT:`);
    console.log(`Calculated ${result.employee_count} employees in ${durationMs.toFixed(2)} ms (${(durationMs / 1000).toFixed(2)}s)`);
    console.log(`Target: < 30,000 ms (< 30s)`);
    console.log(`Total Gross: AED ${result.total_gross}`);
    console.log(`Total Net:   AED ${result.total_net}`);
    console.log(`========================================\n`);

    assert.equal(result.employee_count, benchmarkEmployeeCount, `Expected exactly ${benchmarkEmployeeCount} payslips calculated`);
    assert(durationMs < 30000, `Calculation of 500 employees took ${durationMs}ms which exceeds the 30-second NFR-7 limit`);

    // Verify DB integrity: payslips and lines were committed
    const payslipsCount = await prisma.$base().payslips.count({ where: { pay_run_id: perfPayRun.id } });
    assert.equal(payslipsCount, benchmarkEmployeeCount, 'Database must contain 500 persisted payslip records');

    const linesCount = await prisma.$base().payslip_lines.count({ where: { payslip: { pay_run_id: perfPayRun.id } } });
    assert(linesCount >= benchmarkEmployeeCount * 6, `Expected at least ${benchmarkEmployeeCount * 6} payslip line records, got ${linesCount}`);
  });
});
