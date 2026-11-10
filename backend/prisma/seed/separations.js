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
  // 1. Separation In Progress: Sara Al-Nuaimi (EMP-DXB-044, 3.5 yrs, Gratuity AED 12,082.19)
  // =========================================================================
  const sara = seededEmployees.find((e) => e.employee_code === 'EMP-DXB-044');
  let saraPrepared = null;
  if (sara) {
    console.log(`Seeding separation in progress for Sara Al-Nuaimi (EMP-DXB-044)...`);
    sepInProgress = await separationService.createSeparation(
      company1.id,
      {
        employee_id: sara.id,
        type: 'Resignation',
        reason: 'Career transition to new role',
        notice_date: '2026-09-30',
        last_working_day: '2026-10-31',
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

    // Spec Example: Sara Al-Nuaimi: basic 5,000, 3 years 6 months service -> Gratuity 12,082.19
    saraPrepared = await settlementService.prepareSettlement(
      company1.id,
      sepInProgress.id,
      {
        serviceYears: 3.5,
        unusedLeaveDays: 0,
        noticeRecoveryDays: 0,
      },
      userPayroll1.id
    );
    console.log(`Sara settlement prepared: Gratuity AED ${saraPrepared.gratuity}`);

    // Update employee record to Separated
    await prisma.employees.update({
      where: { id: sara.id },
      data: { status: 'Separated' },
    });
  }

  // =========================================================================
  // 2. Approved Settlement: Omar Al-Hashimi (EMP-DXB-042, 7.00 years, Gratuity AED 32,547.95)
  // =========================================================================
  console.log('Seeding approved final settlement for Omar Al-Hashimi (EMP-DXB-042)...');
  const omar = seededEmployees.find((e) => e.employee_code === 'EMP-DXB-042');

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

  // Update employee record to Separated
  await prisma.employees.update({
    where: { id: omar.id },
    data: {
      status: 'Separated',
    },
  });

  console.log(`Omar settlement approved: Gratuity AED ${approvedSettlement.gratuity}, Total Net AED ${approvedSettlement.net_payable}`);

  // =========================================================================
  // 3. 11-Month Tenure (T23): Zaid Al-Harbi (EMP-DXB-040, Gratuity AED 0.00)
  // =========================================================================
  console.log('Seeding 11-month tenure separation for Zaid Al-Harbi (EMP-DXB-040)...');
  const zaid = seededEmployees.find((e) => e.employee_code === 'EMP-DXB-040');
  let zaidSettlement = null;
  let zaidSep = null;
  if (zaid) {
    zaidSep = await separationService.createSeparation(
      company1.id,
      {
        employee_id: zaid.id,
        type: 'Resignation',
        reason: 'Personal reasons (11 months tenure)',
        notice_date: '2026-09-30',
        last_working_day: '2026-10-31',
        auto_approve: true,
      },
      userHR1.id
    );

    const zaidClearance = await prisma.clearance_items.findMany({
      where: { separation_id: zaidSep.id },
    });
    for (const item of zaidClearance) {
      await separationService.updateClearanceItem(
        company1.id,
        item.id,
        {
          status: 'Cleared',
          amount_due: 0,
          note: 'All items returned',
        },
        userHR1.id
      );
    }

    zaidSettlement = await settlementService.prepareSettlement(
      company1.id,
      zaidSep.id,
      {
        unusedLeaveDays: 0,
        noticeRecoveryDays: 0,
      },
      userPayroll1.id
    );
    console.log(`Zaid settlement prepared: Gratuity AED ${zaidSettlement.gratuity} (T23: Under 1 year -> 0.00)`);
  }

  return { sepInProgress, omarSep, approvedSettlement, zaidSep, zaidSettlement };
}

export default seedSeparations;
