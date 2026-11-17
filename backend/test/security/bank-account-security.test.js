import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../src/lib/prisma.js';
import employeeService from '../../src/services/employeeService.js';
import approvalService from '../../src/services/approvalService.js';
import { generateWpsSif } from '../../src/lib/wps/sifGenerator.js';
import { AuthService } from '../../src/services/authService.js';

const authService = new AuthService();
const testPassword = 'Nextal@2026!';

test('H5 Security: Bank-Account IDOR Protection and Dual Approval', async (t) => {
  let company;
  let visa;
  let branch;
  let hrManagerUser;
  let financeUser;
  let employeeA;
  let employeeB;
  let bankAccountA;
  let bankAccountB;
  let payRun;
  let ibanA1;
  let ibanB1;
  let newIbanA;
  let pendingApprovalRequestId;

  await t.test('setup test company, users, employees and bank accounts', async () => {
    company = await prisma.$base().companies.findFirst({
      where: { name: { contains: 'Gulf Tech' } },
    });
    if (!company) {
      company = await prisma.$base().companies.findFirst();
    }
    assert.ok(company, 'Company must exist');

    visa = await prisma.$base().company_visas.findFirst({ where: { company_id: company.id } });
    branch = await prisma.$base().branches.findFirst({ where: { company_id: company.id } });
    assert.ok(visa && branch, 'Visa and branch must exist');

    const timestamp = Date.now();

    // Roles
    const hrManagerRole = await prisma.$base().roles.findFirst({ where: { code: 'HR_MANAGER' } });
    const financeRole = await prisma.$base().roles.findFirst({ where: { code: 'FINANCE' } });
    assert.ok(hrManagerRole && financeRole, 'Roles must exist');

    // Users
    hrManagerUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.hrm.bank.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: hrManagerUser.id, role_id: hrManagerRole.id, scope_type: 'Company' },
    });

    financeUser = await prisma.$base().users.create({
      data: {
        company_id: company.id,
        email: `sec.fin.bank.${timestamp}@example.com`,
        password_hash: await authService.hashPassword(testPassword),
        status: 'Active',
      },
    });
    await prisma.$base().user_roles.create({
      data: { company_id: company.id, user_id: financeUser.id, role_id: financeRole.id, scope_type: 'Company' },
    });

    // Employees A and B
    employeeA = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        employee_code: `EA${timestamp}`.slice(0, 20),
        name: `Bank Test Emp A ${timestamp}`,
        residency_type: 'Resident',
        nationality: 'ARE',
        gender: 'Male',
        company_visa_id: visa.id,
        branch_id: branch.id,
        joining_date: new Date(),
        status: 'Active',
      },
    });

    employeeB = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        employee_code: `EB${timestamp}`.slice(0, 20),
        name: `Bank Test Emp B ${timestamp}`,
        residency_type: 'Resident',
        nationality: 'ARE',
        gender: 'Female',
        company_visa_id: visa.id,
        branch_id: branch.id,
        joining_date: new Date(),
        status: 'Active',
      },
    });

    function makeIban(seed) {
      const digits = '033' + String(seed).padStart(16, '0').slice(-16);
      const num = BigInt(digits + '101400');
      const check = 98n - (num % 97n);
      const checkStr = String(check).padStart(2, '0');
      return 'AE' + checkStr + digits;
    }

    ibanA1 = makeIban(timestamp);
    ibanB1 = makeIban(timestamp + 1);
    newIbanA = makeIban(timestamp + 2);

    // Initial Bank Accounts
    bankAccountA = await prisma.$base().bank_accounts.create({
      data: {
        company_id: company.id,
        employee_id: employeeA.id,
        bank_name: 'ENBD',
        iban: ibanA1,
        routing_code: '033',
        is_primary: true,
        is_active: true,
      },
    });

    bankAccountB = await prisma.$base().bank_accounts.create({
      data: {
        company_id: company.id,
        employee_id: employeeB.id,
        bank_name: 'ADCB',
        iban: ibanB1,
        routing_code: '023',
        is_primary: true,
        is_active: true,
      },
    });
  });

  await t.test('1. User cannot edit another employee bank account (IDOR test returns 404)', async () => {
    // Attempting to update employeeA with bankAccountB.id (which belongs to employeeB)
    const viewer = { userId: hrManagerUser.id, id: hrManagerUser.id, roles: ['HR_MANAGER'] };

    await assert.rejects(
      async () => {
        await employeeService.saveBankAccount({
          companyId: company.id,
          employeeId: employeeA.id,
          data: {
            id: bankAccountB.id,
            iban: ibanB1,
            routing_code: '023',
          },
          viewer,
        });
      },
      (err) => {
        assert.equal(err.status, 404, 'Must return 404 when target bank account does not belong to specified employee');
        assert.equal(err.code, 'NOT_FOUND');
        return true;
      }
    );
  });

  await t.test('2. Updating IBAN during an open pay run creates approval request and leaves SIF input unchanged', async () => {
    // 1. Create an active (Draft) pay run for company and visa
    payRun = await prisma.$base().pay_runs.create({
      data: {
        company_id: company.id,
        company_visa_id: visa.id,
        run_type: `REG_${Date.now()}`.slice(0, 20),
        period_month: new Date('2026-05-01'),
        cutoff_date: new Date('2026-05-25'),
        status: 'Draft',
      },
    });

    const viewer = { userId: hrManagerUser.id, id: hrManagerUser.id, roles: ['HR_MANAGER'] };

    // 2. Request bank account update for employeeA while pay run is Draft
    const res = await employeeService.saveBankAccount({
      companyId: company.id,
      employeeId: employeeA.id,
      data: {
        id: bankAccountA.id,
        iban: newIbanA,
        routing_code: '033',
        bank_name: 'ENBD Dubai',
      },
      viewer,
    });

    assert.equal(res.status, 'PENDING_APPROVAL');
    assert.ok(res.approval_request, 'Approval request must be returned');
    assert.equal(res.approval_request.request_type, 'BANK_ACCOUNT_CHANGE');
    pendingApprovalRequestId = res.approval_request.id;

    // 3. Verify in database: employeeA's active bank account still has the OLD IBAN
    const currentAccount = await prisma.$base().bank_accounts.findUnique({
      where: { id: bankAccountA.id },
    });
    assert.equal(currentAccount.iban, ibanA1, 'Database IBAN must remain the old IBAN until approval');

    // 4. Verify SIF generator: generate WPS SIF logic uses the active approved bank account, NOT the pending unapproved IBAN
    const testPayRunLocked = { ...payRun, status: 'Locked' };
    const payslips = [
      {
        id: 'ps-1',
        employee_id: employeeA.id,
        period_from: '2026-05-01',
        period_to: '2026-05-31',
        net: 10000,
        employee: {
          id: employeeA.id,
          name: employeeA.name,
          mohre_person_id: '12345678901234',
          bank_accounts: [currentAccount], // has is_active: true and old IBAN
        },
      },
    ];

    const sif = generateWpsSif({
      payRun: testPayRunLocked,
      company,
      companyVisa: visa,
      payslips,
    });

    assert.ok(sif.content.includes(ibanA1), 'SIF file must contain the old approved IBAN');
    assert.ok(!sif.content.includes(newIbanA), 'SIF file must NEVER contain the unapproved new IBAN');
  });

  await t.test('3. Approving the request updates the active bank account (Requester self-approval blocked)', async () => {
    // (a) hrManagerUser (the requester) tries to approve -> 403 SELF_APPROVAL_FORBIDDEN
    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: pendingApprovalRequestId,
          actorId: hrManagerUser.id,
          action: 'Approve',
          comment: 'Self approving bank change',
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'SELF_APPROVAL_FORBIDDEN');
        return true;
      }
    );

    // (b) financeUser approves the request -> succeeds
    const approveResult = await approvalService.actionRequest({
      companyId: company.id,
      requestId: pendingApprovalRequestId,
      actorId: financeUser.id,
      action: 'Approve',
      comment: 'Finance dual-control approved bank change',
    });

    assert.equal(approveResult.status, 'success');
    assert.equal(approveResult.request.status, 'Approved');

    // (c) Verify database: employeeA's bank account is now updated to newIbanA
    const updatedAccount = await prisma.$base().bank_accounts.findUnique({
      where: { id: bankAccountA.id },
    });
    assert.equal(updatedAccount.iban, newIbanA, 'Bank account must now be updated to the approved new IBAN');
    assert.equal(updatedAccount.is_active, true, 'Bank account must be active');
  });

  await t.test('4. Audit row contains masked IBANs, never raw', async () => {
    const auditLogs = await prisma.$base().audit_logs.findMany({
      where: {
        company_id: company.id,
        table_name: 'bank_accounts',
        record_id: bankAccountA.id,
      },
      orderBy: { created_at: 'desc' },
    });

    assert.ok(auditLogs.length > 0, 'Audit logs must exist for bank account changes');

    for (const log of auditLogs) {
      const oldVals = log.old_values ? JSON.stringify(log.old_values) : '';
      const newVals = log.new_values ? JSON.stringify(log.new_values) : '';

      // Neither old_values nor new_values should contain the full unmasked raw IBAN
      assert.ok(!oldVals.includes(ibanA1), 'Audit log old_values must not contain raw unmasked IBAN');
      assert.ok(!newVals.includes(newIbanA), 'Audit log new_values must not contain raw unmasked IBAN');

      // But should contain masked IBANs if recorded
      if (log.new_values?.iban) {
        assert.ok(log.new_values.iban.includes('*'), 'Audit log new_values must contain masked IBAN');
      }
    }
  });
});
