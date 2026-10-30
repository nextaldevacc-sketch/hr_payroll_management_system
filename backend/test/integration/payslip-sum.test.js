import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { PayrollService } from '../../src/services/payrollService.js';
import { generateWpsSif } from '../../src/lib/wps/sifGenerator.js';

const prisma = new PrismaClient();
const payrollService = new PayrollService(prisma);

describe('Payslip Lines Calculation & Sum Integrity Tests', () => {
  let octPayRuns = [];
  let payslipsWithLines = [];
  let company;

  before(async () => {
    company = await prisma.companies.findFirst({
      where: { name: 'Gulf Tech Logistics LLC' },
    });
    assert(company, 'Gulf Tech Logistics LLC must exist');

    octPayRuns = await prisma.pay_runs.findMany({
      where: {
        company_id: company.id,
        period_month: new Date('2026-10-01'),
      },
      include: {
        company_visa: true,
        payslips: {
          include: {
            employee: {
              include: { bank_accounts: true },
            },
            lines: {
              include: { salary_rule: true },
              orderBy: { salary_rule: { sequence: 'asc' } },
            },
          },
        },
      },
    });

    payslipsWithLines = octPayRuns.flatMap((r) => r.payslips);
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it('1. Confirms 41 active payslips exist for October 2026 pay runs (30 Visa 1 + 11 Visa 2)', () => {
    assert.equal(payslipsWithLines.length, 41, 'Expected exactly 41 active payslips');
  });

  it('2. Every payslip gross equals all earnings lines (BASIC + HRA + TRA + OTH + OT + allowances)', () => {
    for (const payslip of payslipsWithLines) {
      const earningLines = payslip.lines.filter((line) =>
        ['Basic', 'Allowance', 'Addition'].includes(line.salary_rule?.category) &&
        !['GROSS', 'NET'].includes(line.code)
      );

      const calculatedGross = earningLines.reduce(
        (sum, line) => sum + Number(line.amount),
        0
      );

      assert.equal(
        Number(payslip.gross).toFixed(2),
        calculatedGross.toFixed(2),
        `Payslip ID ${payslip.id} gross (${payslip.gross}) does not match sum of earning lines (${calculatedGross})`
      );
    }
  });

  it('3. Every payslip total_deductions equals the exact mathematical sum of its deduction lines', () => {
    for (const payslip of payslipsWithLines) {
      const deductionLines = payslip.lines.filter(
        (line) => line.salary_rule?.category === 'Deduction'
      );

      const calculatedDeductions = deductionLines.reduce(
        (sum, line) => sum + Number(line.amount),
        0
      );

      assert.equal(
        Number(payslip.total_deductions).toFixed(2),
        calculatedDeductions.toFixed(2),
        `Payslip ID ${payslip.id} total_deductions (${payslip.total_deductions}) does not match sum of deduction lines (${calculatedDeductions})`
      );
    }
  });

  it('4. Every payslip net equals gross minus total_deductions (Net = Earnings - Deductions)', () => {
    for (const payslip of payslipsWithLines) {
      const expectedNet = Number(payslip.gross) - Number(payslip.total_deductions);
      assert.equal(
        Number(payslip.net).toFixed(2),
        expectedNet.toFixed(2),
        `Payslip ID ${payslip.id} net (${payslip.net}) does not equal gross minus total_deductions (${expectedNet})`
      );
    }
  });

  it('4b. Reconciliation: for every payslip in seeded October run, net = (independently computed) contract gross + OT - deductions', () => {
    for (const payslip of payslipsWithLines) {
      // Contract package lines
      const contractLines = payslip.lines.filter((l) => ['BASIC', 'HRA', 'TRA', 'OTH'].includes(l.code));
      const contractGross = contractLines.reduce((s, l) => s + Number(l.amount), 0);

      // Overtime lines
      const otLines = payslip.lines.filter((l) => l.code.startsWith('OT_'));
      const otAmount = otLines.reduce((s, l) => s + Number(l.amount), 0);

      // Deductions
      const deductionLines = payslip.lines.filter((l) => l.salary_rule?.category === 'Deduction');
      const deductions = deductionLines.reduce((s, l) => s + Number(l.amount), 0);

      const independentlyComputedNet = contractGross + otAmount - deductions;

      assert.equal(
        Number(payslip.net).toFixed(2),
        independentlyComputedNet.toFixed(2),
        `Payslip for employee ${payslip.employee?.employee_code} failed independent reconciliation: net (${payslip.net}) != contract gross (${contractGross}) + OT (${otAmount}) - deductions (${deductions})`
      );
    }
  });

  it('5. Payslips sum to pay run totals for each visa (Sum of payslips = pay_run.total_gross & total_net via service)', async () => {
    for (const run of octPayRuns) {
      const runDetails = await payrollService.getPayRun(company.id, run.id);

      let sumGross = new Decimal(0);
      let sumDeductions = new Decimal(0);
      let sumNet = new Decimal(0);

      for (const ps of run.payslips) {
        sumGross = sumGross.plus(new Decimal(ps.gross));
        sumDeductions = sumDeductions.plus(new Decimal(ps.total_deductions));
        sumNet = sumNet.plus(new Decimal(ps.net));
      }

      assert.equal(
        sumGross.toFixed(2),
        runDetails.total_gross,
        `Run ${run.id} total_gross must equal sum of its payslips' gross`
      );
      assert.equal(
        sumDeductions.toFixed(2),
        runDetails.total_deductions,
        `Run ${run.id} total_deductions must equal sum of its payslips' deductions`
      );
      assert.equal(
        sumNet.toFixed(2),
        runDetails.total_net,
        `Run ${run.id} total_net must equal sum of its payslips' net`
      );
    }
  });

  it('6. SCR total in SIF exactly equals the pay run net for locked/paid pay runs', async () => {
    // Check paid September runs and October Visa 1
    const eligibleRuns = await prisma.pay_runs.findMany({
      where: {
        company_id: company.id,
        status: { in: ['Locked', 'Paid'] },
      },
      include: {
        company_visa: true,
        payslips: {
          include: {
            employee: { include: { bank_accounts: true } },
          },
        },
      },
    });

    assert.ok(eligibleRuns.length >= 2, 'Must have at least 2 locked/paid runs to verify SIF reconciliation');

    for (const run of eligibleRuns) {
      const runDetails = await payrollService.getPayRun(company.id, run.id);

      const sif = generateWpsSif({
        company: {
          trade_license_no: company.trade_license_no,
          bank_code: 'CB033',
        },
        companyVisa: {
          mol_establishment_id: run.company_visa.mol_establishment_id,
        },
        payRun: {
          id: run.id,
          period_month: run.period_month,
          status: 'Locked',
        },
        payslips: run.payslips,
      });

      assert.equal(
        sif.totalSalaries,
        runDetails.total_net,
        `SIF SCR TotalSalaries (${sif.totalSalaries}) must equal pay run net (${runDetails.total_net}) for ${run.company_visa.name}`
      );
      assert.equal(sif.totalRecords, run.payslips.length);
    }
  });

  it('7. Hand-calculated expected net verified for 3 named benchmark employees', () => {
    // -----------------------------------------------------------------------
    // Benchmark Employee 1: Rashid Al-Falasi (EMP-DXB-001) - UAE National
    // -----------------------------------------------------------------------
    // - Contract Gross: AED 25,000.00
    //     Basic: 25,000 * 0.60 = AED 15,000.00
    //     Housing: 25,000 * 0.30 = AED 7,500.00
    //     Transport: 25,000 * 0.05 = AED 1,250.00
    //     Other: 25,000 * 0.05 = AED 1,250.00
    // - Overtime:
    //     Hourly rate = 15,000 / 30 / 8 = 62.50 AED/hr
    //     Normal OT rate = 62.50 * 1.25 = 78.125 AED/hr
    //     Approved normal OT = 110 hrs * 78.125 = AED 8,593.75
    // - Deductions:
    //     Loan instalment = AED 500.00
    //     GPSSA Employee Share (11% on basic + housing = 22,500 * 0.11) = AED 2,475.00
    //     Total Deductions = 500.00 + 2,475.00 = AED 2,975.00
    // - Expected Net = 25,000.00 + 8,593.75 - 2,975.00 = AED 30,618.75
    const rashid = payslipsWithLines.find((p) => p.employee.employee_code === 'EMP-DXB-001');
    assert(rashid, 'Rashid Al-Falasi (EMP-DXB-001) payslip must exist');
    assert.equal(
      Number(rashid.net).toFixed(2),
      '30618.75',
      'Rashid Al-Falasi hand-calculated net must be exactly AED 30,618.75'
    );

    // -----------------------------------------------------------------------
    // Benchmark Employee 2: Alexander Wright (EMP-DXB-005) - British Expat
    // -----------------------------------------------------------------------
    // - Contract Gross: AED 16,000.00
    //     Basic: 16,000 * 0.60 = AED 9,600.00
    //     Housing: 16,000 * 0.30 = AED 4,800.00
    //     Transport: 16,000 * 0.05 = AED 800.00
    //     Other: 16,000 * 0.05 = AED 800.00
    // - Expat: GPSSA = AED 0.00
    // - Full 31 days attendance, no absences, no overtime, no loans/advances.
    // - Expected Net = Contract Gross - 0 = AED 16,000.00
    const alexander = payslipsWithLines.find((p) => p.employee.employee_code === 'EMP-DXB-005');
    assert(alexander, 'Alexander Wright (EMP-DXB-005) payslip must exist');
    assert.equal(
      Number(alexander.net).toFixed(2),
      '16000.00',
      'Alexander Wright hand-calculated net must be exactly AED 16,000.00'
    );

    // -----------------------------------------------------------------------
    // Benchmark Employee 3: Logistics Associate 31 (EMP-DXB-031) - DIFC Visa 2 Expat
    // -----------------------------------------------------------------------
    // - Contract Gross: AED 5,500.00
    //     Basic: 5,500 * 0.60 = AED 3,300.00
    //     Housing: 5,500 * 0.30 = AED 1,650.00
    //     Transport: 5,500 * 0.05 = AED 275.00
    //     Other: 5,500 * 0.05 = AED 275.00
    // - Expat under DIFC Freezone Visa 2
    // - Full 31 days attendance, no absences, no overtime, no loans/advances.
    // - Expected Net = Contract Gross - 0 = AED 5,500.00
    const associate31 = payslipsWithLines.find((p) => p.employee.employee_code === 'EMP-DXB-031');
    assert(associate31, 'Logistics Associate 31 (EMP-DXB-031) payslip must exist');
    assert.equal(
      Number(associate31.net).toFixed(2),
      '5500.00',
      'Logistics Associate 31 hand-calculated net must be exactly AED 5,500.00'
    );
  });
});
