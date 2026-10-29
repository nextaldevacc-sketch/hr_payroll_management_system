import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Payslip Lines Calculation & Sum Integrity Tests', () => {
  let payslipsWithLines = [];

  before(async () => {
    payslipsWithLines = await prisma.payslips.findMany({
      where: {
        pay_run: {
          period_month: new Date('2026-10-01'),
          company: { name: 'Gulf Tech Logistics LLC' },
        },
      },
      include: {
        lines: {
          include: {
            salary_rule: true,
          },
        },
      },
    });
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it('1. Confirms 41 active payslips exist for October 2026 pay runs (30 Visa 1 + 11 Visa 2)', () => {
    assert.equal(payslipsWithLines.length, 41, 'Expected exactly 41 active payslips');
  });

  it('2. Every payslip gross equals contractual package lines (BASIC + HRA + TRA + OTH)', () => {
    for (const payslip of payslipsWithLines) {
      const packageLines = payslip.lines.filter(
        (line) => ['BASIC', 'HRA', 'TRA', 'OTH'].includes(line.code)
      );

      const calculatedGross = packageLines.reduce(
        (sum, line) => sum + Number(line.amount),
        0
      );

      assert.equal(
        Number(payslip.gross).toFixed(2),
        calculatedGross.toFixed(2),
        `Payslip ID ${payslip.id} gross (${payslip.gross}) does not match sum of contractual package lines (${calculatedGross})`
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

  it('4. Every payslip net equals gross plus additions/overtime minus total_deductions', () => {
    for (const payslip of payslipsWithLines) {
      const additionLines = payslip.lines.filter(
        (line) =>
          ['Addition', 'Allowance'].includes(line.salary_rule?.category) &&
          !['BASIC', 'HRA', 'TRA', 'OTH', 'GROSS', 'NET'].includes(line.code)
      );
      const totalAdditions = additionLines.reduce((sum, line) => sum + Number(line.amount), 0);
      const expectedNet = Number(payslip.gross) + totalAdditions - Number(payslip.total_deductions);
      assert.equal(
        Number(payslip.net).toFixed(2),
        expectedNet.toFixed(2),
        `Payslip ID ${payslip.id} net (${payslip.net}) does not equal gross + additions - total_deductions (${expectedNet})`
      );
    }
  });

  it('5. Overall pay run net disbursement sum equals 199,217.75 AED (Real engine sum across both visas)', () => {
    const totalNet = payslipsWithLines.reduce(
      (sum, p) => sum + Number(p.net),
      0
    );
    assert.equal(
      totalNet.toFixed(2),
      '199217.75',
      `Overall Net pay sum (${totalNet.toFixed(2)}) must equal 199217.75 AED (160,217.75 Visa 1 + 39,000.00 Visa 2)`
    );
  });

  it('6. Every payslip stores its full lines: at least BASIC, HRA, TRA, OTH, GROSS, and NET', () => {
    const requiredCodes = ['BASIC', 'HRA', 'TRA', 'OTH', 'GROSS', 'NET'];
    const lineCounts = [];

    for (const payslip of payslipsWithLines) {
      const codes = payslip.lines.map((l) => l.code);
      for (const reqCode of requiredCodes) {
        assert.ok(
          codes.includes(reqCode),
          `Payslip ID ${payslip.id} must include line code '${reqCode}'`
        );
      }

      // Confirm GROSS line amount matches payslip.gross
      const grossLine = payslip.lines.find((l) => l.code === 'GROSS');
      assert.equal(
        Number(grossLine.amount).toFixed(2),
        Number(payslip.gross).toFixed(2),
        `GROSS line amount (${grossLine.amount}) must equal payslip gross (${payslip.gross})`
      );

      // Confirm NET line amount matches payslip.net
      const netLine = payslip.lines.find((l) => l.code === 'NET');
      assert.equal(
        Number(netLine.amount).toFixed(2),
        Number(payslip.net).toFixed(2),
        `NET line amount (${netLine.amount}) must equal payslip net (${payslip.net})`
      );

      lineCounts.push(payslip.lines.length);
    }

    const min = Math.min(...lineCounts);
    const max = Math.max(...lineCounts);
    const avg = (lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length).toFixed(2);

    assert.ok(min >= 6, `Minimum lines per payslip (${min}) must be at least 6`);
    assert.ok(max >= min, `Max lines per payslip (${max}) must be >= min`);
  });
});
