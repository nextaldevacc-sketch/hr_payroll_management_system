import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Support execution from root, backend, or Docker container
const envPaths = [
  path.resolve(__dirname, '../backend/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];
for (const p of envPaths) {
  try {
    dotenv.config({ path: p });
  } catch {}
}

import { PrismaClient } from '@prisma/client';
import { seedSystemData } from '../backend/prisma/seed/systemData.js';

const prisma = new PrismaClient();

async function main() {
  const isDemo = process.env.SEED_MODE === 'demo';
  const isProd = process.env.NODE_ENV === 'production';
  const forceReset = process.argv.includes('--force-reset');

  if (isDemo && isProd) {
    console.error('========================================================================');
    console.error('[SECURITY BLOCK] Demo seeding is strictly forbidden in production.');
    console.error('========================================================================');
    process.exit(1);
  }

  if (isDemo) {
    console.error('========================================================================');
    console.error('[REFUSED] "npm run seed:system" only provisions canonical system roles and defaults.');
    console.error('Demo data cannot be seeded through seed:system. Use the test runner for demo data.');
    console.error('========================================================================');
    process.exit(1);
  }

  try {
    console.log('================================================================');
    console.log(' Nextal HR & Payroll — Clean System Seed (Production & Staging)');
    console.log(` Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(` Mode        : Non-destructive Canonical Roles Upsert`);
    console.log('================================================================');

    const rolesMap = await seedSystemData(prisma, { forceReset });
    console.log(`\n✅ System seed completed successfully:`);
    console.log(`  Roles verified: ${Object.keys(rolesMap).join(', ')}`);
    console.log(`  Database is ready for company initialization via "npm run setup:company".\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ System seed failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

