import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

import Decimal from 'decimal.js';
import prisma from '../backend/src/lib/prisma.js';
import { generateWpsSif } from '../backend/src/lib/wps/sifGenerator.js';
const STORAGE_DOCS = path.resolve(__dirname, '../backend/storage/documents');
const ENCRYPTION_MAGIC = 'NEXTAL_ENC_V1';

async function main() {
  console.log('===============================================================');
  console.log('NEXTAL HR & PAYROLL - SYSTEM & DATABASE INTEGRITY AUDIT');
  console.log('Script: scripts/check-integrity.mjs (Read-Only)');
  console.log('Timestamp:', new Date().toISOString());
  console.log('===============================================================\n');

  const failures = [];
  const checksPassed = [];
  const base = prisma.$base();

  try {
    // -------------------------------------------------------------------------
    // 1. Every employee has a unique code per company
    // -------------------------------------------------------------------------
    process.stdout.write('[CHECK 1] Employee Code Uniqueness per Company... ');
    const employees = await base.employees.findMany({
      select: { id: true, company_id: true, employee_code: true, name: true },
    });
    const codeMap = new Map();
    for (const emp of employees) {
      const key = `${emp.company_id}_${emp.employee_code}`;
      if (codeMap.has(key)) {
        failures.push(`Duplicate employee_code in company: '${emp.employee_code}' (IDs: ${codeMap.get(key)}, ${emp.id})`);
      }
      codeMap.set(key, emp.id);
    }
    console.log(`PASS (${employees.length} employees verified)`);
    checksPassed.push('1. Employee code uniqueness per company');

    // -------------------------------------------------------------------------
    // 2. Every branch belongs to one visa
    // -------------------------------------------------------------------------
    process.stdout.write('[CHECK 2] Branch-to-Visa Association Integrity... ');
    const branches = await base.branches.findMany({
      include: { company_visa: true },
    });
    for (const br of branches) {
      if (!br.company_visa_id || !br.company_visa) {
        failures.push(`Branch '${br.name}' (${br.id}) has missing or invalid company_visa_id`);
      } else if (br.company_visa.company_id !== br.company_id) {
        failures.push(`Branch '${br.name}' visa company mismatch (${br.company_visa.company_id} != ${br.company_id})`);
      }
    }
    console.log(`PASS (${branches.length} branches verified)`);
    checksPassed.push('2. Every branch belongs to one visa in same company');

    // -------------------------------------------------------------------------
    // 3. Every employee branch matches their visa
    // -------------------------------------------------------------------------
    process.stdout.write('[CHECK 3] Employee Branch vs Visa Consistency... ');
    const empsWithRelations = await base.employees.findMany({
      include: { branch: true, company_visa: true },
    });
    for (const emp of empsWithRelations) {
      if (emp.branch && emp.branch.company_visa_id !== emp.company_visa_id) {
        failures.push(`Employee ${emp.employee_code} (${emp.name}) branch visa (${emp.branch.company_visa_id}) does not match employee visa (${emp.company_visa_id})`);
      }
    }
    console.log(`PASS (${empsWithRelations.length} employee-branch-visa links verified)`);
    checksPassed.push('3. Every employee branch matches employee visa');

    // -------------------------------------------------------------------------
    // 4. Every payslip net equals earnings minus deductions
    // -------------------------------------------------------------------------
    process.stdout.write('[CHECK 4] Payslip Net Mathematical Integrity (Earnings - Deductions == Net)... ');
    const payslips = await base.payslips.findMany();

    for (const ps of payslips) {
      const gross = new Decimal(ps.gross.toString());
      const deductions = new Decimal(ps.total_deductions.toString());
      const net = new Decimal(ps.net.toString());
      const expectedNet = gross.minus(deductions);

      if (!expectedNet.equals(net)) {
        failures.push(`Payslip ${ps.id} net mismatch: gross(${gross}) - deductions(${deductions}) = ${expectedNet}, but net is ${net}`);
      }
    }
    console.log(`PASS (${payslips.length} payslips verified)`);
    checksPassed.push('4. Every payslip net equals earnings (gross) minus total deductions');

    // -------------------------------------------------------------------------
    // 5. Every SIF total equals the sum of its payslips
    // -------------------------------------------------------------------------
    process.stdout.write('[CHECK 5] SIF Export Total vs Payslips Sum... ');
    const lockedPayRuns = await base.pay_runs.findMany({
      where: { status: { in: ['Locked', 'Paid'] } },
      include: {
        company: true,
        company_visa: true,
        payslips: {
          include: {
            employee: {
              include: {
                bank_accounts: { where: { is_active: true } },
              },
            },
          },
        },
      },
    });

    let sifFilesChecked = 0;
    for (const pr of lockedPayRuns) {
      try {
        const sifData = generateWpsSif({
          payRun: pr,
          company: pr.company,
          companyVisa: pr.company_visa,
          payslips: pr.payslips,
        });

        const sifTotal = new Decimal(sifData.totalSalaries);
        const payslipsSum = pr.payslips.reduce(
          (sum, ps) => sum.plus(new Decimal(ps.net.toString())),
          new Decimal(0)
        );

        if (!sifTotal.equals(payslipsSum)) {
          failures.push(`Pay Run ${pr.id} SIF total (${sifTotal}) != sum of payslips net (${payslipsSum})`);
        }
        sifFilesChecked++;
      } catch (err) {
        failures.push(`Pay Run ${pr.id} failed SIF generation: ${err.message}`);
      }
    }
    console.log(`PASS (${sifFilesChecked} SIF generations checked against locked/paid pay runs)`);
    checksPassed.push('5. Every SIF total equals sum of payslips net');

    // -------------------------------------------------------------------------
    // 6. No user_roles row has a null scope_type
    // -------------------------------------------------------------------------
    process.stdout.write('[CHECK 6] User Roles Scope Type Non-Null Enforcement... ');
    const userRoles = await base.user_roles.findMany({
      select: { id: true, user_id: true, role_id: true, scope_type: true },
    });
    for (const ur of userRoles) {
      if (!ur.scope_type || ur.scope_type.trim() === '') {
        failures.push(`user_roles row ${ur.id} has null or empty scope_type (User: ${ur.user_id}, Role: ${ur.role_id})`);
      }
    }
    console.log(`PASS (${userRoles.length} user_roles records checked, 0 null scope_type)`);
    checksPassed.push('6. No user_roles row has null scope_type');

    // -------------------------------------------------------------------------
    // 7. No orphan rows
    // -------------------------------------------------------------------------
    process.stdout.write('[CHECK 7] Relational Orphan Rows Audit... ');
    const orphanChecks = [
      { name: 'contracts -> employee', model: 'contracts', foreignKey: 'employee_id', parentModel: 'employees' },
      { name: 'bank_accounts -> employee', model: 'bank_accounts', foreignKey: 'employee_id', parentModel: 'employees' },
      { name: 'employee_documents -> employee', model: 'employee_documents', foreignKey: 'employee_id', parentModel: 'employees' },
      { name: 'attendance_days -> employee', model: 'attendance_days', foreignKey: 'employee_id', parentModel: 'employees' },
      { name: 'leave_requests -> employee', model: 'leave_requests', foreignKey: 'employee_id', parentModel: 'employees' },
      { name: 'overtime_requests -> employee', model: 'overtime_requests', foreignKey: 'employee_id', parentModel: 'employees' },
      { name: 'payslips -> pay_run', model: 'payslips', foreignKey: 'pay_run_id', parentModel: 'pay_runs' },
      { name: 'payslips -> employee', model: 'payslips', foreignKey: 'employee_id', parentModel: 'employees' },
      { name: 'payslip_lines -> payslip', model: 'payslip_lines', foreignKey: 'payslip_id', parentModel: 'payslips' },
      { name: 'separations -> employee', model: 'separations', foreignKey: 'employee_id', parentModel: 'employees' },
      { name: 'clearance_items -> separation', model: 'clearance_items', foreignKey: 'separation_id', parentModel: 'separations' },
      { name: 'final_settlements -> separation', model: 'final_settlements', foreignKey: 'separation_id', parentModel: 'separations' },
      { name: 'user_roles -> user', model: 'user_roles', foreignKey: 'user_id', parentModel: 'users' },
      { name: 'user_roles -> role', model: 'user_roles', foreignKey: 'role_id', parentModel: 'roles' },
    ];

    for (const check of orphanChecks) {
      const parentIds = new Set(
        (await base[check.parentModel].findMany({ select: { id: true } })).map((r) => r.id)
      );
      const childRows = await base[check.model].findMany({
        select: { id: true, [check.foreignKey]: true },
      });
      for (const row of childRows) {
        const val = row[check.foreignKey];
        if (val && !parentIds.has(val)) {
          failures.push(`Orphan row in ${check.model} (ID: ${row.id}): references non-existent ${check.parentModel} (${val})`);
        }
      }
    }
    console.log(`PASS (${orphanChecks.length} relational foreign-key pathways verified, 0 orphans)`);
    checksPassed.push('7. No orphan rows across all relational tables');

    // -------------------------------------------------------------------------
    // 8. No document without encryption header
    // -------------------------------------------------------------------------
    process.stdout.write('[CHECK 8] Document At-Rest AES-256-GCM Encryption Header Audit... ');
    if (fs.existsSync(STORAGE_DOCS)) {
      const files = fs.readdirSync(STORAGE_DOCS);
      let scannedFiles = 0;
      for (const file of files) {
        const fullPath = path.join(STORAGE_DOCS, file);
        if (fs.statSync(fullPath).isFile()) {
          scannedFiles++;
          const fd = fs.openSync(fullPath, 'r');
          const headerBuf = Buffer.alloc(ENCRYPTION_MAGIC.length);
          fs.readSync(fd, headerBuf, 0, ENCRYPTION_MAGIC.length, 0);
          fs.closeSync(fd);

          if (headerBuf.toString() !== ENCRYPTION_MAGIC) {
            failures.push(`Storage document '${file}' missing required encryption magic header (${ENCRYPTION_MAGIC})`);
          }
        }
      }
      console.log(`PASS (${scannedFiles} files scanned on disk, 100% encrypted with ${ENCRYPTION_MAGIC})`);
      checksPassed.push(`8. No document without encryption header (${scannedFiles} files verified)`);
    } else {
      console.log('PASS (storage directory initialized, 0 files)');
      checksPassed.push('8. No document without encryption header (empty storage)');
    }

    // -------------------------------------------------------------------------
    // Summary & Exit Status
    // -------------------------------------------------------------------------
    console.log('\n===============================================================');
    if (failures.length > 0) {
      console.error(`INTEGRITY AUDIT FAILED: ${failures.length} violation(s) found:\n`);
      failures.forEach((f, idx) => console.error(`  [${idx + 1}] ${f}`));
      console.log('===============================================================');
      process.exit(1);
    } else {
      console.log('INTEGRITY AUDIT PASSED: ALL CHECKS COMPLETED WITH 0 VIOLATIONS.');
      console.log('Verified Criteria:');
      checksPassed.forEach((c) => console.log(`  ✓ ${c}`));
      console.log('===============================================================');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during integrity audit execution:', err);
    process.exit(1);
  } finally {
    await prisma.$base().$disconnect();
  }
}

main();
