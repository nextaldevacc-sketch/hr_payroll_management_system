import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUAEIban,
  maskIban,
  maskIdentityNumber,
  calculateDocumentStatus,
  getContractOn,
  checkActivationRequirements,
  ALLOWED_STATUS_TRANSITIONS,
  calculateOpeningLeaveAllocation,
} from '../src/utils/employeeUtils.js';

// =========================================================================
// 1. UAE IBAN Validation (Rule D)
// =========================================================================
test('UAE IBAN Validation: Valid IBAN passes mod-97 check', () => {
  // Valid 23-char UAE IBAN: AE64 0330 0000 0000 0001 234
  const validIban = 'AE640330000000000001234';
  const result = validateUAEIban(validIban);
  assert.strictEqual(result.valid, true);
  assert.ok(result.formatted);
});

test('UAE IBAN Validation: Valid IBAN with spaces and lowercase passes', () => {
  const formattedIban = 'ae64 0330 0000 0000 0001 234';
  const result = validateUAEIban(formattedIban);
  assert.strictEqual(result.valid, true);
});

test('UAE IBAN Validation: Rejects wrong country code', () => {
  const gbIban = 'GB82WEST12345698765432';
  const result = validateUAEIban(gbIban);
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /country code AE/i);
});

test('UAE IBAN Validation: Rejects incorrect length', () => {
  const shortIban = 'AE640330000000000012';
  const result = validateUAEIban(shortIban);
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /23 characters/i);
});

test('UAE IBAN Validation: Rejects bad checksum', () => {
  // Check digit altered from 64 to 65
  const badChecksum = 'AE650330000000000001234';
  const result = validateUAEIban(badChecksum);
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /MOD-97 verification failed/i);
});

test('UAE IBAN Validation: Rejects non-numeric characters in body', () => {
  const badChars = 'AE64033000000000000123X';
  const result = validateUAEIban(badChars);
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /only digits/i);
});

// =========================================================================
// 2. IBAN & Sensitive Identity Masking (Rule D & Rule E)
// =========================================================================
test('IBAN Masking: Masks in lists as AE** **** **** 1234', () => {
  const masked = maskIban('AE640330000000000001234');
  assert.strictEqual(masked, 'AE** **** **** 1234');
});

test('Identity Masking: Masks Emirates ID for non-HR viewers', () => {
  const masked = maskIdentityNumber('EMIRATES_ID', '784-1990-1234567-1');
  assert.strictEqual(masked, '784-****-*******-1');
});

test('Identity Masking: Masks Passport number for non-HR viewers', () => {
  const masked = maskIdentityNumber('PASSPORT', 'A1234567');
  assert.strictEqual(masked, 'A******7');
});

// =========================================================================
// 3. Document Status Calculation (Rule C)
// =========================================================================
test('Document Status: Returns Missing Data if number or expiry missing', () => {
  assert.strictEqual(calculateDocumentStatus({ doc_number: '', expiry_date: '2026-12-31' }), 'Missing Data');
  assert.strictEqual(calculateDocumentStatus({ doc_number: '12345', expiry_date: null }), 'Missing Data');
});

test('Document Status: Returns Expired for past dates', () => {
  const refDate = new Date('2026-10-28');
  const status = calculateDocumentStatus(
    { doc_number: 'P123', expiry_date: '2026-10-20' },
    90,
    refDate
  );
  assert.strictEqual(status, 'Expired');
});

test('Document Status: Returns Expiring Soon within threshold (<= 90 days)', () => {
  const refDate = new Date('2026-10-28');
  const status = calculateDocumentStatus(
    { doc_number: 'P123', expiry_date: '2026-11-20' }, // 23 days ahead
    90,
    refDate
  );
  assert.strictEqual(status, 'Expiring Soon');
});

test('Document Status: Returns Valid when well ahead of threshold (> 90 days)', () => {
  const refDate = new Date('2026-10-28');
  const status = calculateDocumentStatus(
    { doc_number: 'P123', expiry_date: '2027-06-30' },
    90,
    refDate
  );
  assert.strictEqual(status, 'Valid');
});

// =========================================================================
// 4. Contract Versioning & getContractOn (Rule B)
// =========================================================================
test('getContractOn: Resolves correct contract version on given date', () => {
  const contracts = [
    { id: 'c1', version_no: 1, effective_date: '2025-01-01', basic: 4000 },
    { id: 'c2', version_no: 2, effective_date: '2026-06-01', basic: 5000 },
    { id: 'c3', version_no: 3, effective_date: '2027-01-01', basic: 6000 },
  ];

  // Before raise in mid-2026
  const march2026 = getContractOn(contracts, '2026-03-15');
  assert.strictEqual(march2026?.id, 'c1');
  assert.strictEqual(march2026?.basic, 4000);

  // Exact effective date of Version 2
  const june2026 = getContractOn(contracts, '2026-06-01');
  assert.strictEqual(june2026?.id, 'c2');
  assert.strictEqual(june2026?.basic, 5000);

  // Later in 2026
  const oct2026 = getContractOn(contracts, '2026-10-28');
  assert.strictEqual(oct2026?.id, 'c2');
  assert.strictEqual(oct2026?.basic, 5000);

  // In 2027 under Version 3
  const feb2027 = getContractOn(contracts, '2027-02-01');
  assert.strictEqual(feb2027?.id, 'c3');
  assert.strictEqual(feb2027?.basic, 6000);

  // Prior to any contract
  const early2024 = getContractOn(contracts, '2024-01-01');
  assert.strictEqual(early2024, null);
});

