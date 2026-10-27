import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Payslip Lines Calculation & Sum Integrity Tests', () => {
  let payslipsWithLines = [];

  before(async () => {
    payslipsWithLines = await prisma.payslips.findMany({
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

  it('1. Confirms 42 payslips exist for October 2026 pay run', () => {
    assert.equal(payslipsWithLines.length, 42, 'Expected exactly 42 payslips');
  });

  it('2. Every payslip gross equals the exact mathematical sum of its earning lines', () => {
    for (const payslip of payslipsWithLines) {
      const earningLines = payslip.lines.filter(
        (line) =>
          line.salary_rule?.category !== 'Deduction' &&
          line.salary_rule?.category !== 'CompanyContribution'
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

  it('4. Every payslip net equals gross minus total_deductions', () => {
    for (const payslip of payslipsWithLines) {
      const expectedNet = Number(payslip.gross) - Number(payslip.total_deductions);
      assert.equal(
        Number(payslip.net).toFixed(2),
        expectedNet.toFixed(2),
        `Payslip ID ${payslip.id} net (${payslip.net}) does not equal gross - total_deductions (${expectedNet})`
      );
    }
  });

  it('5. Overall pay run net disbursement sum equals 335,490.50 AED (Dashboard Net to WPS parity)', () => {
    const totalNet = payslipsWithLines.reduce(
      (sum, p) => sum + Number(p.net),
      0
    );
    assert.equal(
      totalNet.toFixed(2),
      '335490.50',
      `Overall Net pay sum (${totalNet.toFixed(2)}) must equal 335490.50 AED`
    );
  });
});
