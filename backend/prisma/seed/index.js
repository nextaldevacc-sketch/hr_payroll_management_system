import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';
import { seedOrganisation } from './organisation.js';
import { seedDemoUsers } from './demoUsers.js';
import { seedSettings } from './settings.js';
import { seedEmployees } from './employees.js';
import { seedAttendance } from './attendance.js';
import { seedPayroll } from './payroll.js';
import { seedSeparations } from './separations.js';
import complianceService from '../../src/services/complianceService.js';

const prisma = new PrismaClient();

export async function main() {
  console.log('--- Starting Nextal HR & Payroll Modular Database Seed ---');

  // 0. Clean up existing data for fresh idempotent seeding
  console.log('Cleaning existing demo data...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      companies, 
      roles, 
      public_holidays, 
      leave_types, 
      accrual_plans 
    CASCADE;
  `);

  // 1. Organisation
  const org = await seedOrganisation(prisma);

  // 2. Demo Users & Roles
  const users = await seedDemoUsers(prisma, {
    company1: org.company1,
    company2: org.company2,
    depts1: org.depts1,
  });

  // 3. Settings (Holidays, Shifts, Policies, Rules, Leave Types)
  const settings = await seedSettings(prisma, {
    company1: org.company1,
    company2: org.company2,
    rolesMap: users.rolesMap,
  });

  // 4. Employees & Master Records
  const employees = await seedEmployees(prisma, {
    company1: org.company1,
    visas1: org.visas1,
    branches1: org.branches1,
    depts1: org.depts1,
    jobs1: org.jobs1,
    shift1: settings.shift1,
    policy1: settings.policy1,
    salaryStructure1: settings.salaryStructure1,
    leaveTypesMap1: settings.leaveTypesMap1,
    accrualPlan1: settings.accrualPlan1,
    demoUsersMap: users.demoUsersMap,
    company2: org.company2,
    visa2: org.visa2,
    branch2: org.branch2,
    dept2: org.dept2,
    job2: org.job2,
    shift2: settings.shift2,
    policy2: settings.policy2,
    salaryStructure2: settings.salaryStructure2,
    leaveType2: settings.leaveType2,
    accrualPlan2: settings.accrualPlan2,
  });

  // 5. Attendance, Overtime & Leave Requests
  await seedAttendance(prisma, {
    company1: org.company1,
    seededEmployees: employees.seededEmployees,
    shift1: settings.shift1,
    demoUsersMap: users.demoUsersMap,
    leaveTypesMap1: settings.leaveTypesMap1,
  });

  // 6. Offboarding & Final Settlements (Separation in progress + Omar approved settlement)
  await seedSeparations(prisma, {
    company1: org.company1,
    seededEmployees: employees.seededEmployees,
    demoUsersMap: users.demoUsersMap,
    salaryStructure1: settings.salaryStructure1,
    shift1: settings.shift1,
    policy1: settings.policy1,
  });

  // 7. Payroll, Payslips & Audit Logs (Calculates active employees: 30 Visa 1 + 11 Visa 2 = 41)
  await seedPayroll(prisma, {
    company1: org.company1,
    visas1: org.visas1,
    seededEmployees: employees.seededEmployees,
    seededContracts: employees.seededContracts,
    rulesMap1: settings.rulesMap1,
    demoUsersMap: users.demoUsersMap,
  });

  // 8. Run Compliance Expiry Evaluation Job
  console.log('Running compliance check on seeded documents...');
  try {
    await complianceService.runComplianceJob({ referenceDate: new Date('2026-10-31') });
  } catch (err) {
    console.warn('Compliance check notice:', err.message);
  }

  console.log('\n--- Modular Database Seed Completed Successfully ---');
  console.log('Counting seeded rows per table across database...');

  const allModels = [
    'companies', 'company_visas', 'branches', 'departments', 'jobs', 'users', 'roles',
    'user_roles', 'support_access_grants', 'approval_flows', 'approval_flow_steps',
    'approval_requests', 'approval_actions', 'audit_logs', 'employees', 'contracts',
    'employee_documents', 'bank_accounts', 'shifts', 'attendance_policies', 'penalty_steps',
    'device_mappings', 'biometric_imports', 'punches', 'attendance_days', 'attendance_requests',
    'overtime_requests', 'public_holidays', 'leave_types', 'accrual_plans', 'leave_allocations',
    'leave_requests', 'salary_structures', 'salary_rules', 'pay_runs', 'pay_run_issues',
    'payslips', 'payslip_lines', 'salary_adjustments', 'separations', 'clearance_items',
    'final_settlements', 'separation_tasks'
  ];

  const counts = {};
  for (const t of allModels) {
    if (prisma[t]) {
      counts[t] = await prisma[t].count();
      console.log(`  ${t.padEnd(25)}: ${counts[t]} rows`);
    }
  }

  return counts;
}

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  main()
    .catch((e) => {
      console.error('Seed execution error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default main;
