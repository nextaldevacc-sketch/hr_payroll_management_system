/**
 * Section 5.3 Unified Permissions Matrix & Access Control
 * Shared between backend RBAC middleware and frontend navigation/route guards.
 */

export const PERMISSIONS_MATRIX = {
  EMPLOYEE: {
    dashboard: [],
    profile_self: ['view'],
    employees: [],
    documents: ['upload_own'],
    salary: [],
    attendance: ['own'],
    overtime: ['request'],
    leave: ['apply'],
    salary_adjustments: [],
    pay_runs: [],
    clearance: [],
    final_settlement: [],
    settings: [],
    audit: [],
  },
  DEPT_MANAGER: {
    dashboard: ['view_team', 'view'],
    profile_self: ['view'],
    employees: ['view_team'],
    documents: [],
    salary: [],
    attendance: ['confirm_team', 'view_team'],
    overtime: ['approve_team', 'view_team'],
    leave: ['approve_1st', 'view_team'],
    salary_adjustments: [],
    pay_runs: [],
    clearance: ['clear_own'],
    final_settlement: [],
    settings: [],
    audit: [],
  },
  HR_OFFICER: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['create', 'edit', 'view'],
    documents: ['edit', 'view'],
    salary: [],
    attendance: ['edit', 'confirm', 'view'],
    overtime: ['view'],
    leave: ['approve_2nd', 'view'],
    salary_adjustments: [],
    pay_runs: ['view'],
    clearance: ['prepare', 'clear', 'view'],
    final_settlement: ['prepare'],
    settings: [],
    audit: [],
  },
  PAYROLL_OFFICER: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['view'],
    documents: [],
    salary: ['edit', 'view'],
    attendance: ['view'],
    overtime: ['view'],
    leave: ['view'],
    salary_adjustments: ['prepare', 'view'],
    pay_runs: ['prepare', 'view'],
    clearance: ['view'],
    final_settlement: ['calculate', 'view'],
    settings: ['edit_rules', 'view'],
    audit: [],
  },
  HR_MANAGER: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['create', 'edit', 'verify', 'view'],
    documents: ['edit', 'verify', 'view'],
    salary: ['approve', 'view'],
    attendance: ['edit', 'view'],
    overtime: ['approve', 'view'],
    leave: ['approve', 'view'],
    salary_adjustments: ['approve', 'view'],
    pay_runs: ['validate', 'view'],
    clearance: ['approve', 'view'],
    final_settlement: ['validate', 'view'],
    settings: ['edit_all', 'view'],
    audit: ['view'],
  },
  GM: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['view'],
    documents: ['view'],
    salary: ['view'],
    attendance: ['view'],
    overtime: [],
    leave: ['final_flagged', 'approve', 'view'],
    salary_adjustments: ['view'],
    pay_runs: ['approve', 'view'],
    clearance: [],
    final_settlement: ['approve', 'view'],
    settings: [],
    audit: ['view'],
  },
  FINANCE: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: [],
    documents: [],
    salary: ['view'],
    attendance: [],
    overtime: [],
    leave: [],
    salary_adjustments: ['view'],
    pay_runs: ['pay', 'view'],
    clearance: ['clear_own'],
    final_settlement: ['pay', 'view'],
    settings: ['accounts_only', 'view'],
    audit: [],
  },
  COMPANY_ADMIN: {
    dashboard: ['view'],
    profile_self: ['view'],
    employees: ['view'],
    documents: [],
    salary: [], // Company Admin does NOT see salary figures unless holding one of the 4 statutory salary roles
    attendance: [],
    overtime: [],
    leave: [],
    salary_adjustments: [],
    pay_runs: [],
    clearance: [],
    final_settlement: [],
    settings: ['all', 'edit_all', 'edit_rules', 'accounts_only', 'view'],
    audit: ['view'],
  },
};

/**
 * Roles allowed to view compensation figures and financial wage aggregates
 */
export const SALARY_ROLES = ['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'];

/**
 * Check whether a list of role codes has access to a given area and action
 * @param {string[]} userRoles - List of role codes e.g. ['HR_OFFICER']
 * @param {string} area - Functional area e.g. 'dashboard', 'payroll', 'attendance'
 * @param {string} action - Action e.g. 'view', 'edit', 'approve'
 * @returns {boolean}
 */
export function checkPermission(userRoles = [], area, action = 'view') {
  if (!Array.isArray(userRoles) || userRoles.length === 0) return false;

  // Salary is restricted strictly to the 4 statutory roles
  if (area === 'salary') {
    return userRoles.some((r) => SALARY_ROLES.includes(r));
  }

  for (const roleCode of userRoles) {
    const permissions = PERMISSIONS_MATRIX[roleCode];
    if (permissions && permissions[area]) {
      const allowedActions = permissions[area];
      if (
        allowedActions.includes(action) ||
        (action === 'view' && allowedActions.includes('view_team')) ||
        (allowedActions.includes('view') && action === 'read')
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Helper to check if a user role can access a top-level sidebar navigation area
 */
export function canAccessNavArea(userRoles = [], area, seesSalary = false) {
  if (!Array.isArray(userRoles) || userRoles.length === 0) return false;

  // Dedicated checks
  if (area === 'payroll') {
    return Boolean(seesSalary) || userRoles.some((r) => SALARY_ROLES.includes(r));
  }

  if (area === 'offboarding') {
    return userRoles.some((r) =>
      ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'DEPT_MANAGER'].includes(r)
    );
  }

  if (area === 'compliance') {
    // Spec 5.3: Documents/compliance view is HR Manager, HR Officer, GM, Employee (own)
    return userRoles.some((r) => ['HR_MANAGER', 'HR_OFFICER', 'GM'].includes(r));
  }

  if (area === 'reports') {
    // Spec 5.3: Reports (Headcount, accounting, liabilities) for HR Mgr, Payroll, GM, Finance
    return userRoles.some((r) => ['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'].includes(r));
  }

  if (area === 'attendance') {
    return userRoles.some((r) => ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER'].includes(r));
  }

  if (area === 'leave') {
    return userRoles.some((r) => ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER'].includes(r));
  }

  if (area === 'employees') {
    return userRoles.some((r) =>
      ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER'].includes(r)
    );
  }

  if (area === 'settings') {
    return userRoles.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE'].includes(r));
  }

  if (area === 'audit') {
    return userRoles.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'GM'].includes(r));
  }

  if (area === 'approvals') {
    return userRoles.some((r) => ['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'DEPT_MANAGER'].includes(r));
  }

  if (area === 'dashboard') {
    return userRoles.some((r) =>
      ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'DEPT_MANAGER'].includes(r)
    );
  }

  return false;
}

