import test from 'node:test';
import assert from 'node:assert';
import {
  calculateNormalOvertime,
  calculateAbsenceDeduction,
  calculateGratuity,
  formatCurrency,
  toDecimal,
  roundToCurrency
} from '../src/utils/money.js';

test('Ahmed month calculation nets AED 7,044.80', () => {
  const basic = 5000;
  const gross = 8000;

  // 1. 3 hours overtime on normal day: 20.8333... * 1.25 * 3 = 78.125 -> rounds to 78.13
  const ot = roundToCurrency(calculateNormalOvertime(basic, 3));
  assert.strictEqual(ot.toFixed(2), '78.13');

  // 2. 2 days absence (gross / 30 * 2) = 533.333... -> rounds to 533.33
  const abs = roundToCurrency(calculateAbsenceDeduction(gross, 2, 30));
  assert.strictEqual(abs.toFixed(2), '533.33');

  // 3. Loan deduction = 500.00
  const loan = roundToCurrency(500);

  // Net = 8000 + 78.13 - 533.33 - 500 = 7044.80
  const net = toDecimal(gross).plus(ot).minus(abs).minus(loan);
  assert.strictEqual(net.toFixed(2), '7044.80');
  assert.strictEqual(formatCurrency(net), 'AED 7,044.80');
});

test('Sara gratuity is AED 12,082.19', () => {
  // Sara: basic 5000, 3 years 6 months (3.5 years)
  // Daily wage = 5000 * 12 / 365 = 164.38356...
  // Days of wage = 21 * 3.5 = 73.5
  // Gratuity = 12082.19
  const gratuity = calculateGratuity(5000, 3.5);
  assert.strictEqual(gratuity.toFixed(2), '12082.19');
  assert.strictEqual(formatCurrency(gratuity), 'AED 12,082.19');
});

test('Omar gratuity is AED 32,547.95', () => {
  // Omar: basic 6000, 7 years
  // Daily wage = 6000 * 12 / 365 = 197.26027...
  // Days of wage = 21 * 5 + 30 * 2 = 165
  // Gratuity = 32547.95
  const gratuity = calculateGratuity(6000, 7);
  assert.strictEqual(gratuity.toFixed(2), '32547.95');
  assert.strictEqual(formatCurrency(gratuity), 'AED 32,547.95');
});
