/**
 * Status definitions for Nextal HR & Payroll Platform
 */

export const PAY_RUN_STATUS = {
  DRAFT: 'Draft',
  CALCULATED: 'Calculated',
  VALIDATED: 'Validated',
  LOCKED: 'Locked',
  PAID: 'Paid'
};

export const PAY_RUN_STATUS_FLOW = [
  PAY_RUN_STATUS.DRAFT,
  PAY_RUN_STATUS.CALCULATED,
  PAY_RUN_STATUS.VALIDATED,
  PAY_RUN_STATUS.LOCKED,
  PAY_RUN_STATUS.PAID
];

export const EMPLOYEE_STATUS = {
  PRE_JOINED: 'Pre-Joined',
  NEW_JOINED: 'New Joined',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  TRANSFERRED: 'Transferred',
  ARCHIVED: 'Archived'
};

export const DOCUMENT_EXPIRY_STATUS = {
  VALID: 'Valid',
  EXPIRING_SOON: 'Expiring Soon', // within 90/60/30 days
  EXPIRED: 'Expired',
  MISSING_DATA: 'Missing Data'
};

export const APPROVAL_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

export const DEFAULT_EMPLOYEE_CODE_PREFIX = 'EMP-DXB';
