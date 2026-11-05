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
  if (amount === null || amount === undefined || amount === '' || Number(amount) === 0 || Object.is(Number(amount), -0)) {
    return locale === 'ar' ? '0.00 د.إ' : `${currency} 0.00`;
  }
  let dec = toDecimal(amount);
  if (dec.isZero()) {
    return locale === 'ar' ? '0.00 د.إ' : `${currency} 0.00`;
  }
  let rounded = dec.toFixed(2);
  if (rounded === '-0.00' || rounded === '0.00' || rounded === '-0.0') {
    return locale === 'ar' ? '0.00 د.إ' : `${currency} 0.00`;
  }
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

/**
 * Calculates UAE leave encashment at termination
 * Formula: basicSalary * 12 / 365 * unusedDays (UAE Labour Law Article 29)
 * @param {string|number|Decimal} basicSalary
 * @param {number|Decimal} unusedDays
 * @returns {Decimal}
 */
export function calculateLeaveEncashment(basicSalary, unusedDays) {
  const basic = toDecimal(basicSalary);
  const days = toDecimal(unusedDays);
  if (days.lessThanOrEqualTo(0) || basic.lessThanOrEqualTo(0)) {
    return new Decimal(0);
  }
  const dailyRate = basic.times(12).dividedBy(365);
  return dailyRate.times(days).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Calculates UAE Pension Contributions (GPSSA / ADPF)
 * - Minimum contribution salary: AED 3,000 (below-minimum raised to 3,000)
 * - Maximum contribution salary: AED 70,000 (above-cap limited to 70,000)
 * - Employee rate: 11% (registered on or after 2 Oct 2023, default) or 5% (legacy, registered before 2 Oct 2023)
 * - Employer rate: 15% total, with 2.5% government share if contribution salary < AED 20,000
 *   (employer cost 12.5%, gov share 2.5%). If >= 20,000, employer cost is full 15% (gov share 0%).
 * 
 * @param {Object} params
 * @param {string|number|Decimal} params.basic
 * @param {string|number|Decimal} [params.pensionableAllowances=0]
 * @param {string|Date} [params.registrationDate]
 * @param {boolean} [params.isLegacy]
 * @param {string} [params.scheme='GPSSA']
 * @param {Object} [params.rates]
 * @returns {Object}
 */
export function calculatePensionContribution({
  basic,
  pensionableAllowances = 0,
  registrationDate = null,
  isLegacy = undefined,
  scheme = 'GPSSA',
  rates = {},
}) {
  const basicDec = toDecimal(basic);
  const allowDec = toDecimal(pensionableAllowances);
  const rawSalary = basicDec.plus(allowDec);

  const minSalary = toDecimal(rates.minSalary ?? 3000);
  const maxSalary = toDecimal(rates.maxSalary ?? 70000);

  // Clamp salary to [minSalary, maxSalary]
  let contributionSalary = rawSalary;
  if (contributionSalary.lessThan(minSalary)) {
    contributionSalary = minSalary;
  } else if (contributionSalary.greaterThan(maxSalary)) {
    contributionSalary = maxSalary;
  }

  // Determine legacy status:
  // If registered before 2023-10-02 -> legacy (5%)
  // If registered on or after 2023-10-02 -> new scheme (11%)
  let isLegacyScheme = false;
  if (typeof isLegacy === 'boolean') {
    isLegacyScheme = isLegacy;
  } else if (registrationDate) {
    const reg = new Date(registrationDate);
    const cutoff = new Date('2023-10-02');
    isLegacyScheme = reg < cutoff;
  }

  // Employee rate
  let employeeRate;
  if (rates.employeeRate !== undefined) {
    employeeRate = toDecimal(rates.employeeRate);
  } else if (isLegacyScheme) {
    employeeRate = toDecimal(rates.employeeRateLegacy ?? 5);
  } else {
    employeeRate = toDecimal(rates.employeeRateNew ?? 11);
  }

  // Employer rate: 15% standard
  const totalEmployerRate = toDecimal(rates.employerRate ?? 15);

  // Government share: applied if contribution salary < 20,000 AED
  const govShareThreshold = toDecimal(rates.govShareThreshold ?? 20000);
  let govShareRate = new Decimal(0);
  let employerCostRate = totalEmployerRate;

  if (contributionSalary.lessThan(govShareThreshold)) {
    govShareRate = toDecimal(rates.govShareRate ?? 2.5);
    employerCostRate = totalEmployerRate.minus(govShareRate);
  }

  const employeeShare = contributionSalary.times(employeeRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const employerCost = contributionSalary.times(employerCostRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const govShare = contributionSalary.times(govShareRate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const totalEmployerContribution = employerCost.plus(govShare);
  const totalContribution = employeeShare.plus(totalEmployerContribution);

  return {
    scheme,
    isLegacy: isLegacyScheme,
    contributionSalary: contributionSalary.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    rawSalary: rawSalary.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    employeeRate: employeeRate.toNumber(),
    employeeShare,
    totalEmployerRate: totalEmployerRate.toNumber(),
    employerCostRate: employerCostRate.toNumber(),
    employerCost,
    govShareRate: govShareRate.toNumber(),
    govShare,
    totalEmployerContribution,
    totalContribution,
  };
}

export { Decimal };
