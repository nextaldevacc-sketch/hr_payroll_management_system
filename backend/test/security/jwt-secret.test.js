import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEnv } from '../../src/config/validateEnv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.resolve(__dirname, '../../src/server.js');

const validProdBaseEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'production_high_entropy_secret_key_at_least_32_characters_long_12345!',
  DOCUMENT_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  DATABASE_URL: 'postgresql://prod_user:StrongPass123!@db.internal:5432/nextal_prod?sslmode=require',
  COOKIE_SECURE: 'true',
  ALLOWED_ORIGIN: 'https://payroll.nextaltechnologies.com',
  ENABLE_JOBS: 'true',
  MAIL_MODE: 'disabled',
};

test('C2 Security: JWT_SECRET Enforcement and App Boot Refusal in Production', async (t) => {
  await t.test('validateEnv refuses missing JWT_SECRET in production', () => {
    const res = validateEnv({ ...validProdBaseEnv, JWT_SECRET: '' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((err) => err.toLowerCase().includes('jwt_secret is required')));
  });

  await t.test('validateEnv refuses short JWT_SECRET (< 32 chars) in production', () => {
    const res = validateEnv({ ...validProdBaseEnv, JWT_SECRET: 'short_secret_under_32_chars' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((err) => err.toLowerCase().includes('too short')));
  });

  await t.test('validateEnv refuses known default secret in production', () => {
    const defaultSecrets = [
      'nextal_super_secret_jwt_key_2026_uae',
      'super_secret_jwt_key_2026',
      'development_secret_key_not_for_prod',
      'your-jwt-secret-here',
      'nextal-secure-jwt-signing-secret-key-32-chars-min!',
      'nextal_jwt_secret_dev_key_2026',
    ];

    for (const secret of defaultSecrets) {
      const res = validateEnv({ ...validProdBaseEnv, JWT_SECRET: secret });
      assert.equal(res.valid, false, `Expected ${secret} to be rejected in production`);
      assert.ok(
        res.errors.some((err) => err.toLowerCase().includes('weak or development default')),
        `Expected default error for ${secret}`
      );
    }
  });

  await t.test('validateEnv requires JWT_SECRET in development mode', () => {
    const res = validateEnv({ NODE_ENV: 'development', JWT_SECRET: '' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((err) => err.toLowerCase().includes('jwt_secret is required')));
  });

  await t.test('app boot exits with non-zero exit code when JWT_SECRET is missing in production', () => {
    const env = {
      ...process.env,
      ...validProdBaseEnv,
      JWT_SECRET: '',
    };
    const result = spawnSync(process.execPath, [serverPath], {
      env,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.notEqual(result.status, 0, 'Process should exit with non-zero code');
    const combinedOutput = (result.stdout || '') + (result.stderr || '');
    assert.ok(
      combinedOutput.includes('JWT_SECRET') || combinedOutput.includes('Validation Failed'),
      'Output should mention JWT_SECRET failure'
    );
  });

  await t.test('app boot exits with non-zero exit code when JWT_SECRET is too short in production', () => {
    const env = {
      ...process.env,
      ...validProdBaseEnv,
      JWT_SECRET: 'short_key_under_32',
    };
    const result = spawnSync(process.execPath, [serverPath], {
      env,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.notEqual(result.status, 0, 'Process should exit with non-zero code');
    const combinedOutput = (result.stdout || '') + (result.stderr || '');
    assert.ok(
      combinedOutput.includes('JWT_SECRET is too short') || combinedOutput.includes('Validation Failed'),
      'Output should mention short JWT_SECRET'
    );
  });

  await t.test('app boot exits with non-zero exit code when JWT_SECRET is known default in production', () => {
    const env = {
      ...process.env,
      ...validProdBaseEnv,
      JWT_SECRET: 'nextal_super_secret_jwt_key_2026_uae',
    };
    const result = spawnSync(process.execPath, [serverPath], {
      env,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.notEqual(result.status, 0, 'Process should exit with non-zero code');
    const combinedOutput = (result.stdout || '') + (result.stderr || '');
    assert.ok(
      combinedOutput.includes('weak or development default') || combinedOutput.includes('Validation Failed'),
      'Output should mention weak/default JWT_SECRET'
    );
  });
});
