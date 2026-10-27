import Decimal from 'decimal.js';

// Set default decimal precision and rounding to HALF_UP (standard financial rounding)
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Creates a Decimal instance safely from string, number, or Decimal
 * @param {string|number|Decimal} val
 * @returns {Decimal}
 */
export function toDecimal(val) {
  if (val === null || val === undefined || val === '') {
    return new Decimal(0);
  }
  return new Decimal(val);
}

/**
 * Rounds a Decimal to 2 decimal places using HALF_UP
 * @param {string|number|Decimal} val
 * @returns {Decimal}
 */
export function roundToCurrency(val) {
  return toDecimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Formats a monetary value to AED string with two decimal places
 * e.g. 7044.8 -> "AED 7,044.80"
 * @param {string|number|Decimal} amount
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'AED', locale = 'en') {
  const dec = toDecimal(amount);
  const rounded = dec.toFixed(2);
  const parts = rounded.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = parts.join('.');
  if (locale === 'ar') {
    return `${formatted} د.إ`;
  }
  return `${currency} ${formatted}`;
}

/**
 * Calculates UAE standard hourly wage for overtime
 * Formula: basic / 30 / 8
 * Returns unrounded Decimal so intermediate precision is preserved
 * @param {string|number|Decimal} basicSalary
 * @returns {Decimal}
 */
export function calculateHourlyRate(basicSalary) {
  return toDecimal(basicSalary).dividedBy(30).dividedBy(8);
}

/**
 * Calculates normal overtime: (basic / 30 / 8) * 1.25 * hours
 * @param {string|number|Decimal} basicSalary
 * @param {number} hours
 * @returns {Decimal}
 */
export function calculateNormalOvertime(basicSalary, hours) {
  const rate = calculateHourlyRate(basicSalary);
  return rate.times(1.25).times(hours);
}

/**
 * Calculates night or rest day overtime: (basic / 30 / 8) * 1.5 * hours
 * @param {string|number|Decimal} basicSalary
 * @param {number} hours
 * @returns {Decimal}
 */
export function calculateSpecialOvertime(basicSalary, hours) {
  const rate = calculateHourlyRate(basicSalary);
  return rate.times(1.5).times(hours);
}

/**
 * Calculates unapproved absence deduction
 * Formula: gross / 30 * days (default UAE 30-day divisor)
 * @param {string|number|Decimal} grossSalary
 * @param {number} absentDays
 * @param {number} divisor
 * @returns {Decimal}
 */
export function calculateAbsenceDeduction(grossSalary, absentDays, divisor = 30) {
  return toDecimal(grossSalary).dividedBy(divisor).times(absentDays);
}

/**
 * Calculates UAE end-of-service gratuity
 * Section 8.2:
 * Daily wage = basic * 12 / 365
 * First 5 years: 21 days' wage per year
 * After 5 years: 30 days' wage per year
 * Cap: 2 years' total wage (24 * basic)
 * @param {string|number|Decimal} basicSalary
 * @param {number} serviceYears (decimal, e.g. 3.5 or 7)
 * @param {string|number|Decimal} totalWage (optional for cap, default basic)
 * @returns {Decimal}
 */
export function calculateGratuity(basicSalary, serviceYears, totalWage = null) {
  const years = toDecimal(serviceYears);
  if (years.lessThan(1)) {
    return new Decimal(0);
  }

  const basic = toDecimal(basicSalary);
  const dailyWage = basic.times(12).dividedBy(365);

  let totalDays = new Decimal(0);
  if (years.lessThanOrEqualTo(5)) {
    totalDays = years.times(21);
  } else {
    const first5Days = new Decimal(5).times(21); // 105 days
    const remainingYears = years.minus(5);
    const remainingDays = remainingYears.times(30);
    totalDays = first5Days.plus(remainingDays);
  }

  const rawGratuity = dailyWage.times(totalDays);

  // Maximum cap: 2 years' total wage (24 * totalWage or basic)
  const capWage = totalWage ? toDecimal(totalWage) : basic;
  const maxCap = capWage.times(24);

  if (rawGratuity.greaterThan(maxCap)) {
    return maxCap.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  return rawGratuity.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export { Decimal };
