/**
 * Seed Module: Offboarding & Final Settlements
 * Seeds:
 * 1. Separation in progress (Clearance partly done)
 * 2. Approved final settlement for Omar Al-Hashimi (7.00 years = AED 32,547.95 gratuity)
 */
import Decimal from 'decimal.js';
import separationService from '../../src/services/separationService.js';
import settlementService from '../../src/services/settlementService.js';
import { generateValidUaeIban } from './employees.js';

export async function seedSeparations(prisma, {
  company1,
  seededEmployees,
  demoUsersMap,
  salaryStructure1,
  shift1,
  policy1,
}) {
  console.log('Seeding separations and final settlements...');

  const userHR1 = demoUsersMap['hr.mgr@gulftech.ae'];
  const userGM1 = demoUsersMap['gm@gulftech.ae'];
  const userPayroll1 = demoUsersMap['payroll@gulftech.ae'];

  let sepInProgress = null;

  // =========================================================================
  // 1. Separation In Progress: Employee Index 20 (Clearance partly done)
  // =========================================================================
  const empInProgress = seededEmployees[20];
  if (empInProgress) {
    console.log(`Seeding separation in progress for ${empInProgress.name}...`);
    sepInProgress = await separationService.createSeparation(
      company1.id,
      {
        employee_id: empInProgress.id,
        type: 'Resignation',
        reason: 'Career transition to logistics management',
        notice_date: '2026-10-15',
        last_working_day: '2026-11-15',
        auto_approve: true,
      },
      userHR1.id
    );

    // Update clearance items: 2 Cleared, 2 Pending
    const clearanceItems = await prisma.clearance_items.findMany({
      where: { separation_id: sepInProgress.id },
      include: { department: true },
    });

    for (let i = 0; i < clearanceItems.length; i++) {
      const item = clearanceItems[i];
      if (i < 2) {
        await separationService.updateClearanceItem(
          company1.id,
          item.id,
          {
            status: 'Cleared',
            amount_due: 0,
            note: 'Assets returned in good condition',
          },
          userHR1.id
        );
      }
    }
  }

  // =========================================================================
  // 2. Approved Settlement: Omar Al-Hashimi (7.00 years, Gratuity AED 32,547.95)
  // =========================================================================
  console.log('Seeding approved final settlement for Omar Al-Hashimi...');
  const baseEmp = seededEmployees[0];
  const omarIban = generateValidUaeIban('033', 1000000099);

  const omar = await prisma.employees.create({
    data: {
      company_id: company1.id,
      company_visa_id: baseEmp.company_visa_id,
      branch_id: baseEmp.branch_id,
      department_id: baseEmp.department_id,
      employee_code: 'EMP-DXB-043',
      name: 'Omar Al-Hashimi',
      arabic_name: 'عمر الهاشمي',
      gender: 'Male',
      nationality: 'ARE',
      residency_type: 'National',
      joining_date: new Date('2019-11-03'), // Exactly 2,555 calendar days to 2026-10-31 = 7.00 years
      status: 'Active',
    },
  });

  // Omar contract: Basic 6,000, Housing 3,000, Transport 1,000 (Gross 10,000)
  const baseEmpContract = await prisma.contracts.findFirst({
    where: { company_id: company1.id, status: 'Approved' },
  });

  const omarContract = await prisma.contracts.create({
    data: {
      company_id: company1.id,
      employee_id: omar.id,
      contract_type: 'Unlimited',
      start_date: new Date('2019-11-03'),
      effective_date: new Date('2019-11-03'),
      job_id: baseEmpContract.job_id,
      department_id: baseEmpContract.department_id,
      shift_id: shift1.id,
      attendance_policy_id: policy1.id,
      structure_id: salaryStructure1.id,
      basic: 6000.0,
      housing: 3000.0,
      transport: 1000.0,
      gross: 10000.0,
      status: 'Approved',
    },
  });

  // Bank account
  await prisma.bank_accounts.create({
    data: {
      company_id: company1.id,
      employee_id: omar.id,
      bank_name: 'Emirates NBD',
      iban: omarIban,
      routing_code: 'ENBD001',
      salary_split_pct: 100.0,
      is_primary: true,
      is_active: true,
    },
  });

  // Create separation for Omar
  const omarSep = await separationService.createSeparation(
    company1.id,
    {
      employee_id: omar.id,
      type: 'Resignation',
      reason: 'Relocating abroad',
      notice_date: '2026-09-30',
      last_working_day: '2026-10-31',
      auto_approve: true,
    },
    userHR1.id
  );

  // Clear all clearance items for Omar
  const omarClearance = await prisma.clearance_items.findMany({
    where: { separation_id: omarSep.id },
  });
  for (const item of omarClearance) {
    await separationService.updateClearanceItem(
      company1.id,
      item.id,
      {
        status: 'Cleared',
        amount_due: 0,
        note: 'Cleared by department lead with all assets verified',
      },
      userHR1.id
    );
  }

  // Prepare (Payroll Officer), validate (HR Manager), approve (GM): 7.00 years -> Gratuity AED 32,547.95
  const prepared = await settlementService.prepareSettlement(
    company1.id,
    omarSep.id,
    {
      unusedLeaveDays: 12,
      noticeRecoveryDays: 0,
    },
    userPayroll1.id
  );

  await settlementService.validateSettlement(company1.id, prepared.id, userHR1.id);
  const approvedSettlement = await settlementService.approveSettlement(company1.id, prepared.id, userGM1.id);

  console.log(`Omar settlement approved: Gratuity AED ${approvedSettlement.gratuity}, Total Net AED ${approvedSettlement.net_settlement}`);
  return { sepInProgress, omarSep, approvedSettlement };
}

export default seedSeparations;
