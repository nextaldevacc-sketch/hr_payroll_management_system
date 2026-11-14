import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../src/lib/prisma.js';
import authService from '../../src/services/authService.js';
import { requirePermission, requireRole } from '../../src/middleware/permissions.js';

describe('Part 8 Item 2: No-Role User Experience & Guard', () => {
  let company;
  let noRoleUser;
  const runId = Date.now();
  const noRoleEmail = `norole-${runId}@example.ae`;
  const password = 'Password123!';

  before(async () => {
    company = await prisma.$base().companies.create({
      data: {
        name: `No Role Test Company ${runId}`,
        trade_license_no: `TL-NOROLE-${runId}`,
        require_privileged_mfa: false,
      },
    });

    const passwordHash = await authService.hashPassword(password);

    // Create user with NO entries in user_roles
    noRoleUser = await prisma.$base().users.create({
      data: {
        email: noRoleEmail,
        password_hash: passwordHash,
        company_id: company.id,
        status: 'Active',
      },
    });
  });

  after(async () => {
    try {
      await prisma.$base().users.deleteMany({ where: { email: noRoleEmail } });
      await prisma.$base().companies.deleteMany({ where: { id: company.id } });
    } catch {}
  });

  it('1. User with no role has empty roles array and role is null, never default "EMPLOYEE"', async () => {
    const loginResult = await authService.login({ email: noRoleEmail, password });
    assert.equal(loginResult.user.email, noRoleEmail);
    assert.deepEqual(loginResult.user.roles, [], 'Roles array must be empty');
    assert.equal(loginResult.user.role, null, 'Single role must be null, never "EMPLOYEE"');
    assert.ok(loginResult.token, 'Must return JWT token');
  });

  it('2. requirePermission middleware rejects user with no roles with HTTP 403 NO_ROLE_ASSIGNED', () => {
    let statusCode = null;
    let jsonResponse = null;
    let nextCalled = false;

    const req = {
      user: { userId: noRoleUser.id, email: noRoleEmail, roles: [] },
      originalUrl: '/api/v1/employees',
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    const middleware = requirePermission('employees', 'view');
    middleware(req, res, next);

    assert.equal(nextCalled, false, 'next() must not be called');
    assert.equal(statusCode, 403);
    assert.equal(jsonResponse.code, 'NO_ROLE_ASSIGNED');
    assert.ok(jsonResponse.message.includes('No role assigned - contact your Company Admin'));
  });

  it('3. requireRole middleware rejects user with no roles with HTTP 403 NO_ROLE_ASSIGNED', () => {
    let statusCode = null;
    let jsonResponse = null;
    let nextCalled = false;

    const req = {
      user: { userId: noRoleUser.id, email: noRoleEmail, roles: [] },
      originalUrl: '/api/v1/payroll',
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    const middleware = requireRole('PAYROLL_OFFICER', 'COMPANY_ADMIN');
    middleware(req, res, next);

    assert.equal(nextCalled, false, 'next() must not be called');
    assert.equal(statusCode, 403);
    assert.equal(jsonResponse.code, 'NO_ROLE_ASSIGNED');
    assert.ok(jsonResponse.message.includes('No role assigned - contact your Company Admin'));
  });
});
