import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(backendDir, '.env') });

const testUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';

console.log(`[setupTestDb] Resetting isolated test database: ${testUrl}`);

try {
  // 1. Run Prisma migrate reset on TEST database only
  execSync('npx prisma migrate reset --schema prisma/schema.prisma --force --skip-seed', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: testUrl, NODE_ENV: 'test' },
    stdio: 'inherit',
  });

  // 2. Run seed against TEST database
  console.log(`[setupTestDb] Seeding test database...`);
  execSync('node prisma/seed/index.js', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: testUrl, NODE_ENV: 'test' },
    stdio: 'inherit',
  });

  console.log(`[setupTestDb] Test database initialized and seeded successfully.`);
} catch (err) {
  console.error(`[setupTestDb] Failed to initialize test database:`, err.message);
  process.exit(1);
}

