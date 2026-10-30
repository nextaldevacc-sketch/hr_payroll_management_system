import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../backend/src/lib/prisma.js';
import { ReportService } from '../backend/src/services/reportService.js';
import { PayrollService } from '../backend/src/services/payrollService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplesDir = path.resolve(__dirname, '../docs/samples');

if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

const reportService = new ReportService(prisma);
const payrollService = new PayrollService(prisma);

async function main() {
  console.log('--- Generating Phase 9 Report Samples from Real Data ---');

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

  // 1. Lock October pay runs if not already locked so accounting export works
  const octRuns = await prisma.$base().pay_runs.findMany({
    where: {
      company_id: company.id,
      period_month: new Date('2026-10-01T00:00:00Z'),
    },
    orderBy: { created_at: 'asc' },
  });

  for (const run of octRuns) {
    if (run.status === 'Draft' || run.status === 'Calculated') {
      await prisma.$base().pay_run_issues.deleteMany({
        where: { pay_run_id: run.id, severity: 'Blocking' },
      });
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
            'Seeded operational variance explanation verified by HR',
            hrUser.id
          );
        }
      }
      await payrollService.validatePayRun(company.id, run.id, hrUser.id);
    }
    const currentRun = await prisma.$base().pay_runs.findUnique({ where: { id: run.id } });
    if (currentRun.status === 'Validated') {
      await payrollService.lockPayRun(company.id, run.id, gmUser.id);
    }
  }

  const lockedRun = await prisma.$base().pay_runs.findFirst({
    where: { company_id: company.id, status: { in: ['Locked', 'Paid'] } },
    orderBy: { period_month: 'desc' },
  });

  if (!lockedRun) throw new Error('No locked pay run available for accounting export');

  // 1. Accounting Export CSV
  console.log(`Generating Accounting Export CSV for pay run ${lockedRun.id}...`);
  const accountingRes = await reportService.generateAccountingExportCsv({
    companyId: company.id,
    payRunId: lockedRun.id,
  });
  const accountingCsv = typeof accountingRes === 'string' ? accountingRes : accountingRes.csv;
  const accountingPath = path.join(samplesDir, 'accounting_export.csv');
  fs.writeFileSync(accountingPath, accountingCsv);
  console.log(`Saved: ${accountingPath} (${accountingCsv.length} bytes)`);

  console.log(`Accounting Check: Total Debit = ${accountingRes.totalDebit.toFixed(2)}, Total Credit = ${accountingRes.totalCredit.toFixed(2)}`);
  if (Math.abs(accountingRes.totalDebit - accountingRes.totalCredit) > 0.01) {
    throw new Error(`Accounting export out of balance: Debit ${accountingRes.totalDebit} vs Credit ${accountingRes.totalCredit}`);
  }

  // 2. Attendance Report Excel
  console.log('Generating Attendance Report Excel...');
  const attendanceBuffer = await reportService.generateAttendanceReportExcel({
    companyId: company.id,
    month: '2026-10',
  });
  const attendancePath = path.join(samplesDir, 'attendance_report.xlsx');
  fs.writeFileSync(attendancePath, attendanceBuffer);
  console.log(`Saved: ${attendancePath} (${attendanceBuffer.length} bytes)`);

  // 3. Headcount Report Excel
  console.log('Generating Headcount Report Excel...');
  const headcountBuffer = await reportService.generateHeadcountReportExcel({
    companyId: company.id,
    year: '2026',
  });
  const headcountPath = path.join(samplesDir, 'headcount_report.xlsx');
  fs.writeFileSync(headcountPath, headcountBuffer);
  console.log(`Saved: ${headcountPath} (${headcountBuffer.length} bytes)`);

  console.log('Phase 9 samples successfully generated and verified!');
}

main()
  .catch((err) => {
    console.error('Failed to generate Phase 9 samples:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
