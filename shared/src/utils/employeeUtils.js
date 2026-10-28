/**
 * Employee Management & Verification Utilities (Phase 4)
 * Spec Sections 6, 7.2, 10 FR-EM*, Appendix A.5
 */

export const EMPLOYEE_STATUSES = {
  PRE_JOINED: 'Pre-Joined',
  NEW_JOINED: 'New Joined',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  TRANSFERRED: 'Transferred',
  ARCHIVED: 'Archived',
};

/**
 * Explicit allowed status transitions map (Rule A)
 * Any transition not defined here MUST be rejected with HTTP 400.
 */
export const ALLOWED_STATUS_TRANSITIONS = {
  'Pre-Joined': ['New Joined', 'Active', 'Archived'],
  'New Joined': ['Active', 'Suspended', 'Archived'],
  'Active': ['Suspended', 'Transferred', 'Archived'],
  'Suspended': ['Active', 'Archived'],
  'Transferred': ['Archived'],
  'Archived': [],
};

/**
 * Validates UAE IBAN (Rule D)
 * Format: 'AE' followed by 21 digits (total 23 alphanumeric characters)
 * Checksum: ISO 7064 MOD-97-10 check
 *
 * @param {string} iban
 * @returns {{ valid: boolean, error?: string, formatted?: string }}
 */
export function validateUAEIban(iban) {
  if (!iban || typeof iban !== 'string') {
    return { valid: false, error: 'IBAN is required' };
  }

  const clean = iban.replace(/[\s-]/g, '').toUpperCase();

  // 1. Country code check
  if (!clean.startsWith('AE')) {
    return { valid: false, error: 'UAE IBAN must start with country code AE' };
  }

  // 2. Length check (UAE IBAN is exactly 23 characters)
  if (clean.length !== 23) {
    return { valid: false, error: `UAE IBAN must be exactly 23 characters (got ${clean.length})` };
  }

  // 3. Digit check (all characters after AE must be digits)
  const rest = clean.slice(2);
  if (!/^\d{21}$/.test(rest)) {
    return { valid: false, error: 'UAE IBAN must contain only digits after country code AE' };
  }

  // 4. ISO 7064 MOD-97-10 checksum validation
  // Move first 4 characters (AE + 2 check digits) to the end
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Convert letters to numbers: A = 10, E = 14
  // 'AE' becomes '1014'
  const numericString = rearranged.replace(/A/g, '10').replace(/E/g, '14');

  try {
    const remainder = BigInt(numericString) % 97n;
    if (remainder !== 1n) {
      return { valid: false, error: 'Invalid IBAN checksum (MOD-97 verification failed)' };
    }
  } catch (err) {
    return { valid: false, error: 'Failed to compute IBAN checksum' };
  }

  // Format as standard 4-character blocks: AE00 0000 0000 0000 0000 000
  const formatted = clean.replace(/(.{4})/g, '$1 ').trim();

  return { valid: true, formatted };
}

/**
 * Masks an IBAN for list displays (Rule D)
 * Example: 'AE14033000000000001234' -> 'AE** **** **** 1234'
 *
 * @param {string} iban
 * @returns {string}
 */
export function maskIban(iban) {
  if (!iban) return '—';
  const clean = iban.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length < 6) return 'AE** **** ****';
  const last4 = clean.slice(-4);
  return `AE** **** **** ${last4}`;
}

/**
 * Masks sensitive identity numbers (Passport, Emirates ID) for non-HR viewers (Rule E)
 *
 * @param {string} type - 'EMIRATES_ID' | 'PASSPORT' | string
 * @param {string} value
 * @returns {string}
 */
export function maskIdentityNumber(type, value) {
  if (!value) return '—';
  const clean = String(value).trim();
  const normalizedType = String(type || '').toUpperCase();

  if (normalizedType.includes('EMIRATES') || normalizedType === 'EID') {
    // Emirates ID format: 784-YYYY-XXXXXXX-Z -> 784-****-*******-Z
    const digitsOnly = clean.replace(/\D/g, '');
    if (digitsOnly.length === 15) {
      const last = digitsOnly.slice(-1);
      return `784-****-*******-${last}`;
    }
    return '784-****-*******-*';
  }

  if (normalizedType.includes('PASSPORT')) {
    // Passport format: A1234567 -> A******7
    if (clean.length <= 3) return '***';
    const first = clean[0];
    const last = clean[clean.length - 1];
    const stars = '*'.repeat(Math.max(4, clean.length - 2));
    return `${first}${stars}${last}`;
  }

  // Fallback generic masking
  if (clean.length <= 4) return '****';
  return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
}

