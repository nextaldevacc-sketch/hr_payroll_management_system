/**
 * Roles definition for Nextal HR & Payroll Platform
 * Section 5.1 & 5.2
 */

export const ADMIN_LEVELS = {
  PLATFORM_ADMIN: 'Platform Admin',
  COMPANY_ADMIN: 'Company Admin'
};

export const COMPANY_ROLES = {
  EMPLOYEE: 'Employee',
  DEPARTMENT_MANAGER: 'Department Manager',
  HR_OFFICER: 'HR Officer',
  PAYROLL_OFFICER: 'Payroll Officer',
  HR_MANAGER: 'HR Manager',
  GM: 'GM',
  FINANCE: 'Finance'
};

/**
 * Roles allowed to view and manage salary figures
 * Section 5.3: Salary figures visible only to Payroll, HR Manager, GM and Finance
 */
export const SALARY_AUTHORIZED_ROLES = [
  COMPANY_ROLES.PAYROLL_OFFICER,
  COMPANY_ROLES.HR_MANAGER,
  COMPANY_ROLES.GM,
  COMPANY_ROLES.FINANCE,
  ADMIN_LEVELS.COMPANY_ADMIN
];

export const hasSalaryAccess = (userRole) => {
  return SALARY_AUTHORIZED_ROLES.includes(userRole);
};
