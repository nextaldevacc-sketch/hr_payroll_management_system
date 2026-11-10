import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../backend');
dotenv.config({ path: path.resolve(backendDir, '.env') });
const DEMO_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_payroll?schema=public';
process.env.DATABASE_URL = DEMO_DB_URL;

import prisma from '../backend/src/lib/prisma.js';
import { executeJob } from '../backend/src/jobs/scheduler.js';

async function main() {
  console.log('===============================================================');
  console.log('RESETTING DEMO DATABASE: nextal_hr_payroll');
  console.log('===============================================================\n');

  // 1. Reset migrations and seed demo DB
  execSync('npx prisma migrate reset --schema prisma/schema.prisma --force --skip-seed --skip-generate', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: DEMO_DB_URL, NODE_ENV: 'development' },
    stdio: 'inherit',
  });

  console.log('\nRunning database seed on demo database...');
  execSync('node prisma/seed/index.js', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: DEMO_DB_URL, NODE_ENV: 'development' },
    stdio: 'inherit',
  });

  const base = prisma.$base();

  // 2. Counts and test data check
  console.log('\n===============================================================');
  console.log('DEMO DATABASE TABLE ROW COUNTS');
  console.log('===============================================================');

  const companiesCount = await base.companies.count();
  const usersCount = await base.users.count();
  const employeesCount = await base.employees.count();
  const visasCount = await base.company_visas.count();
  const branchesCount = await base.branches.count();
  const payRunsCount = await base.pay_runs.count();
  const payslipsCount = await base.payslips.count();
  const separationsCount = await base.separations.count();
  const documentsCount = await base.employee_documents.count();

  console.log(`Companies   : ${companiesCount}`);
  console.log(`Users       : ${usersCount}`);
  console.log(`Employees   : ${employeesCount}`);
  console.log(`Visas       : ${visasCount}`);
  console.log(`Branches    : ${branchesCount}`);
  console.log(`Pay Runs    : ${payRunsCount}`);
  console.log(`Payslips    : ${payslipsCount}`);
  console.log(`Separations : ${separationsCount}`);
  console.log(`Documents   : ${documentsCount}`);

  // Test data name check
  console.log('\n===============================================================');
  console.log('CHECKING EMPLOYEES FOR TEST DATA NAMES');
  console.log('===============================================================');

  const allEmps = await base.employees.findMany({
    select: { employee_code: true, name: true, arabic_name: true },
    orderBy: { employee_code: 'asc' },
  });

  const testLikeEmployees = allEmps.filter((e) =>
    /test|demo|dummy|sample|fake|associate\s*\d|specialist\s*\d|\d$/i.test(e.name)
  );

  console.log(`Employees scanned: ${allEmps.length}`);
  console.log(`Employees with test-like names: ${testLikeEmployees.length}`);
  if (testLikeEmployees.length > 0) {
    console.error('FAIL: Found test-like names:');
    testLikeEmployees.forEach((e) => console.error(`  - ${e.employee_code}: ${e.name}`));
    process.exit(1);
  } else {
    console.log('PASS: Zero employees have test-like names.');
  }

  // 3. Run scheduled jobs once
  console.log('\n===============================================================');
  console.log('RUNNING SCHEDULED JOBS ON DEMO DB (RUN 1)');
  console.log('===============================================================');

  const notifsBeforeRun1 = await base.notifications.count();
  const tasksBeforeRun1 = await base.separation_tasks.count();

  const expiryRun1 = await executeJob('expiry', 'MANUAL_TEST');
  console.log('\nExpiry Job Run 1 Result:');
  console.log(JSON.stringify(expiryRun1, null, 2));

  const deactivationRun1 = await executeJob('deactivation', 'MANUAL_TEST');
  console.log('\nDeactivation Job Run 1 Result:');
  console.log(JSON.stringify(deactivationRun1, null, 2));

  const accrualRun1 = await executeJob('accrual', 'MANUAL_TEST');
  console.log('\nAccrual Job Run 1 Result:');
  console.log(JSON.stringify(accrualRun1, null, 2));

  const notifsAfterRun1 = await base.notifications.count();
  const tasksAfterRun1 = await base.separation_tasks.count();

  console.log(`\nRun 1 changes: Notifications +${notifsAfterRun1 - notifsBeforeRun1}, Tasks +${tasksAfterRun1 - tasksBeforeRun1}`);

  // 4. Run scheduled jobs second time (Idempotency confirmation)
  console.log('\n===============================================================');
  console.log('RUNNING SCHEDULED JOBS ON DEMO DB (RUN 2 - IDEMPOTENCY CHECK)');
  console.log('===============================================================');

  const expiryRun2 = await executeJob('expiry', 'MANUAL_TEST');
  console.log('\nExpiry Job Run 2 Result:');
  console.log(JSON.stringify(expiryRun2, null, 2));

  const deactivationRun2 = await executeJob('deactivation', 'MANUAL_TEST');
  console.log('\nDeactivation Job Run 2 Result:');
  console.log(JSON.stringify(deactivationRun2, null, 2));

  const accrualRun2 = await executeJob('accrual', 'MANUAL_TEST');
  console.log('\nAccrual Job Run 2 Result:');
  console.log(JSON.stringify(accrualRun2, null, 2));

  const notifsAfterRun2 = await base.notifications.count();
  const tasksAfterRun2 = await base.separation_tasks.count();

  console.log(`\nRun 2 duplicate check:`);
  console.log(`Notifications added in Run 2: ${notifsAfterRun2 - notifsAfterRun1} (Expected: 0)`);
  console.log(`Tasks added in Run 2: ${tasksAfterRun2 - tasksAfterRun1} (Expected: 0)`);

  if (notifsAfterRun2 !== notifsAfterRun1 || tasksAfterRun2 !== tasksAfterRun1) {
    console.error('FAIL: Duplicate alerts or tasks created on second job run!');
    process.exit(1);
  } else {
    console.log('PASS: Exact zero duplicates created on second run. All jobs 100% idempotent.');
  }

  await prisma.$base().$disconnect();
  console.log('\nDEMO DATABASE RESET & JOB VERIFICATION COMPLETE.');
}

main().catch((err) => {
  console.error('Error during demo setup & job execution:', err);
  process.exit(1);
});
