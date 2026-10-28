import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasSalaryAccess,
  hasSensitiveIdAccess,
  deepSanitize,
  FORBIDDEN_SALARY_BANK_KEYS,
} from '../../src/serializers/index.js';

describe('Unit Tests: Serializers & Salary Access Control', () => {
  it('hasSalaryAccess: strictly allows only the 4 statutory salary roles', () => {
    assert.equal(hasSalaryAccess({ roles: ['HR_MANAGER'] }), true);
    assert.equal(hasSalaryAccess({ roles: ['PAYROLL_OFFICER'] }), true);
    assert.equal(hasSalaryAccess({ roles: ['GM'] }), true);
    assert.equal(hasSalaryAccess({ roles: ['FINANCE'] }), true);

    // Forbidden roles
    assert.equal(hasSalaryAccess({ roles: ['EMPLOYEE'] }), false);
    assert.equal(hasSalaryAccess({ roles: ['DEPT_MANAGER'] }), false);
    assert.equal(hasSalaryAccess({ roles: ['HR_OFFICER'] }), false);
    assert.equal(hasSalaryAccess({ roles: ['COMPANY_ADMIN'] }), false);
    assert.equal(hasSalaryAccess({ isPlatformAdmin: true, roles: ['PLATFORM_ADMIN'] }), false);
    assert.equal(hasSalaryAccess(null), false);
  });

  it('hasSensitiveIdAccess: allows HR roles and Company Admin, blocks others', () => {
    assert.equal(hasSensitiveIdAccess({ roles: ['HR_OFFICER'] }), true);
    assert.equal(hasSensitiveIdAccess({ roles: ['HR_MANAGER'] }), true);
    assert.equal(hasSensitiveIdAccess({ roles: ['COMPANY_ADMIN'] }), true);

    assert.equal(hasSensitiveIdAccess({ roles: ['EMPLOYEE'] }), false);
    assert.equal(hasSensitiveIdAccess({ roles: ['DEPT_MANAGER'] }), false);
    assert.equal(hasSensitiveIdAccess({ roles: ['FINANCE'] }), false);
  });

  it('deepSanitize: removes all forbidden salary and bank keys recursively', () => {
    const rawPayload = {
      id: 'emp-1',
      name: 'Test Employee',
      contracts: [
        {
          id: 'c-1',
          basic: 5000,
          housing: 2500,
          gross: 7500,
          job: { title: 'Developer' },
        },
      ],
      bank_accounts: [
        {
          id: 'b-1',
          iban: 'AE123456789012345678901',
          routing_code: 'ENBD001',
        },
      ],
    };

    const sanitized = deepSanitize(rawPayload);
    assert.equal(sanitized.id, 'emp-1');
    assert.equal(sanitized.name, 'Test Employee');
    assert.equal(sanitized.contracts[0].basic, undefined);
    assert.equal(sanitized.contracts[0].housing, undefined);
    assert.equal(sanitized.contracts[0].gross, undefined);
    assert.equal(sanitized.contracts[0].job.title, 'Developer');
  });
});