// =========================================================================
// 5. Activation Requirements Check (Rule A)
// =========================================================================
test('checkActivationRequirements: Reports all missing items when incomplete', () => {
  const emptyEmployee = {
    contracts: [],
    bank_accounts: [],
    documents: [],
    mohre_person_id: null,
  };
  const result = checkActivationRequirements(emptyEmployee);
  assert.strictEqual(result.passes, false);
  assert.deepStrictEqual(result.missing.sort(), [
    'bank_account',
    'contract',
    'labour_card_or_person_id',
    'shift',
  ].sort());
});

test('checkActivationRequirements: Passes when contract, shift, bank, and person ID exist', () => {
  const validEmployee = {
    contracts: [{ id: 'c1', shift_id: 'shift-1' }],
    shift_id: 'shift-1',
    bank_accounts: [{ id: 'b1', iban: 'AE14033000000000001234', is_active: true }],
    mohre_person_id: '784199012345671',
    documents: [],
  };
  const result = checkActivationRequirements(validEmployee);
  assert.strictEqual(result.passes, true);
  assert.strictEqual(result.missing.length, 0);
});

// =========================================================================
// 6. Status Transitions (Rule A)
// =========================================================================
test('Status Transitions: Validates allowed transitions map', () => {
  assert.ok(ALLOWED_STATUS_TRANSITIONS['Pre-Joined'].includes('New Joined'));
  assert.ok(ALLOWED_STATUS_TRANSITIONS['Pre-Joined'].includes('Active'));
  assert.ok(ALLOWED_STATUS_TRANSITIONS['Active'].includes('Suspended'));
  assert.ok(ALLOWED_STATUS_TRANSITIONS['Active'].includes('Transferred'));
  assert.ok(ALLOWED_STATUS_TRANSITIONS['Active'].includes('Archived'));
  assert.strictEqual(ALLOWED_STATUS_TRANSITIONS['Archived'].length, 0); // Terminal state
});

// =========================================================================
// 7. Opening Leave Allocation on Activation (Part 2 Fix / Statutory Plan)
// =========================================================================
test('Opening Leave Allocation: New joiner (<6 months) gets 0 days', () => {
  // Joined 2 months ago
  const result = calculateOpeningLeaveAllocation({
    joiningDate: '2026-08-01',
    asOfDate: '2026-10-01',
    accrualPlan: { start_after_months: 6, days_per_month: 2, yearly_cap: 30 },
  });
  assert.strictEqual(result.days, 0);
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.serviceMonths, 2);
});

test('Opening Leave Allocation: At 7 months gets exactly 2 days (accrual starts after 6-month wait)', () => {
  // Joined 2026-01-01, asOfDate 2026-08-01 (exactly 7 completed months)
  const result = calculateOpeningLeaveAllocation({
    joiningDate: '2026-01-01',
    asOfDate: '2026-08-01',
    accrualPlan: { start_after_months: 6, days_per_month: 2, yearly_cap: 30 },
  });
  assert.strictEqual(result.days, 2);
  assert.strictEqual(result.total, 2);
  assert.strictEqual(result.serviceMonths, 7);
});

test('Opening Leave Allocation: Pro-rates for mid-month joiner between 6 and 12 months', () => {
  // Joined 2026-01-01, asOfDate 2026-08-16 (7 months and 15 days in August which has 31 days)
  const result = calculateOpeningLeaveAllocation({
    joiningDate: '2026-01-01',
    asOfDate: '2026-08-16',
    accrualPlan: { start_after_months: 6, days_per_month: 2, yearly_cap: 30 },
  });
  // 1 month after wait = 2 days, plus (15/31)*2 = ~0.97 days => ~2.97 days
  assert.ok(result.days > 2.0 && result.days < 3.0);
  assert.strictEqual(result.days, 2.97);
});

test('Opening Leave Allocation: After 1 year gets 30 days', () => {
  // Joined 2025-01-01, asOfDate 2026-01-01 (exactly 1 year / 12 months)
  const result = calculateOpeningLeaveAllocation({
    joiningDate: '2025-01-01',
    asOfDate: '2026-01-01',
    accrualPlan: { start_after_months: 6, days_per_month: 2, yearly_cap: 30, carry_over_max: 15 },
  });
  assert.strictEqual(result.days, 30);
  assert.strictEqual(result.total, 30);
  assert.strictEqual(result.serviceMonths, 12);
});

test('Opening Leave Allocation: Sara service length (3y 6m) gets 30 days base + 15 carry-over per plan', () => {
  // Sara service length: 3.5 years (3 years 6 months)
  const result = calculateOpeningLeaveAllocation({
    joiningDate: '2022-07-01',
    asOfDate: '2026-01-01',
    accrualPlan: { start_after_months: 6, days_per_month: 2, yearly_cap: 30, carry_over_max: 15 },
  });
  assert.strictEqual(result.days, 30);
  assert.strictEqual(result.carryOver, 15);
  assert.strictEqual(result.total, 45);
  assert.strictEqual(result.serviceYears, 3.5);
});

test('Opening Leave Allocation: Omar service length (7y) gets 30 days base + 15 carry-over per plan', () => {
  // Omar service length: 7 years
  const result = calculateOpeningLeaveAllocation({
    joiningDate: '2019-01-01',
    asOfDate: '2026-01-01',
    accrualPlan: { start_after_months: 6, days_per_month: 2, yearly_cap: 30, carry_over_max: 15 },
  });
  assert.strictEqual(result.days, 30);
  assert.strictEqual(result.carryOver, 15);
  assert.strictEqual(result.total, 45);
  assert.strictEqual(result.serviceYears, 7);
});
