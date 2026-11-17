import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../src/lib/prisma.js';
import approvalService from '../../src/services/approvalService.js';
import complianceService from '../../src/services/complianceService.js';

test('C3 Security: Removal of Mock-Actor Back Door & First-User Fallbacks', async (t) => {
  let company;
  let testRequest;

  await t.test('setup test company and approval request', async () => {
    company = await prisma.$base().companies.findFirst({
      where: { name: { contains: 'Gulf Tech' } },
    });
    if (!company) {
      company = await prisma.$base().companies.findFirst();
    }
    assert.ok(company, 'A company must exist');

    // Find an active approval request or create one for testing
    testRequest = await prisma.$base().approval_requests.findFirst({
      where: { company_id: company.id, status: 'Pending' },
      include: {
        flow: { include: { steps: { include: { role: true } } } },
      },
    });

    if (!testRequest) {
      // Find an approval flow for company
      const flow = await prisma.$base().approval_flows.findFirst({
        where: { company_id: company.id, is_active: true },
        include: { steps: { include: { role: true } } },
      });
      assert.ok(flow, 'An approval flow must exist');

      // Find an active user in company to be requester
      const user = await prisma.$base().users.findFirst({
        where: { company_id: company.id, status: { in: ['ACTIVE', 'Active'] } },
      });
      assert.ok(user, 'A user must exist');

      testRequest = await prisma.$base().approval_requests.create({
        data: {
          company_id: company.id,
          flow_id: flow.id,
          request_type: 'LEAVE',
          record_id: '00000000-0000-0000-0000-000000000001',
          current_step: 1,
          status: 'Pending',
          requested_by: user.id,
        },
        include: {
          flow: { include: { steps: { include: { role: true } } } },
        },
      });
    }
    assert.ok(testRequest, 'Test approval request must exist');
  });

  await t.test("calling actionRequest with 'admin-id' fails with 400 INVALID_ACTOR_ID", async () => {
    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: testRequest.id,
          actorId: 'admin-id',
          action: 'Approve',
          comment: 'Testing mock actor backdoor removal',
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_ACTOR_ID');
        return true;
      }
    );
  });

  await t.test('calling actionRequest with arbitrary non-UUID fails with 400', async () => {
    const invalidActorIds = ['not-a-uuid', '12345', '', null, undefined, 'root'];

    for (const actorId of invalidActorIds) {
      await assert.rejects(
        async () => {
          await approvalService.actionRequest({
            companyId: company.id,
            requestId: testRequest.id,
            actorId,
            action: 'Approve',
          });
        },
        (err) => {
          assert.equal(err.status, 400);
          assert.equal(err.code, 'INVALID_ACTOR_ID');
          return true;
        }
      );
    }
  });

  await t.test('calling actionRequest with non-existent UUID fails with 401 UNAUTHORIZED_ACTOR', async () => {
    const nonExistentUuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

    await assert.rejects(
      async () => {
        await approvalService.actionRequest({
          companyId: company.id,
          requestId: testRequest.id,
          actorId: nonExistentUuid,
          action: 'Approve',
        });
      },
      (err) => {
        assert.equal(err.status, 401);
        assert.equal(err.code, 'UNAUTHORIZED_ACTOR');
        return true;
      }
    );
  });

  await t.test('calling createRequest with non-UUID requestedBy fails with 400 INVALID_REQUESTER', async () => {
    await assert.rejects(
      async () => {
        await approvalService.createRequest({
          companyId: company.id,
          requestType: 'LEAVE',
          recordId: '00000000-0000-0000-0000-000000000002',
          requestedBy: 'admin-id',
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_REQUESTER');
        return true;
      }
    );
  });

  await t.test('compliance alert with no HR users in company logs warning and does NOT notify random users', async () => {
    // Create an isolated company with NO HR users
    const orphanCompany = await prisma.$base().companies.create({
      data: {
        name: `Orphan Corp ${Date.now()}`,
        trade_license_no: `TL-ORPHAN-${Date.now()}`,
        status: 'Active',
      },
    });

    // Create a regular employee user in this orphan company (e.g. basic driver, no HR role)
    const driverUser = await prisma.$base().users.create({
      data: {
        company_id: orphanCompany.id,
        email: `driver.${Date.now()}@orphancorp.ae`,
        password_hash: '$2b$12$e/randomHashForTestOnly12345678901234567890123456789012',
        status: 'ACTIVE',
      },
    });

    // Create visa and branch for employee
    const visa = await prisma.$base().company_visas.create({
      data: {
        company_id: orphanCompany.id,
        name: 'Standard Visa',
        mol_establishment_id: `MOL-${Date.now()}`,
        bank_routing_code: 'CB001',
        emirate: 'Dubai',
      },
    });
    const branch = await prisma.$base().branches.create({
      data: {
        company: { connect: { id: orphanCompany.id } },
        company_visa: { connect: { id: visa.id } },
        name: 'Main',
        emirate: 'Dubai',
      },
    });

    const employee = await prisma.$base().employees.create({
      data: {
        company: { connect: { id: orphanCompany.id } },
        company_visa: { connect: { id: visa.id } },
        branch: { connect: { id: branch.id } },
        employee_code: `DRV-${Date.now()}`,
        name: 'Orphan Driver',
        joining_date: new Date(),
        nationality: 'Indian',
        gender: 'Male',
        status: 'Active',
      },
    });

    // Create document expiring in 15 days (matching a milestone)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 15);

    const doc = await prisma.$base().employee_documents.create({
      data: {
        company_id: orphanCompany.id,
        employee_id: employee.id,
        doc_type: 'PASSPORT',
        doc_number: `PASS-${Date.now()}`,
        expiry_date: expiryDate,
        status: 'Active',
      },
    });

    const beforeNotificationCount = await prisma.$base().notifications.count({
      where: { company_id: orphanCompany.id },
    });

    // Run milestone processing
    await complianceService.runComplianceJob({ companyId: orphanCompany.id });

    // Verify driverUser was NOT notified
    const afterNotificationCount = await prisma.$base().notifications.count({
      where: { company_id: orphanCompany.id },
    });
    assert.equal(
      afterNotificationCount,
      beforeNotificationCount,
      'Random user must NOT receive notifications when no HR recipient exists'
    );

    // Verify ALERT_UNROUTED was logged in audit_logs
    const unroutedAlert = await prisma.$base().audit_logs.findFirst({
      where: {
        company_id: orphanCompany.id,
        action: 'ALERT_UNROUTED',
        record_id: doc.id,
      },
    });
    assert.ok(unroutedAlert, 'An ALERT_UNROUTED entry must be logged when no HR recipients exist');
  });
});
