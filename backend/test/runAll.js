import { spawnSync, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(backendDir, '.env') });

const testUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';

// 1. Reset and seed the TEST database
console.log(`[test:runner] Initializing isolated test database: ${testUrl}`);
try {
  execSync('npx prisma migrate reset --schema prisma/schema.prisma --force --skip-seed', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: testUrl, NODE_ENV: 'test' },
    stdio: 'inherit',
  });

  execSync('node prisma/seed/index.js', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: testUrl, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
  console.log(`[test:runner] Isolated test database ready.`);
} catch (e) {
  console.error(`[test:runner] Test database setup failed:`, e.message);
  process.exit(1);
}

// 2. Run backend test suite with DATABASE_URL pointing exclusively to test database
console.log(`[test:runner] Running test suite against isolated test database...`);
const result = spawnSync(process.execPath, [
  '--test',
  '--test-concurrency=1',
  'test/**/*.test.js'
], {
  cwd: backendDir,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: testUrl,
    DATABASE_URL_TEST: testUrl
  },
  stdio: 'inherit'
});

process.exit(result.status ?? 0);

