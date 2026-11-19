#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

import prisma from '../backend/src/lib/prisma.js';
import authService from '../backend/src/services/authService.js';
import companyService from '../backend/src/services/companyService.js';
import { assertPasswordCompliant } from '../shared/src/utils/passwordPolicy.js';

async function main() {
  const options = {
    type: { type: 'string', default: 'company' }, // 'company' or 'platform'
    email: { type: 'string', short: 'e' },
    name: { type: 'string', default: 'System Administrator' },
    'company-name': { type: 'string', default: 'First Enterprise LLC' },
    'company-name-ar': { type: 'string', default: 'الشركة الأولى ذ.م.م' },
    'trade-license': { type: 'string' },
  };

  const { values } = parseArgs({ options, allowPositionals: true });
  const adminType = values.type;
  const email = values.email || process.argv[2] || `admin.${Date.now()}@firstcorp.ae`;
  const name = values.name;

  console.log('================================================================');
  console.log(' Nextal HR & Payroll — Sovereign First-Admin Bootstrap Tool');
  console.log(` Target Type  : ${adminType.toUpperCase()}`);
  console.log(` Admin Email  : ${email}`);
  console.log('================================================================\n');

  try {
    // 1. Ensure system roles catalog exists
    const rolesCount = await prisma.$base().roles.count();
    if (rolesCount === 0) {
      console.log('Roles catalog is empty. Initializing canonical roles...');
      const { seedSystemData } = await import('../backend/prisma/seed/systemData.js');
      await seedSystemData(prisma.$base(), { forceReset: true });
    }

    // 2. Generate cryptographically strong random password
    const securePassword = 'Adm!' + crypto.randomBytes(6).toString('hex') + 'X8#';
    assertPasswordCompliant(securePassword, { email, name });
    const passwordHash = await authService.hashPassword(securePassword);

    if (adminType === 'platform') {
      const existing = await prisma.$base().users.findUnique({ where: { email } });
      if (existing) {
        console.error(`❌ User with email "${email}" already exists.`);
        process.exit(1);
      }

      const user = await prisma.$base().users.create({
        data: {
          email,
          password_hash: passwordHash,
          is_platform_admin: true,
          status: 'Active',
          must_change_password: true,
        },
      });

      console.log('✅ Platform Administrator created successfully:');
      console.log(`   User ID     : ${user.id}`);
      console.log(`   Email       : ${user.email}`);
      console.log(`   Temporary Password : ${securePassword}`);
      console.log('\n⚠️  IMPORTANT: Store this temporary password securely. It is printed ONCE and will not be displayed again.\n');
      process.exit(0);
    } else {
      const companyName = values['company-name'];
      const companyNameAr = values['company-name-ar'];
      const tradeLicense = values['trade-license'] || `TL-${Date.now()}`;

      const result = await companyService.createCompanyWithDefaults({
        name: companyName,
        name_ar: companyNameAr,
        trade_license_no: tradeLicense,
        admin_email: email,
        admin_name: name,
      });

      console.log('✅ Initial Company & Administrator created successfully:');
      console.log(`   Company ID         : ${result.company.id}`);
      console.log(`   Company Name       : ${result.company.name} / ${result.company.name_ar}`);
      console.log(`   Admin Email        : ${result.adminUser.email}`);
      console.log(`   Temporary Password : ${result.tempPassword}`);
      console.log('\n⚠️  IMPORTANT: Store this temporary password securely. It is printed ONCE and will not be displayed again.\n');
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Bootstrap failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$base().$disconnect();
  }
}

main();
