import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';

import prisma from '../../src/lib/prisma.js';
import { seedSystemData, SYSTEM_ROLE_DEFS } from '../../prisma/seed/systemData.js';
import companyService from '../../src/services/companyService.js';

describe('Part 7E: Clean System Seed, Role Guards, and 5 Statutory Approval Flows', () => {
  const runId = Date.now();
  const testLicense = `TL-7E-${runId}`;
  const testEmail = `admin-${runId}@part7e-test.ae`;
  let createdCompanyId = null;

  before(async () => {
    // Start with a clean slate for the Part 7E test run
    await prisma.$base().$executeRawUnsafe(`
      TRUNCATE TABLE 
        companies, 
        roles, 
        public_holidays, 
        leave_types, 
        accrual_plans 
      CASCADE;
    `);
  });

  after(async () => {
    // Re-seed demo database so subsequent tests have full companies, users and employees
    try {
      execSync('node prisma/seed/index.js', {
        cwd: path.resolve(__dirname, '../..'),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
          NODE_ENV: 'test',
          SEED_MODE: 'demo',
        },
        stdio: 'pipe',
      });
    } catch (e) {
      console.error('Failed to restore demo seed in after():', e.message);
    }
  });

  it('1. setup-company fails loudly with rollback if roles catalog is empty', async () => {
    const rolesCount = await prisma.$base().roles.count();
    assert.equal(rolesCount, 0, 'Roles catalog must be empty before seed');

    await assert.rejects(
      async () => {
        await companyService.createCompanyWithDefaults({
          name: 'Empty Roles Co LLC',
          trade_license_no: `TL-EMPTY-${runId}`,
          admin_email: `admin-empty-${runId}@test.ae`,
        });
      },
      (err) => {
        assert(
          err.code === 'ROLES_CATALOG_EMPTY' || err.message.includes('Roles catalog is empty'),
          `Expected ROLES_CATALOG_EMPTY error, got: ${err.message}`
        );
        return true;
      }
    );

    // Verify atomic rollback: zero companies and zero users created
    const companyCount = await prisma.$base().companies.count();
    const userCount = await prisma.$base().users.count();
    assert.equal(companyCount, 0, 'No company rows must be left behind after rollback');
    assert.equal(userCount, 0, 'No user rows must be left behind after rollback');
  });

  it('2. setup-company fails loudly if COMPANY_ADMIN role is missing', async () => {
    // Insert partial roles without COMPANY_ADMIN
    await prisma.$base().roles.create({
      data: {
        code: 'EMPLOYEE',
        name: 'Employee',
        sees_salary: false,
        permissions: {},
      },
    });

    await assert.rejects(
      async () => {
        await companyService.createCompanyWithDefaults({
          name: 'Missing Admin Role Co LLC',
          trade_license_no: `TL-NOADMIN-${runId}`,
          admin_email: `admin-noadmin-${runId}@test.ae`,
        });
      },
      (err) => {
        assert(
          err.code === 'ROLE_COMPANY_ADMIN_MISSING' || err.message.includes('COMPANY_ADMIN'),
          `Expected ROLE_COMPANY_ADMIN_MISSING error, got: ${err.message}`
        );
        return true;
      }
    );

    // Clean up partial role
    await prisma.$base().roles.deleteMany();
  });

  it('3. Fresh DB + seed:system + setup:company yields admin with COMPANY_ADMIN role and 5 approval flows', async () => {
    // Run clean system seed
    const seededRoles = await seedSystemData(prisma, { forceReset: false });
    assert.equal(Object.keys(seededRoles).length, 8, 'Must seed all 8 canonical roles');

    const dbRolesCount = await prisma.$base().roles.count();
    assert.equal(dbRolesCount, 8, 'Database must contain exactly 8 roles');

    // Run company setup
    const setupResult = await companyService.createCompanyWithDefaults({
      name: 'Apex Emirates Technologies LLC',
      name_ar: 'شركة أبيكس الإمارات للتكنولوجيا ذ.م.م',
      trade_license_no: testLicense,
      admin_email: testEmail,
      admin_name: 'Apex Founder',
      emirate: 'Dubai',
    });

    createdCompanyId = setupResult.company.id;
    assert(createdCompanyId, 'Company must be provisioned');

    // Verify admin user has COMPANY_ADMIN role assigned
    const adminUserRoles = await prisma.$base().user_roles.findMany({
      where: {
        company_id: createdCompanyId,
        user_id: setupResult.adminUser.id,
      },
      include: { role: true },
    });

    assert.equal(adminUserRoles.length, 1, 'Admin user must have exactly 1 role assigned');
    assert.equal(adminUserRoles[0].role.code, 'COMPANY_ADMIN', 'Role assigned must be COMPANY_ADMIN');
    assert.equal(adminUserRoles[0].scope_type, 'Company', 'Role scope must be Company');

    // Verify exactly 5 approval flows created
    const flows = await prisma.$base().approval_flows.findMany({
      where: { company_id: createdCompanyId },
      include: { steps: { include: { role: true } } },
      orderBy: { request_type: 'asc' },
    });

    assert.equal(flows.length, 5, 'Must create exactly 5 default approval flows');

    const flowTypes = flows.map((f) => f.request_type).sort();
    assert.deepEqual(
      flowTypes,
      ['EMPLOYEE_VERIFICATION', 'LEAVE', 'Overtime', 'PayRun', 'Separation'].sort(),
      'All 5 statutory approval flow types must be present'
    );

    // Verify EMPLOYEE_VERIFICATION flow has HR_MANAGER as approver
    const verifFlow = flows.find((f) => f.request_type === 'EMPLOYEE_VERIFICATION');
    assert(verifFlow, 'EMPLOYEE_VERIFICATION flow must exist');
    assert.equal(verifFlow.steps.length, 1);
    assert.equal(verifFlow.steps[0].role.code, 'HR_MANAGER');
  });

  it('4. seed:system refuses to run without --force-reset when companies already exist', async () => {
    const companyCountBefore = await prisma.$base().companies.count();
    assert(companyCountBefore > 0, 'At least 1 company must exist');

    await assert.rejects(
      async () => {
        await seedSystemData(prisma, { forceReset: false });
      },
      (err) => {
        assert(
          err.code === 'EXISTING_COMPANIES_REFUSED' || err.message.includes('[REFUSED]'),
          `Expected EXISTING_COMPANIES_REFUSED error, got: ${err.message}`
        );
        return true;
      }
    );
  });

  it('5. seed:system with --force-reset is non-destructive: does NOT delete existing companies, users or employees', async () => {
    // Create an employee in the existing company to verify preservation
    const branch = await prisma.$base().branches.findFirst({ where: { company_id: createdCompanyId } });
    const dept = await prisma.$base().departments.findFirst({ where: { company_id: createdCompanyId } });
    const visa = await prisma.$base().company_visas.findFirst({ where: { company_id: createdCompanyId } });

    const testEmp = await prisma.$base().employees.create({
      data: {
        company_id: createdCompanyId,
        company_visa_id: visa.id,
        branch_id: branch.id,
        employee_code: `EMP-7E-${runId}`,
        name: 'Zaid Al-Hashimi',
        nationality: 'ARE',
        gender: 'Male',
        work_email: `zaid-${runId}@apextech.ae`,
        joining_date: new Date('2026-01-01'),
        status: 'Active',
      },
    });

    const companyCountBefore = await prisma.$base().companies.count();
    const userCountBefore = await prisma.$base().users.count();
    const employeeCountBefore = await prisma.$base().employees.count();

    assert(companyCountBefore >= 1, 'Existing companies must be present');
    assert(userCountBefore >= 1, 'Existing users must be present');
    assert(employeeCountBefore >= 1, 'Existing employees must be present');

    // Run seed:system with --force-reset
    const res = await seedSystemData(prisma, { forceReset: true });
    assert.equal(Object.keys(res).length, 8, '8 roles must be upserted');

    // Verify zero data loss
    const companyCountAfter = await prisma.$base().companies.count();
    const userCountAfter = await prisma.$base().users.count();
    const employeeCountAfter = await prisma.$base().employees.count();

    assert.equal(companyCountAfter, companyCountBefore, 'Companies must NOT be deleted');
    assert.equal(userCountAfter, userCountBefore, 'Users must NOT be deleted');
    assert.equal(employeeCountAfter, employeeCountBefore, 'Employees must NOT be deleted');

    // Verify employee record is completely intact
    const foundEmp = await prisma.$base().employees.findUnique({ where: { id: testEmp.id } });
    assert(foundEmp, 'Employee record must be preserved');
    assert.equal(foundEmp.employee_code, `EMP-7E-${runId}`);
  });

  it('6. seed:system refuses demo mode in production and exits non-zero', async () => {
    const { spawnSync } = await import('node:child_process');
    const scriptPath = path.resolve(__dirname, '../../../scripts/seed-system.mjs');

    const result = spawnSync(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        SEED_MODE: 'demo',
      },
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0, 'seed:system must exit non-zero when SEED_MODE=demo and NODE_ENV=production');
    assert(
      result.stderr.includes('[SECURITY BLOCK]') || result.stderr.includes('forbidden in production'),
      `Expected SECURITY BLOCK message in stderr, got: ${result.stderr}`
    );
  });
});
