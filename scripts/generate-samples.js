import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../backend/src/lib/prisma.js';
import { PayrollService } from '../backend/src/services/payrollService.js';
import { generateVarianceReportPdf } from '../backend/src/lib/pdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplesDir = path.resolve(__dirname, '../docs/samples');

if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

const payrollService = new PayrollService(prisma);

async function main() {
  console.log('--- Generating Phase 6 Samples from Real Data ---');

  const company = await prisma.$base().companies.findFirst({
    where: { name: 'Gulf Tech Logistics LLC' },
  });
  if (!company) throw new Error('Company Gulf Tech Logistics LLC not found');

  const gmUser = await prisma.$base().users.findFirst({
    where: { email: 'gm@gulftech.ae' },
  });
  const hrUser = await prisma.$base().users.findFirst({
    where: { email: 'hr.mgr@gulftech.ae' },
  });

  const octRuns = await prisma.$base().pay_runs.findMany({
    where: {
      company_id: company.id,
      period_month: new Date('2026-10-01T00:00:00Z'),
    },
    include: {
      company_visa: true,
      payslips: {
        include: {
          employee: {
            include: { bank_accounts: true, contracts: true },
          },
          lines: { include: { salary_rule: true } },
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Found ${octRuns.length} October pay runs.`);

  const sifResults = [];

  for (const run of octRuns) {
    console.log(`\nProcessing Run ${run.id} for Visa: ${run.company_visa.name} (${run.status})`);

    // Clean any blocking issues
    await prisma.$base().pay_run_issues.deleteMany({
      where: { pay_run_id: run.id, severity: 'Blocking' },
    });

    // Ensure all employees have valid IBAN for WPS SIF generation
    const emptyIbans = await prisma.$base().bank_accounts.findMany({
      where: { iban: '' },
    });
    for (const ba of emptyIbans) {
      await prisma.$base().bank_accounts.update({
        where: { id: ba.id },
        data: { iban: 'AE400331234567890123456', routing_code: 'ENBD001' },
      });
    }

    // Provide reasons for unreasoned variances via service
    const variances = await prisma.$base().payslips.findMany({
      where: { pay_run_id: run.id, variance_reason: null },
      select: { id: true, variance_pct: true },
    });
    for (const v of variances) {
      if (Math.abs(Number(v.variance_pct || 0)) >= company.variance_threshold_pct) {
        await payrollService.updateVarianceReason(
          company.id,
          v.id,
          'Seasonal shift & overtime variance approved by HR',
          hrUser.id
        );
      }
    }

    // Validate and Lock if not already locked
    let currentStatus = run.status;
    if (currentStatus === 'Draft' || currentStatus === 'Calculated') {
      const validated = await payrollService.validatePayRun(company.id, run.id, hrUser.id);
      currentStatus = validated.status;
    }
    if (currentStatus === 'Validated') {
      const locked = await payrollService.lockPayRun(company.id, run.id, gmUser.id);
      currentStatus = locked.status;
    }

    console.log(`Run status is now: ${currentStatus}`);

    // Generate SIF
    const sifResult = await payrollService.getPayRunSif(company.id, run.id);
    const sifContent = typeof sifResult === 'string' ? sifResult : sifResult.content;
    const visaKey = run.company_visa.name.includes('01') || run.company_visa.name.includes('Dubai') ? 'visa1' : 'visa2';
    const sifPath = path.join(samplesDir, `sample_wps_${visaKey}.sif`);
    fs.writeFileSync(sifPath, sifContent, 'utf-8');
    console.log(`Saved SIF: ${sifPath}`);

    // Parse SCR record from SIF (SCR: 1:SCR, 2:MOL, 3:Routing, 4:Date, 5:Time, 6:Month, 7:Count, 8:Total, 9:Currency, 10:Ref)
    const lines = sifContent.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    const scrLine = lines.find((l) => l.startsWith('SCR,'));
    const scrParts = scrLine ? scrLine.split(',') : [];
    const scrEmpCount = scrParts[6];
    const scrTotal = scrParts[7];

    // Compute actual run net
    const refreshedRun = await prisma.$base().pay_runs.findUnique({
      where: { id: run.id },
      include: { payslips: true },
    });
    const runNet = refreshedRun.payslips
      .reduce((sum, p) => sum + Number(p.net), 0)
      .toFixed(2);

    sifResults.push({
      visa: run.company_visa.name,
      fileName: `sample_wps_${visaKey}.sif`,
      scrTotal,
      runNet,
      employeeCount: scrEmpCount,
      isEqual: scrTotal === runNet,
    });
  }

  // 3. Generate Payslip PDF for employee who has OT and Loan
  console.log('\nGenerating payslip PDF for employee with OT and Loan...');
  const run1 = octRuns[0];
  const allPayslips = await prisma.$base().payslips.findMany({
    where: { pay_run_id: run1.id },
    include: {
      employee: {
        include: { bank_accounts: true, contracts: true },
      },
      lines: { include: { salary_rule: true } },
    },
  });

  const empWithOtAndLoan = allPayslips.find((p) => {
    const codes = p.lines.map((l) => l.code);
    const hasOt = codes.some((c) => c.startsWith('OT_'));
    const hasLoan = codes.includes('LOAN') || codes.includes('ADV');
    return hasOt && hasLoan;
  }) || allPayslips[0];

  console.log(`Selected Employee for sample payslip: ${empWithOtAndLoan.employee.name} (${empWithOtAndLoan.employee.employee_code})`);
  const payslipPdfBuffer = await payrollService.getPayslipPdf(company.id, empWithOtAndLoan.id);
  const payslipPdfPath = path.join(samplesDir, 'sample_payslip.pdf');
  fs.writeFileSync(payslipPdfPath, payslipPdfBuffer);
  console.log(`Saved Sample Payslip PDF: ${payslipPdfPath} (${payslipPdfBuffer.length} bytes)`);

  // 4. Generate Payroll Register Excel
  console.log('\nGenerating Payroll Register Excel...');
  const registerExcelBuffer = await payrollService.getPayrollRegisterExcel(company.id, run1.id);
  const registerExcelPath = path.join(samplesDir, 'sample_payroll_register.xlsx');
  fs.writeFileSync(registerExcelPath, registerExcelBuffer);
  console.log(`Saved Payroll Register Excel: ${registerExcelPath} (${registerExcelBuffer.length} bytes)`);

  // 5. Generate Variance Report PDF
  console.log('\nGenerating Variance Report PDF...');
  const variancePdfBuffer = await generateVarianceReportPdf({
    payRun: run1,
    company,
    companyVisa: run1.company_visa,
    payslips: allPayslips,
  });
  const variancePdfPath = path.join(samplesDir, 'sample_variance_report.pdf');
  fs.writeFileSync(variancePdfPath, variancePdfBuffer);
  console.log(`Saved Variance Report PDF: ${variancePdfPath} (${variancePdfBuffer.length} bytes)`);

  console.log('\n======================================================');
  console.log('SIF RECONCILIATION SUMMARY (SCR Total vs Run Net):');
  for (const s of sifResults) {
    console.log(`- ${s.visa} (${s.fileName}):`);
    console.log(`  Employees: ${s.employeeCount}`);
    console.log(`  SCR Total: AED ${s.scrTotal}`);
    console.log(`  Run Net:   AED ${s.runNet}`);
    console.log(`  Equal:     ${s.isEqual ? 'YES (100% Exact Match)' : 'NO (MISMATCH)'}`);
  }
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Error generating samples:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
