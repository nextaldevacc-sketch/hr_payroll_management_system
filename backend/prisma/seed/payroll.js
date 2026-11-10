/**
 * Seed Module: Payroll & Pay Runs
 *
 * Implements real payroll lifecycle via PayrollService:
 * - September 2026: Created, Calculated, Validated by HR, Approved & Locked by GM, Marked Paid by Finance.
 * - October 2026: Created and Calculated by PayrollService for both company visas.
 *   Contains authentic variances vs September and statutory blocking issues.
 */
import { PayrollService } from '../../src/services/payrollService.js';

export async function seedPayroll(prisma, {
  company1,
  visas1,
  seededEmployees,
  demoUsersMap,
}) {
  const payrollService = new PayrollService(prisma);

  const userHR1 = demoUsersMap['hr.mgr@gulftech.ae'];
  const userPayroll1 = demoUsersMap['payroll@gulftech.ae'];
  const userGM1 = demoUsersMap['gm@gulftech.ae'];
  const userFinance1 = demoUsersMap['finance@gulftech.ae'];
  const userAdmin1 = demoUsersMap['admin@gulftech.ae'];

  // =========================================================================
  // 1. September 2026 Pay Runs (Real Service Lifecycle)
  // =========================================================================
  console.log('Seeding real September 2026 Pay Runs via PayrollService...');

  // 1a. September Pay Run for Visa 1 (MOHRE Dubai - 30 employees)
  const septRun1 = await payrollService.createPayRun(
    company1.id,
    {
      company_visa_id: visas1.visa1_01.id,
      period_month: '2026-09-01',
      cutoff_date: '2026-09-25',
      run_type: 'Regular',
    },
    userPayroll1.id
  );
  await payrollService.calculatePayRun(company1.id, septRun1.id, userPayroll1.id);
  await payrollService.validatePayRun(company1.id, septRun1.id, userHR1.id);
  await payrollService.lockPayRun(company1.id, septRun1.id, userGM1.id);
  await payrollService.markPayRunPaid(company1.id, septRun1.id, userFinance1.id);

  // 1b. September Pay Run for Visa 2 (DIFC Freezone - 9 active employees in Sep)
  const septRun2 = await payrollService.createPayRun(
    company1.id,
    {
      company_visa_id: visas1.visa1_02.id,
      period_month: '2026-09-01',
      cutoff_date: '2026-09-25',
      run_type: 'Regular',
    },
    userPayroll1.id
  );
  await payrollService.calculatePayRun(company1.id, septRun2.id, userPayroll1.id);
  await payrollService.validatePayRun(company1.id, septRun2.id, userHR1.id);
  await payrollService.lockPayRun(company1.id, septRun2.id, userGM1.id);
  await payrollService.markPayRunPaid(company1.id, septRun2.id, userFinance1.id);

  console.log('September 2026 Pay Runs successfully calculated, validated, locked and paid.');

  // =========================================================================
  // 2. Scheduled Salary Adjustments (Loans & Advances starting October 2026)
  // =========================================================================
  console.log('Seeding scheduled salary adjustments (loans & advances)...');
  const adjsToSeed = [
    { empIdx: 0, type: 'Loan', total: 6000.0, monthly: 500.0, bal: 6000.0, reason: 'Staff education loan' },
    { empIdx: 5, type: 'Loan', total: 20000.0, monthly: 2000.0, bal: 20000.0, reason: 'Personal renovation loan' },
    { empIdx: 6, type: 'Loan', total: 15000.0, monthly: 1500.0, bal: 15000.0, reason: 'Vehicle repair loan' },
    { empIdx: 7, type: 'Loan', total: 10000.0, monthly: 1000.0, bal: 10000.0, reason: 'Family support loan' },
    { empIdx: 12, type: 'Advance', total: 800.0, monthly: 800.0, bal: 800.0, reason: 'Mid-month salary advance' },
  ];

  for (const adj of adjsToSeed) {
    if (seededEmployees[adj.empIdx]) {
      await prisma.salary_adjustments.create({
        data: {
          company_id: company1.id,
          employee_id: seededEmployees[adj.empIdx].id,
          type: adj.type,
          total_amount: adj.total,
          monthly_amount: adj.monthly,
          balance: adj.bal,
          start_month: new Date('2026-10-01'),
          status: 'Approved',
          reason: adj.reason,
          created_by: userFinance1.id,
        },
      });
    }
  }

  // Spec Example: Ahmed Al-Mansoori (EMP-DXB-043) loan 6,000 at 500/month (starts 2026-08-01)
  // Enters Oct with 5,500 balance; Oct run deducts 500 -> leaves 5,000 balance entering Nov run
  const ahmedEmp = seededEmployees.find((e) => e.employee_code === 'EMP-DXB-043');
  if (ahmedEmp) {
    await prisma.salary_adjustments.create({
      data: {
        company_id: company1.id,
        employee_id: ahmedEmp.id,
        type: 'Loan',
        total_amount: 6000.0,
        monthly_amount: 500.0,
        balance: 5000.0, // Enters Nov run with 5,000; Nov run deducts 500 -> leaves 4,500 after payment
        start_month: new Date('2026-08-01'),
        status: 'Approved',
        reason: 'Spec Section 8: Ahmed worked example loan (500/month, leaves 5,000 entering Nov)',
        created_by: userFinance1.id,
      },
    });
  }

  // Spec Example / 7.6.7: Khalid Al-Marzouqi (EMP-DXB-041) outstanding loan of 1,500.00
  const khalidEmp = seededEmployees.find((e) => e.employee_code === 'EMP-DXB-041');
  if (khalidEmp) {
    await prisma.salary_adjustments.create({
      data: {
        company_id: company1.id,
        employee_id: khalidEmp.id,
        type: 'Loan',
        total_amount: 3000.0,
        monthly_amount: 500.0,
        balance: 1500.0,
        start_month: new Date('2026-08-01'),
        status: 'Approved',
        reason: 'Staff equipment loan (recorded on clearance in 7.6.3 / 7.6.7)',
        created_by: userFinance1.id,
      },
    });
  }

  // =========================================================================
  // 3. October 2026 Pay Runs (Calculated via PayrollService)
  // =========================================================================
  console.log('Seeding October 2026 Pay Runs via PayrollService for both visas...');

  // 3a. October Pay Run for Visa 1 (MOHRE Dubai - 30 employees)
  const payRun1 = await payrollService.createPayRun(
    company1.id,
    {
      company_visa_id: visas1.visa1_01.id,
      period_month: '2026-10-01',
      cutoff_date: '2026-10-25',
      run_type: 'Regular',
    },
    userPayroll1.id
  );
  const oct1Result = await payrollService.calculatePayRun(company1.id, payRun1.id, userPayroll1.id);
  console.log(`October Visa 1 calculated: ${oct1Result.employee_count} employees, Net: AED ${oct1Result.total_net}`);

  // 3b. October Pay Run for Visa 2 (DIFC Freezone - 12 employees, including 3 October joiners)
  const payRun2 = await payrollService.createPayRun(
    company1.id,
    {
      company_visa_id: visas1.visa1_02.id,
      period_month: '2026-10-01',
      cutoff_date: '2026-10-25',
      run_type: 'Regular',
    },
    userPayroll1.id
  );
  const oct2Result = await payrollService.calculatePayRun(company1.id, payRun2.id, userPayroll1.id);
  console.log(`October Visa 2 calculated: ${oct2Result.employee_count} employees, Net: AED ${oct2Result.total_net}`);

  // 3c. Enter demo variance explanations for Visa 1 variances via service API
  const oct1PayslipsWithVariance = await prisma.payslips.findMany({
    where: {
      pay_run_id: payRun1.id,
      variance_pct: { not: null },
    },
  });

  for (const ps of oct1PayslipsWithVariance) {
    if (Math.abs(Number(ps.variance_pct)) >= 5.0) {
      await payrollService.updateVarianceReason(
        company1.id,
        ps.id,
        'Approved operational variance (shift & overtime adjustment)',
        userHR1.id
      );
    }
  }

  // =========================================================================
  // 4. Initial Audit Logs
  // =========================================================================
  console.log('Seeding initial audit logs...');
  await prisma.audit_logs.create({
    data: {
      company_id: company1.id,
      user_id: userAdmin1.id,
      action: 'CREATE',
      table_name: 'companies',
      record_id: company1.id,
      new_values: { name: company1.name, trade_license_no: company1.trade_license_no },
      ip_address: '127.0.0.1',
    },
  });

  return {
    septRun1,
    septRun2,
    payRun1,
    payRun2,
  };
}

export default seedPayroll;
