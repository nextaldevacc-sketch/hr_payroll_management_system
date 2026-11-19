import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSeederSafety, getDatabaseName, main } from '../../prisma/seed/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../..');
const seedScriptPath = path.resolve(backendDir, 'prisma/seed/index.js');

test('Security Guard: Destructive Demo Seeder Production Protection (Step 1)', async (t) => {
  await t.test('1. getDatabaseName correctly extracts db name from URLs and env vars', () => {
    assert.equal(getDatabaseName('postgresql://usr:pwd@localhost:5432/nextal_hr_prod?schema=public'), 'nextal_hr_prod');
    assert.equal(getDatabaseName('postgresql://usr:pwd@localhost:5432/my_db'), 'my_db');
    assert.equal(getDatabaseName('postgres://localhost/test_db?ssl=true'), 'test_db');
    assert.equal(getDatabaseName(undefined, 'custom_prod'), 'custom_prod');
    assert.equal(getDatabaseName('', 'env_db_prod'), 'env_db_prod');
  });

  await t.test('2. validateSeederSafety blocks execution when NODE_ENV is production', () => {
    const res = validateSeederSafety({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public',
    });
    assert.equal(res.allowed, false);
    assert.equal(res.isProdEnv, true);
    assert.match(res.message, /Destructive demo seeder cannot run against production database/);
    assert.match(res.message, /NODE_ENV is 'production'/);
  });

  await t.test('3. validateSeederSafety blocks execution when DB name ends with _prod regardless of NODE_ENV', () => {
    const res = validateSeederSafety({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://nextal_app:secret@postgres:5432/nextal_hr_prod?schema=public',
    });
    assert.equal(res.allowed, false);
    assert.equal(res.isProdDb, true);
    assert.match(res.message, /Destructive demo seeder cannot run against production database/);
    assert.match(res.message, /database name 'nextal_hr_prod' ends with '_prod'/);
  });

  await t.test('4. validateSeederSafety blocks execution when POSTGRES_DB ends with _prod', () => {
    const res = validateSeederSafety({
      NODE_ENV: 'development',
      POSTGRES_DB: 'tenant_db_prod',
    });
    assert.equal(res.allowed, false);
    assert.equal(res.isProdDb, true);
    assert.match(res.message, /Destructive demo seeder cannot run against production database/);
    assert.match(res.message, /database name 'tenant_db_prod' ends with '_prod'/);
  });

  await t.test('5. validateSeederSafety blocks when both NODE_ENV=production and DB ends with _prod', () => {
    const res = validateSeederSafety({
      NODE_ENV: 'production',
      POSTGRES_DB: 'nextal_hr_prod',
    });
    assert.equal(res.allowed, false);
    assert.equal(res.isProdEnv, true);
    assert.equal(res.isProdDb, true);
    assert.match(res.message, /NODE_ENV is 'production' and database name 'nextal_hr_prod' ends with '_prod'/);
  });

  await t.test('6. validateSeederSafety allows execution on test or development databases', () => {
    const testRes = validateSeederSafety({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public',
    });
    assert.equal(testRes.allowed, true);

    const devRes = validateSeederSafety({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_dev?schema=public',
    });
    assert.equal(devRes.allowed, true);
  });

  await t.test('7. main() throws error with code PRODUCTION_DEMO_SEED_FORBIDDEN in throwOnError mode', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await assert.rejects(
        async () => {
          await main({ throwOnError: true });
        },
        (err) => {
          assert.equal(err.code, 'PRODUCTION_DEMO_SEED_FORBIDDEN');
          assert.match(err.message, /Destructive demo seeder cannot run against production database/);
          return true;
        }
      );
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  await t.test('8. CLI: seed/index.js exits with code 1 when NODE_ENV=production', () => {
    const res = spawnSync(process.execPath, [seedScriptPath], {
      cwd: backendDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public',
      },
      encoding: 'utf8',
    });
    assert.equal(res.status, 1, 'Process must exit with non-zero status code 1');
    const combinedOutput = `${res.stdout || ''}\n${res.stderr || ''}`;
    assert.match(combinedOutput, /\[CRITICAL SECURITY BLOCK\] Destructive demo seeder cannot run against production database/);
  });

  await t.test('9. CLI: seed/index.js exits with code 1 when DB name ends with _prod', () => {
    const res = spawnSync(process.execPath, [seedScriptPath], {
      cwd: backendDir,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/company_prod?schema=public',
      },
      encoding: 'utf8',
    });
    assert.equal(res.status, 1, 'Process must exit with non-zero status code 1');
    const combinedOutput = `${res.stdout || ''}\n${res.stderr || ''}`;
    assert.match(combinedOutput, /\[CRITICAL SECURITY BLOCK\] Destructive demo seeder cannot run against production database/);
    assert.match(combinedOutput, /database name 'company_prod' ends with '_prod'/);
  });
});
