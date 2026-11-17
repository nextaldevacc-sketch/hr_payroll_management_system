import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import { AuthService } from '../../src/services/authService.js';

const authService = new AuthService();
const testPassword = 'Nextal@2026!';

test('C4 Security: Client Headers Ignored & Tenant Context Switching Audited', async (t) => {
  let gulfTechAdminToken;
  let gulfTechHrToken;
  let platformAdminToken;
  let gulfTechCompany;
  let secondCompany;
  let secondCompanyEmployee;
  let platformUser;

  // Setup prerequisites
  await t.test('setup test companies, users and tokens', async () => {
    // 1. Find Gulf Tech company
    gulfTechCompany = await prisma.$base().companies.findFirst({
      where: { name: { contains: 'Gulf Tech' } },
    });
    if (!gulfTechCompany) {
      gulfTechCompany = await prisma.$base().companies.findFirst();
    }
    assert.ok(gulfTechCompany, 'Gulf Tech company must exist');

    // 2. Find second company
    secondCompany = await prisma.$base().companies.findFirst({
      where: { id: { not: gulfTechCompany.id } },
    });
    if (!secondCompany) {
      secondCompany = await prisma.$base().companies.create({
        data: {
          name: 'Test Tenant 2 LLC',
          trade_license_no: `TL-${Date.now()}`,
          status: 'Active',
        },
      });
    }
    assert.ok(secondCompany, 'Second company must exist');

    // 3. Find an employee in second company
    secondCompanyEmployee = await prisma.$base().employees.findFirst({
      where: { company_id: secondCompany.id },
    });
    if (!secondCompanyEmployee) {
      // Find a visa and branch in second company or create them
      let visa = await prisma.$base().company_visas.findFirst({ where: { company_id: secondCompany.id } });
      if (!visa) {
        visa = await prisma.$base().company_visas.create({
          data: {
            company_id: secondCompany.id,
            name: 'Standard Visa',
            quota: 10,
            used_quota: 1,
            issue_date: new Date(),
            expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000),
          },
        });
      }
      let branch = await prisma.$base().branches.findFirst({ where: { company_id: secondCompany.id } });
      if (!branch) {
        branch = await prisma.$base().branches.create({
          data: {
            company_id: secondCompany.id,
            name: 'HQ Branch',
            is_main: true,
          },
        });
      }
      secondCompanyEmployee = await prisma.$base().employees.create({
        data: {
          company_id: secondCompany.id,
          company_visa_id: visa.id,
          branch_id: branch.id,
          employee_code: `T2-${Date.now()}`,
          name: 'Second Company Secret Worker',
          joining_date: new Date(),
          nationality: 'Emirati',
          gender: 'Male',
          status: 'Active',
        },
      });
    }
    assert.ok(secondCompanyEmployee, 'Second company employee must exist');

    // 4. Log in Gulf Tech Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@gulftech.ae', password: testPassword });
    if (adminLogin.status === 200) {
      gulfTechAdminToken = adminLogin.body.token;
    } else {
      const passwordHash = await authService.hashPassword(testPassword);
      const user = await prisma.$base().users.upsert({
        where: { email: 'sec_test_admin@gulftech.ae' },
        create: {
          email: 'sec_test_admin@gulftech.ae',
          password_hash: passwordHash,
          company_id: gulfTechCompany.id,
          status: 'ACTIVE',
        },
        update: { password_hash: passwordHash, status: 'ACTIVE' },
      });
      const role = await prisma.$base().roles.findUnique({ where: { code: 'COMPANY_ADMIN' } });
      if (role) {
        await prisma.$base().user_roles.upsert({
          where: { user_id_role_id: { user_id: user.id, role_id: role.id } },
          create: { user_id: user.id, role_id: role.id },
          update: {},
        });
      }
      gulfTechAdminToken = authService.generateToken(user, ['COMPANY_ADMIN']);
    }

    // 5. Log in Gulf Tech HR Manager
    const hrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr.mgr@gulftech.ae', password: testPassword });
    if (hrLogin.status === 200) {
      gulfTechHrToken = hrLogin.body.token;
    } else {
      const passwordHash = await authService.hashPassword(testPassword);
      const user = await prisma.$base().users.upsert({
        where: { email: 'sec_test_hr@gulftech.ae' },
        create: {
          email: 'sec_test_hr@gulftech.ae',
          password_hash: passwordHash,
          company_id: gulfTechCompany.id,
          status: 'ACTIVE',
        },
        update: { password_hash: passwordHash, status: 'ACTIVE' },
      });
      const role = await prisma.$base().roles.findUnique({ where: { code: 'HR_MANAGER' } });
      if (role) {
        await prisma.$base().user_roles.upsert({
          where: { user_id_role_id: { user_id: user.id, role_id: role.id } },
          create: { user_id: user.id, role_id: role.id },
          update: {},
        });
      }
      gulfTechHrToken = authService.generateToken(user, ['HR_MANAGER'], [], true);
    }

    // 6. Platform admin user and token
    platformUser = await prisma.$base().users.findFirst({
      where: { is_platform_admin: true, status: 'ACTIVE' },
    });
    if (!platformUser) {
      const passwordHash = await authService.hashPassword(testPassword);
      platformUser = await prisma.$base().users.create({
        data: {
          email: `sec_platform_admin_${Date.now()}@nextal.ae`,
          password_hash: passwordHash,
          is_platform_admin: true,
          status: 'ACTIVE',
        },
      });
    }
    platformAdminToken = authService.generateToken(platformUser, ['PLATFORM_ADMIN'], [], true);
  });

  await t.test('unauthenticated request to company routes returns 401', async () => {
    const endpoints = [
      '/api/v1/employees',
      '/api/v1/payroll/overview',
      '/api/v1/approvals',
      '/api/v1/settings/company',
      '/api/v1/attendance',
      '/api/v1/leave/requests',
      '/api/v1/dashboard/overview',
      '/api/v1/company/users',
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      assert.equal(res.status, 401, `Expected 401 on ${ep} for unauthenticated request`);
      assert.equal(res.body.code, 'UNAUTHORIZED');
    }
  });

  await t.test('unauthenticated request spoofing client headers still returns 401', async () => {
    const res = await request(app)
      .get('/api/v1/employees')
      .set('X-Platform-Admin', 'true')
      .set('X-Company-Id', secondCompany.id);

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  await t.test('regular user sending X-Company-Id cannot access or see another company data', async () => {
    // User from Gulf Tech requests employees list with X-Company-Id of secondCompany
    const listRes = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${gulfTechHrToken}`)
      .set('X-Company-Id', secondCompany.id);

    assert.equal(listRes.status, 200);
    const employees = listRes.body.data || listRes.body.employees || [];

    // MUST NOT contain second company employee
    const foundOtherCompanyEmp = employees.find((e) => e.company_id === secondCompany.id);
    assert.equal(foundOtherCompanyEmp, undefined, 'User must not receive rows belonging to another company');

    // Individual employee IDOR attempt: request specific employee in secondCompany
    const getRes = await request(app)
      .get(`/api/v1/employees/${secondCompanyEmployee.id}`)
      .set('Authorization', `Bearer ${gulfTechHrToken}`)
      .set('X-Company-Id', secondCompany.id);

    // Prisma query scoped to GulfTech yields null -> returns 404
    assert.equal(getRes.status, 404, 'Must return 404 when querying employee belonging to another company');
    assert.equal(getRes.body.data, undefined);
  });

  await t.test('regular user sending X-Platform-Admin header does not gain platform privileges', async () => {
    const res = await request(app)
      .get('/api/v1/company/users')
      .set('Authorization', `Bearer ${gulfTechHrToken}`)
      .set('X-Platform-Admin', 'true');

    // HR Manager is not COMPANY_ADMIN, so must get 403
    assert.equal(res.status, 403);
  });

  await t.test('platform admin CAN switch tenants via X-Company-Id and action is logged to audit_logs', async () => {
    const beforeTimestamp = new Date();

    const res = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .set('X-Company-Id', secondCompany.id);

    assert.equal(res.status, 200);

    // Verify audit log record exists for the tenant switch
    const auditLog = await prisma.$base().audit_logs.findFirst({
      where: {
        action: 'TENANT_SWITCH',
        user_id: platformUser.id,
        company_id: secondCompany.id,
        created_at: { gte: beforeTimestamp },
      },
      orderBy: { created_at: 'desc' },
    });

    assert.ok(auditLog, 'Audit log row must be recorded when platform admin switches tenant context');
    assert.equal(auditLog.action, 'TENANT_SWITCH');
    assert.equal(auditLog.company_id, secondCompany.id);
  });
});
