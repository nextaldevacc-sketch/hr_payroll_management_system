import path from 'node:path';
import { fileURLToPath } from 'node:url';
let PERMISSIONS_MATRIX;
try {
  const shared = await import('@nextal/shared');
  PERMISSIONS_MATRIX = shared.PERMISSIONS_MATRIX;
} catch {
  const rel = await import('../../../shared/src/constants/permissions.js');
  PERMISSIONS_MATRIX = rel.PERMISSIONS_MATRIX;
}

export const SYSTEM_ROLE_DEFS = [
  { code: 'EMPLOYEE', name: 'Employee', sees_salary: false },
  { code: 'DEPT_MANAGER', name: 'Department Manager', sees_salary: false },
  { code: 'HR_OFFICER', name: 'HR Officer', sees_salary: false },
  { code: 'PAYROLL_OFFICER', name: 'Payroll Officer', sees_salary: true },
  { code: 'HR_MANAGER', name: 'HR Manager', sees_salary: true },
  { code: 'GM', name: 'General Manager', sees_salary: true },
  { code: 'FINANCE', name: 'Finance / Accounts', sees_salary: true },
  { code: 'COMPANY_ADMIN', name: 'Company Administrator', sees_salary: false },
];

/**
 * Seeds purely system-level data (roles, permissions).
 * NO companies, NO users, NO employees, NO demo data.
 * Non-destructive: upserts canonical roles only, never truncates tables.
 */
export async function seedSystemData(prisma, { forceReset = false } = {}) {
  console.log('--- Seeding System-Level Infrastructure & Roles Catalog ---');

  // Verify non-destructive constraint: refuse to run if companies already exist unless --force-reset is passed
  const companyCount = await prisma.companies.count();
  if (companyCount > 0 && !forceReset) {
    const msg = `[REFUSED] Database contains ${companyCount} existing company/companies. 'seed:system' will not run to protect existing data. Pass --force-reset to update system roles.`;
    console.error(msg);
    const err = new Error(msg);
    err.code = 'EXISTING_COMPANIES_REFUSED';
    throw err;
  }

  console.log('Seeding 8 canonical roles with Section 5.3 permissions matrix...');
  const rolesMap = {};
  for (const r of SYSTEM_ROLE_DEFS) {
    const role = await prisma.roles.upsert({
      where: { code: r.code },
      create: {
        code: r.code,
        name: r.name,
        sees_salary: r.sees_salary,
        permissions: PERMISSIONS_MATRIX[r.code] || {},
      },
      update: {
        name: r.name,
        sees_salary: r.sees_salary,
        permissions: PERMISSIONS_MATRIX[r.code] || {},
      },
    });
    rolesMap[r.code] = role;
  }

  console.log('System seed completed successfully (8 canonical roles upserted, 0 tables truncated).');
  return rolesMap;
}

