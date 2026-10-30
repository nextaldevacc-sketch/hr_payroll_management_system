import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../backend/src/lib/prisma.js';
import separationService from '../backend/src/services/separationService.js';
import settlementService from '../backend/src/services/settlementService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Generating Omar Sample Settlement PDF...');

  const company = await prisma.$base().companies.findFirst({
    where: { name: 'Gulf Tech Logistics LLC' },
  });
  if (!company) throw new Error('Company not found');

  const hrUser = await prisma.$base().users.findFirst({
    where: { company_id: company.id, email: { contains: 'hr.mgr' } },
  });
  const gmUser = await prisma.$base().users.findFirst({
    where: { company_id: company.id, email: { contains: 'gm' } },
  });
  const payrollUser = await prisma.$base().users.findFirst({
    where: { company_id: company.id, email: { contains: 'payroll' } },
  });

  const baseEmp = await prisma.$base().employees.findFirst({
    where: { company_id: company.id, status: 'Active' },
    include: { contracts: true },
  });

  // Find or create Omar Al-Hashimi
  let omar = await prisma.$base().employees.findFirst({
    where: { company_id: company.id, employee_code: 'EMP-SAMPLE-OMAR' },
  });

  if (!omar) {
    omar = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        company_visa_id: baseEmp.company_visa_id,
        branch_id: baseEmp.branch_id,
        department_id: baseEmp.department_id,
        employee_code: 'EMP-SAMPLE-OMAR',
        name: 'Omar Al-Hashimi',
        arabic_name: 'عمر الهاشمي',
        gender: 'Male',
        nationality: 'ARE',
        residency_type: 'National',
        joining_date: new Date('2019-10-31'),
        status: 'Active',
      },
    });

    const c = baseEmp.contracts[0];
    await prisma.$base().contracts.create({
      data: {
        company_id: company.id,
        employee_id: omar.id,
        contract_type: 'Unlimited',
        start_date: new Date('2019-10-31'),
        job_id: c.job_id,
        department_id: c.department_id,
        shift_id: c.shift_id,
        attendance_policy_id: c.attendance_policy_id,
        structure_id: c.structure_id,
        basic: 6000.0,
        housing: 3000.0,
        transport: 1000.0,
        gross: 10000.0,
        effective_date: new Date('2019-10-31'),
        status: 'Active',
      },
    });
  }

  // Create separation for Omar
  let sep = await prisma.$base().separations.findFirst({
    where: { company_id: company.id, employee_id: omar.id },
  });

  if (!sep) {
    sep = await separationService.createSeparation(
      company.id,
      {
        employee_id: omar.id,
        type: 'Resignation',
        reason: 'Personal relocation abroad',
        notice_date: '2026-09-30',
        last_working_day: '2026-10-31',
        auto_approve: true,
      },
      hrUser.id
    );
  }

  // Clear all clearance items
  const items = await prisma.$base().clearance_items.findMany({
    where: { separation_id: sep.id },
  });
  for (const it of items) {
    await separationService.updateClearanceItem(
      company.id,
      it.id,
      { status: 'Cleared', amount_due: 0, note: 'All assets returned in good condition' },
      hrUser
    );
  }

  // Clean prior final settlement if not approved
  const existingSet = await prisma.$base().final_settlements.findUnique({
    where: { separation_id: sep.id },
  });
  let settlementId;

  if (!existingSet) {
    const prep = await settlementService.prepareSettlement(
      company.id,
      sep.id,
      {
        basicSalary: 6000.0,
        grossSalary: 10000.0,
        serviceYears: 7.0,
        unusedLeaveDays: 12,
        salaryDue: 10000.0, // October full month
        loanRecovery: 0,
      },
      payrollUser.id
    );

    await settlementService.validateSettlement(company.id, prep.id, hrUser.id);
    const approved = await settlementService.approveSettlement(company.id, prep.id, gmUser.id);
    settlementId = approved.id;
  } else {
    settlementId = existingSet.id;
  }

  // Generate PDF
  console.log(`Generating settlement PDF for settlementId: ${settlementId}...`);
  const pdfBuffer = await settlementService.generateSettlementPdf(company.id, settlementId);

  const outDir = path.resolve(__dirname, '../docs/samples');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'sample_settlement_omar.pdf');
  fs.writeFileSync(outPath, pdfBuffer);
  console.log(`Successfully generated: ${outPath} (${pdfBuffer.length} bytes)`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

