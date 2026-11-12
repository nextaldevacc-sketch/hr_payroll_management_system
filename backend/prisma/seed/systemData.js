import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERMISSIONS_MATRIX } from '../../../shared/src/constants/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 */
export async function seedSystemData(prisma) {
  console.log('--- Seeding System-Level Infrastructure & Roles Catalog ---');

  console.log('Cleaning existing database tables...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      companies, 
      roles, 
      public_holidays, 
      leave_types, 
      accrual_plans 
    CASCADE;
  `);

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

  console.log('System seed completed successfully (0 companies, 0 users, 0 employees, 8 roles).');
  return rolesMap;
}

