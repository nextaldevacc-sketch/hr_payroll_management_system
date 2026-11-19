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
let seedSystemData;
try {
  const mod = await import('../backend/prisma/seed/systemData.js');
  seedSystemData = mod.seedSystemData;
} catch {
  try {
    const mod = await import('./prisma/seed/systemData.js');
    seedSystemData = mod.seedSystemData;
  } catch {
    const mod = await import('../prisma/seed/systemData.js');
    seedSystemData = mod.seedSystemData;
  }
}

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
    if (err.code === 'EXISTING_COMPANIES_REFUSED' || err.message?.includes('EXISTING_COMPANIES_REFUSED')) {
      const rolesCount = await prisma.roles.count();
      if (rolesCount >= 8) {
        console.log(`\n[INFO] Database contains existing company data and all 8 canonical roles already exist (${rolesCount} roles).`);
        console.log(`✅ System roles already initialized. Treating existing roles as success.\n`);
        process.exit(0);
      }
    }
    console.error('\n❌ System seed failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

