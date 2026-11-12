import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';

import prisma from '../../src/lib/prisma.js';
import companyService from '../../src/services/companyService.js';
import authService from '../../src/services/authService.js';

describe('Company Bootstrap & Forced Password Change Tests (Spec Part 6B)', () => {
  const runId = Date.now();
  const testEmail = `admin-${runId}@bootstrap-test.ae`;
  const testLicense = `TL-BOOT-${runId}`;
  let bootstrapResult;

  it('1. createCompanyWithDefaults provisions company with all UAE statutory defaults and must_change_password: true', async () => {
    bootstrapResult = await companyService.createCompanyWithDefaults({
      name: 'Bootstrap Test Enterprise LLC',
      name_ar: 'شركة تجربة الإعداد ذ.م.م',
      trade_license_no: testLicense,
      admin_email: testEmail,
      admin_name: 'Test Administrator',
      emirate: 'Dubai',
    });

    assert(bootstrapResult.company.id, 'Company ID must be generated');
    assert.equal(bootstrapResult.company.name, 'Bootstrap Test Enterprise LLC');
    assert.equal(bootstrapResult.company.trade_license_no, testLicense);
    assert(bootstrapResult.tempPassword, 'Temporary password must be returned');
    assert.equal(bootstrapResult.adminUser.must_change_password, true, 'must_change_password must be true on bootstrap');

    const companyId = bootstrapResult.company.id;

    // Verify statutory defaults
    const visas = await prisma.$base().company_visas.findMany({ where: { company_id: companyId } });
    assert.equal(visas.length, 1, '1 primary visa must be created');

    const branches = await prisma.$base().branches.findMany({ where: { company_id: companyId } });
    assert.equal(branches.length, 1, '1 operating branch must be created');

    const depts = await prisma.$base().departments.findMany({ where: { company_id: companyId } });
    assert.equal(depts.length, 2, '2 default departments must be created (Operations, HR)');

    const shifts = await prisma.$base().shifts.findMany({ where: { company_id: companyId } });
    assert.equal(shifts.length, 1, '1 standard shift must be created');

    const policies = await prisma.$base().attendance_policies.findMany({ where: { company_id: companyId } });
    assert.equal(policies.length, 1, '1 attendance policy must be created');

    const penalties = await prisma.$base().penalty_steps.findMany({ where: { company_id: companyId } });
    assert.equal(penalties.length, 4, '4 penalty steps must be created');

    const holidays = await prisma.$base().public_holidays.findMany({ where: { company_id: companyId } });
    assert.equal(holidays.length, 13, '13 UAE statutory public holidays must be created');

    const leaveTypes = await prisma.$base().leave_types.findMany({ where: { company_id: companyId } });
    assert.equal(leaveTypes.length, 7, '7 statutory leave types must be created');

    const rules = await prisma.$base().salary_rules.findMany({ where: { company_id: companyId } });
    assert.equal(rules.length, 17, '17 Section 8.1 salary rules must be created');

    const flows = await prisma.$base().approval_flows.findMany({ where: { company_id: companyId } });
    assert.equal(flows.length, 4, '4 default approval flows must be created');
  });

  it('2. Idempotent guard: duplicate email or trade license is refused with 400', async () => {
    await assert.rejects(
      async () => {
        await companyService.createCompanyWithDefaults({
          name: 'Duplicate Company LLC',
          trade_license_no: 'TL-DIFFERENT-123',
          admin_email: testEmail,
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'EMAIL_EXISTS');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await companyService.createCompanyWithDefaults({
          name: 'Duplicate License LLC',
          trade_license_no: testLicense,
          admin_email: 'otheradmin@domain.ae',
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'LICENSE_EXISTS');
        return true;
      }
    );
  });

  it('3. First login with temporary password authenticates and flags must_change_password: true', async () => {
    const loginRes = await authService.login({
      email: testEmail,
      password: bootstrapResult.tempPassword,
    });

    assert(loginRes.token, 'Token must be issued');
    assert.equal(loginRes.user.email, testEmail);
    assert.equal(loginRes.user.must_change_password, true, 'Login user must have must_change_password: true');
  });

  it('4. authService.changePassword rejects weak passwords (< 10 chars, no letter/number)', async () => {
    await assert.rejects(
      async () => {
        await authService.changePassword({
          userId: bootstrapResult.adminUser.id,
          currentPassword: bootstrapResult.tempPassword,
          newPassword: 'short',
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'WEAK_PASSWORD');
        return true;
      }
    );
  });

  it('5. authService.changePassword updates password, clears must_change_password, and bumps token_version', async () => {
    const userBefore = await prisma.$base().users.findUnique({
      where: { id: bootstrapResult.adminUser.id },
    });
    const oldVersion = userBefore.token_version;

    const newPass = 'StrongPass2026!Sec';
    const changeRes = await authService.changePassword({
      userId: bootstrapResult.adminUser.id,
      currentPassword: bootstrapResult.tempPassword,
      newPassword: newPass,
    });

    assert.equal(changeRes.status, 'success');
    assert.equal(changeRes.user.must_change_password, false);

    const userAfter = await prisma.$base().users.findUnique({
      where: { id: bootstrapResult.adminUser.id },
    });
    assert.equal(userAfter.must_change_password, false);
    assert.equal(userAfter.token_version, oldVersion + 1, 'token_version must increment');

    // Old temporary password no longer works
    await assert.rejects(
      async () => {
        await authService.login({
          email: testEmail,
          password: bootstrapResult.tempPassword,
        });
      },
      (err) => {
        assert.equal(err.status, 401);
        return true;
      }
    );

    // New password logs in successfully with must_change_password: false
    const loginRes = await authService.login({
      email: testEmail,
      password: newPass,
    });
    assert.equal(loginRes.user.must_change_password, false);
  });
});