/**
 * Calculates document validity status (Rule C)
 * Statuses: 'Missing Data', 'Expired', 'Expiring Soon' (<= alertDays), 'Valid'
 *
 * @param {Object} doc - Document object with doc_number, expiry_date
 * @param {number} [alertDays=90] - Warning threshold (default 90 days)
 * @param {Date|string} [referenceDate=new Date()]
 * @returns {'Missing Data' | 'Expired' | 'Expiring Soon' | 'Valid'}
 */
export function calculateDocumentStatus(doc, alertDays = 90, referenceDate = new Date()) {
  if (!doc || !doc.doc_number || !doc.expiry_date) {
    return 'Missing Data';
  }

  const expiry = new Date(doc.expiry_date);
  if (isNaN(expiry.getTime())) {
    return 'Missing Data';
  }

  const ref = new Date(referenceDate);
  // Compare at midnight UTC/local
  const expDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()).getTime();
  const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();

  const diffDays = Math.round((expDay - refDay) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Expired';
  }
  if (diffDays <= alertDays) {
    return 'Expiring Soon';
  }
  return 'Valid';
}

/**
 * Resolves the active contract version on a specific calendar date (Rule B)
 * Used by payroll engine and contract history viewer.
 *
 * @param {Array<Object>} contracts - List of contract records
 * @param {Date|string} date - Target calculation date
 * @returns {Object|null} The applicable contract version
 */
export function getContractOn(contracts = [], date = new Date()) {
  if (!Array.isArray(contracts) || contracts.length === 0) {
    return null;
  }

  const target = new Date(date);
  if (isNaN(target.getTime())) {
    throw new Error(`Invalid target date for getContractOn: ${date}`);
  }

  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

  // Filter to contracts whose effective_date is on or before target date
  const effectiveContracts = contracts.filter((c) => {
    if (!c.effective_date) return false;
    const eff = new Date(c.effective_date);
    const effDay = new Date(eff.getFullYear(), eff.getMonth(), eff.getDate()).getTime();
    return effDay <= targetDay;
  });

  if (effectiveContracts.length === 0) {
    // If all contracts are in the future, return the earliest one as fallback or null
    return null;
  }

  // Sort descending by effective_date, then descending by version_no
  effectiveContracts.sort((a, b) => {
    const diff = new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime();
    if (diff !== 0) return diff;
    return (b.version_no || 1) - (a.version_no || 1);
  });

  return effectiveContracts[0];
}

/**
 * Checks all 4 mandatory activation requirements (Rule A & Spec 7.2)
 *
 * @param {Object} employee - Employee object with contracts, bank_accounts, documents, etc.
 * @returns {{ passes: boolean, missing: string[] }}
 */
export function checkActivationRequirements(employee) {
  const missing = [];

  // 1. Contract check (at least one approved or valid contract)
  const hasContract = Array.isArray(employee.contracts) && employee.contracts.length > 0;
  if (!hasContract) {
    missing.push('contract');
  }

  // 2. Shift check (assigned on contract or employee)
  const hasShift =
    Boolean(employee.shift_id) ||
    Boolean(employee.shift) ||
    (Array.isArray(employee.contracts) && employee.contracts.some((c) => c.shift_id || c.shift));
  if (!hasShift) {
    missing.push('shift');
  }

  // 3. Bank account check (at least one active bank account with IBAN)
  const hasBankAccount =
    Array.isArray(employee.bank_accounts) &&
    employee.bank_accounts.some((b) => b.is_active !== false && b.iban);
  if (!hasBankAccount) {
    missing.push('bank_account');
  }

  // 4. Labour card or person ID check
  const hasMohrePersonId = Boolean(employee.mohre_person_id && employee.mohre_person_id.trim());
  const hasLabourCardDoc =
    Array.isArray(employee.documents) &&
    employee.documents.some((d) => {
      const type = (d.doc_type || '').toLowerCase();
      return (type.includes('labour') || type.includes('labor') || type.includes('person_id')) && d.doc_number;
    });

  if (!hasMohrePersonId && !hasLabourCardDoc) {
    missing.push('labour_card_or_person_id');
  }

  return {
    passes: missing.length === 0,
    missing,
  };
}

