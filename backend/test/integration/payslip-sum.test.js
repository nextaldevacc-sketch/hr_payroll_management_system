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
          ['Basic', 'Allowance', 'Addition'].includes(line.salary_rule?.category) &&
          line.code !== 'GROSS' &&
          line.code !== 'NET'
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
