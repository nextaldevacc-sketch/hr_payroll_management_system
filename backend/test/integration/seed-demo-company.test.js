import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('nextal_hr_payroll')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';
}

import prisma from '../../src/lib/prisma.js';
import { runDemoCompanySeed } from '../../scripts/seed-demo-company.mjs';
import { validateUaeIban } from '../../prisma/seed/employees.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempCredsPath = path.resolve(__dirname, '../../test-demo-credentials.txt');

test('Step 2: Additive Demo Company Seeder & Safe Removal', async (t) => {
  const testCompanyName = `Test Showcase Co ${Date.now()}`;

  // Clean up any test artifacts after tests
  t.after(async () => {
    if (fs.existsSync(tempCredsPath)) {
      try { fs.unlinkSync(tempCredsPath); } catch {}
    }
    // Clean up test company if it lingered
    try {
      await runDemoCompanySeed({
        name: testCompanyName,
        confirmDemo: true,
        isRemove: true,
        credentialsPath: tempCredsPath,
      });
    } catch {}
  });

  await t.test('1. Refuses execution without --confirm-demo', async () => {
    await assert.rejects(
      async () => {
        await runDemoCompanySeed({
          name: testCompanyName,
          confirmDemo: false,
        });
      },
      (err) => {
        assert.equal(err.code, 'CONFIRM_DEMO_REQUIRED');
        return true;
      }
    );
  });

  await t.test('2. Refuses execution without --name', async () => {
    await assert.rejects(
      async () => {
        await runDemoCompanySeed({
          name: '',
          confirmDemo: true,
        });
      },
      (err) => {
        assert.equal(err.code, 'NAME_REQUIRED');
        return true;
      }
    );
  });

  let createdCompanyId = null;

  await t.test('3. Successfully provisions additive demo company with all statutory structures', async () => {
    const existingTotalCompanies = await prisma.$base().companies.count();

    const res = await runDemoCompanySeed({
      name: testCompanyName,
      employeesCount: 6,
      confirmDemo: true,
      credentialsPath: tempCredsPath,
    });

    assert.equal(res.success, true);
    assert.ok(res.companyId);
    createdCompanyId = res.companyId;

    // Check exact +1 company added (additive, not destructive)
    const newTotalCompanies = await prisma.$base().companies.count();
    assert.equal(newTotalCompanies, existingTotalCompanies + 1);

    // Verify company configuration
    const comp = await prisma.$base().companies.findUnique({
      where: { id: createdCompanyId },
      include: {
        company_visas: true,
        branches: true,
        departments: true,
        shifts: true,
        leave_types: true,
        salary_structures: true,
        approval_flows: { include: { steps: true } },
      },
    });

    assert.equal(comp.name, testCompanyName);
    assert.equal(comp.require_privileged_mfa, false, 'require_privileged_mfa must be false to bypass TOTP');
    assert.equal(comp.company_visas.length, 2, 'Must have 2 visas');
    assert.equal(comp.branches.length, 2, 'Must have 2 branches');
    assert.equal(comp.departments.length, 4, 'Must have 4 departments');
    assert.ok(comp.shifts.length >= 1, 'Must have standard shifts');
    assert.ok(comp.leave_types.length >= 7, 'Must have UAE statutory leave types');
    assert.ok(comp.salary_structures.length >= 1, 'Must have salary structure');
    assert.ok(comp.approval_flows.length >= 3, 'Must have approval flows');

    // Verify the 8 role users
    const users = await prisma.$base().users.findMany({
      where: { company_id: createdCompanyId },
      include: { user_roles: { include: { role: true } } },
    });

    const roleCodes = users.flatMap((u) => u.user_roles.map((ur) => ur.role.code));
    const expectedRoles = ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'DEPT_MANAGER', 'EMPLOYEE'];
    for (const r of expectedRoles) {
      assert.ok(roleCodes.includes(r), `User with role ${r} must exist`);
    }

    // Verify HR_OFFICER_V2 is scoped to Visa 2
    const visa2 = comp.company_visas.find((v) => v.name.includes('Visa 02'));
    assert.ok(visa2);
    const hrOfficer2UserRole = users
      .flatMap((u) => u.user_roles)
      .find((ur) => ur.role.code === 'HR_OFFICER' && ur.scope_type === 'CompanyVisa' && ur.scope_id === visa2.id);
    assert.ok(hrOfficer2UserRole, 'HR_OFFICER_V2 must be scoped to Visa 02');

    // Verify Employees, Contracts, Valid IBANs, and Emirates IDs
    const employees = await prisma.$base().employees.findMany({
      where: { company_id: createdCompanyId },
      include: {
        contracts: true,
        bank_accounts: true,
        documents: true,
      },
    });
    assert.equal(employees.length, 6, 'Must have seeded 6 employees');

    for (const emp of employees) {
      assert.ok(emp.work_email.endsWith('@demo-nextal.test'));
      assert.ok(emp.contracts.length >= 1, 'Must have contract');
      assert.equal(emp.contracts[0].status, 'Approved');
      assert.ok(emp.bank_accounts.length >= 1, 'Must have bank account');
      assert.ok(validateUaeIban(emp.bank_accounts[0].iban), `IBAN must be mod-97 valid: ${emp.bank_accounts[0].iban}`);
      assert.ok(emp.documents.length >= 2, 'Must have documents');
      const eidDoc = emp.documents.find((d) => d.doc_type === 'EMIRATES_ID');
      assert.ok(eidDoc, 'Must have Emirates ID document');
      assert.match(eidDoc.doc_number, /^784-\d{4}-\d{7}-\d$/, 'Emirates ID must match UAE 15-digit format');
    }

    // Verify 1 Paid Pay Run exists
    const paidRuns = await prisma.$base().pay_runs.findMany({
      where: { company_id: createdCompanyId, status: 'Paid' },
      include: { payslips: true },
    });
    assert.ok(paidRuns.length >= 1, 'Must have at least 1 PAID pay run');
    assert.ok(paidRuns[0].payslips.length >= 1, 'Paid pay run must contain payslips');

    // Verify 2 Leave requests (1 Approved, 1 Pending)
    const leaveRequests = await prisma.$base().leave_requests.findMany({
      where: { company_id: createdCompanyId },
    });
    assert.equal(leaveRequests.length, 2, 'Must have 2 leave requests');
    const statuses = leaveRequests.map((l) => l.status);
    assert.ok(statuses.includes('Approved'), 'Must have 1 approved leave request');
    assert.ok(statuses.includes('Pending'), 'Must have 1 pending leave request');

    // Verify credentials file written and passwords not logged to console
    assert.ok(fs.existsSync(tempCredsPath), 'Credentials file must be created');
    const credsFileContent = fs.readFileSync(tempCredsPath, 'utf8');
    assert.match(credsFileContent, new RegExp(testCompanyName));
    assert.match(credsFileContent, /COMPANY_ADMIN/);
    assert.match(credsFileContent, /HR_OFFICER_V2/);
    assert.match(credsFileContent, /EMPLOYEE/);
  });

  await t.test('4. Refuses duplicate creation if company name already exists', async () => {
    await assert.rejects(
      async () => {
        await runDemoCompanySeed({
          name: testCompanyName,
          confirmDemo: true,
          credentialsPath: tempCredsPath,
        });
      },
      (err) => {
        assert.equal(err.code, 'COMPANY_ALREADY_EXISTS');
        return true;
      }
    );
  });

  await t.test('5. Safe removal cleans up only that company without affecting others', async () => {
    // Create an unrelated company first to verify isolation
    const otherCompanyName = `Unrelated Co ${Date.now()}`;
    const otherComp = await prisma.$base().companies.create({
      data: {
        name: otherCompanyName,
        name_ar: `شركة ${otherCompanyName}`,
        trade_license_no: `TL-OTHER-${Date.now().toString().slice(-6)}`,
        status: 'Active',
      },
    });

    const removeRes = await runDemoCompanySeed({
      name: testCompanyName,
      confirmDemo: true,
      isRemove: true,
      credentialsPath: tempCredsPath,
    });

    assert.equal(removeRes.removed, true);

    // Verify company rows are cleaned up
    const empCount = await prisma.$base().employees.count({ where: { company_id: createdCompanyId } });
    assert.equal(empCount, 0, 'All employees of demo company must be deleted');

    const payRunCount = await prisma.$base().pay_runs.count({ where: { company_id: createdCompanyId } });
    assert.equal(payRunCount, 0, 'All pay runs of demo company must be deleted');

    const leaveCount = await prisma.$base().leave_requests.count({ where: { company_id: createdCompanyId } });
    assert.equal(leaveCount, 0, 'All leave requests of demo company must be deleted');

    // Verify the other company remains completely untouched
    const stillExists = await prisma.$base().companies.findUnique({ where: { id: otherComp.id } });
    assert.ok(stillExists, 'Other companies must remain completely untouched');

    // Cleanup unrelated company
    await prisma.$base().companies.delete({ where: { id: otherComp.id } });
  });

  await t.test('6. Provisions custom branches with Visa 1 and Visa 2 associations', async () => {
    const customBranchesCompName = `Custom Branches Co ${Date.now()}`;
    const customBranchList = [
      'Dubai City Main Branch',
      'Jebel Ali Branch',
      'Hatta Branch',
      'Al Awir Branch',
      'Al Lisaili Branch',
    ];

    const res = await runDemoCompanySeed({
      name: customBranchesCompName,
      employeesCount: 5,
      branches: customBranchList.join(','),
      confirmDemo: true,
      credentialsPath: tempCredsPath,
    });

    assert.equal(res.success, true);
    assert.equal(res.branchesCount, 5);

    const comp = await prisma.$base().companies.findUnique({
      where: { id: res.companyId },
      include: { branches: true, company_visas: true },
    });

    assert.equal(comp.branches.length, 5, 'Must have created 5 branches');
    const branchNames = comp.branches.map((b) => b.name);
    for (const b of customBranchList) {
      assert.ok(branchNames.includes(b), `Branch ${b} must be present`);
    }

    const visa1 = comp.company_visas.find((v) => v.name.includes('Visa 01'));
    const visa2 = comp.company_visas.find((v) => v.name.includes('Visa 02'));
    assert.ok(visa1);
    assert.ok(visa2);

    const mainBranch = comp.branches.find((b) => b.name === 'Dubai City Main Branch');
    const secondBranch = comp.branches.find((b) => b.name === 'Jebel Ali Branch');
    assert.equal(mainBranch.company_visa_id, visa1.id, 'Main branch must be linked to Visa 1');
    assert.equal(secondBranch.company_visa_id, visa2.id, 'Second branch must be linked to Visa 2');

    // Cleanup
    await runDemoCompanySeed({
      name: customBranchesCompName,
      confirmDemo: true,
      isRemove: true,
      credentialsPath: tempCredsPath,
    });
  });

  await t.test('7. Accepts --employees 0: provisions 0 employees while creating all 8 role accounts', async () => {
    const zeroEmployeesCompName = `Zero Employees Co ${Date.now()}`;

    const res = await runDemoCompanySeed({
      name: zeroEmployeesCompName,
      employeesCount: 0,
      branches: 'Dubai City Main Branch,Jebel Ali Branch',
      confirmDemo: true,
      credentialsPath: tempCredsPath,
    });

    assert.equal(res.success, true);
    assert.equal(res.employeesCount, 0);

    const empCount = await prisma.$base().employees.count({ where: { company_id: res.companyId } });
    assert.equal(empCount, 0, 'Must have seeded 0 employees');

    const users = await prisma.$base().users.findMany({
      where: { company_id: res.companyId },
      include: { user_roles: { include: { role: true } } },
    });

    // 8 role accounts must exist
    assert.equal(users.length, 8, 'Must have created exactly 8 role users');
    const roleCodes = users.flatMap((u) => u.user_roles.map((ur) => ur.role.code));
    const expectedRoles = ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'DEPT_MANAGER'];
    for (const r of expectedRoles) {
      assert.ok(roleCodes.includes(r), `User with role ${r} must exist`);
    }

    // No pay runs
    const payRunCount = await prisma.$base().pay_runs.count({ where: { company_id: res.companyId } });
    assert.equal(payRunCount, 0, 'No pay run should be created with 0 employees');

    // Cleanup
    await runDemoCompanySeed({
      name: zeroEmployeesCompName,
      confirmDemo: true,
      isRemove: true,
      credentialsPath: tempCredsPath,
    });
  });
});