/**
 * Calculates opening leave allocation upon employee activation (UAE Labour Law & Accrual Plan)
 * Spec Section 7.2, Part 2 Fix:
 * - 0 days during waiting period (first 6 months)
 * - 2 days per completed month after waiting period (months 6 to 11)
 * - Pro-rated for mid-month joiners
 * - 30 days per year after 1 year of service
 * - Carry-over per accrual plan (capped by carry_over_max)
 *
 * @param {Object} options
 * @param {Date|string} options.joiningDate - Employee joining date
 * @param {Date|string} [options.asOfDate=new Date()] - Calculation date (activation date)
 * @param {Object} [options.accrualPlan={}] - Company accrual plan settings
 * @returns {{ days: number, carryOver: number, total: number, serviceMonths: number, serviceYears: number }}
 */
export function calculateOpeningLeaveAllocation({ joiningDate, asOfDate = new Date(), accrualPlan = {} }) {
  if (!joiningDate) {
    return { days: 0, carryOver: 0, total: 0, serviceMonths: 0, serviceYears: 0 };
  }

  const start = new Date(joiningDate);
  const current = new Date(asOfDate);
  if (isNaN(start.getTime()) || isNaN(current.getTime()) || current < start) {
    return { days: 0, carryOver: 0, total: 0, serviceMonths: 0, serviceYears: 0 };
  }

  const waitMonths = accrualPlan.start_after_months !== undefined ? accrualPlan.start_after_months : 6;
  const ratePerMonth = accrualPlan.days_per_month !== undefined ? Number(accrualPlan.days_per_month) : 2.0;
  const yearlyCap = accrualPlan.yearly_cap !== undefined ? Number(accrualPlan.yearly_cap) : 30.0;
  const carryOverMax = accrualPlan.carry_over_max !== undefined ? Number(accrualPlan.carry_over_max) : 15.0;

  // Calculate elapsed calendar difference
  let years = current.getFullYear() - start.getFullYear();
  let months = current.getMonth() - start.getMonth();
  let days = current.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // Number of days in previous month
    const prevMonthDays = new Date(current.getFullYear(), current.getMonth(), 0).getDate();
    days += prevMonthDays;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalCompletedMonths = years * 12 + months;
  const daysInCurrentMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
  const monthFraction = days / daysInCurrentMonth;
  const totalMonthsDecimal = totalCompletedMonths + monthFraction;
  const serviceYearsDecimal = totalMonthsDecimal / 12;

  // 1. During waiting period (< 6 months)
  if (totalCompletedMonths < waitMonths) {
    return {
      days: 0,
      carryOver: 0,
      total: 0,
      serviceMonths: totalCompletedMonths,
      serviceYears: Math.round(serviceYearsDecimal * 100) / 100,
    };
  }

  // 2. Between 6 months and 1 year (waitMonths to 11 months):
  // 2 days per completed month after 6-month wait period + pro-rata partial month
  if (totalCompletedMonths < 12) {
    const completedMonthsAfterWait = totalCompletedMonths - waitMonths;
    const partialMonthDays = monthFraction * ratePerMonth;
    const accruedDays = completedMonthsAfterWait * ratePerMonth + partialMonthDays;
    const roundedDays = Math.round(accruedDays * 100) / 100;

    return {
      days: roundedDays,
      carryOver: 0,
      total: roundedDays,
      serviceMonths: totalCompletedMonths,
      serviceYears: Math.round(serviceYearsDecimal * 100) / 100,
    };
  }

  // 3. After 1 year of service (>= 12 months): 30 days yearly allocation
  const baseAllocation = yearlyCap; // 30 days
  // Carry-over per plan if multi-year service
  const carryOver = years > 1 ? carryOverMax : 0;
  const total = baseAllocation + carryOver;

  return {
    days: baseAllocation,
    carryOver,
    total,
    serviceMonths: totalCompletedMonths,
    serviceYears: Math.round(serviceYearsDecimal * 100) / 100,
  };
}
