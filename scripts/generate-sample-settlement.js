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

  // Find seeded Omar Al-Hashimi (EMP-DXB-042)
  const omar = await prisma.$base().employees.findFirst({
    where: { company_id: company.id, employee_code: 'EMP-DXB-042' },
  });

  if (!omar) {
    throw new Error('Omar Al-Hashimi (EMP-DXB-042) not found in demo database');
  }

  // Find separation for Omar
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

