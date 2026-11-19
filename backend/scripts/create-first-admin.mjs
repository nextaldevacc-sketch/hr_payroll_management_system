#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import prisma from '../src/lib/prisma.js';
import authService from '../src/services/authService.js';
import companyService from '../src/services/companyService.js';
import { assertPasswordCompliant } from '@nextal/shared';
import { seedSystemData } from '../prisma/seed/systemData.js';

async function main() {
  const options = {
    type: { type: 'string', default: 'company' }, // 'company' or 'platform'
    role: { type: 'string' }, // 'COMPANY_ADMIN' or 'PLATFORM_ADMIN'
    email: { type: 'string', short: 'e' },
    company: { type: 'string', short: 'c' },
    'company-name': { type: 'string' },
    'company-name-ar': { type: 'string' },
    name: { type: 'string', default: 'System Administrator' },
    'trade-license': { type: 'string' },
    'mol-id': { type: 'string' },
    emirate: { type: 'string', default: 'Dubai' },
  };

  const { values, positionals } = parseArgs({ options, allowPositionals: true, strict: false });
  const email = values.email || positionals[0] || `admin.${Date.now()}@firstcorp.ae`;
  const companyName = values.company || values['company-name'] || positionals[1] || 'First Enterprise LLC';
  const companyNameAr = values['company-name-ar'] || companyName;
  const name = values.name || 'System Administrator';
  const tradeLicense = values['trade-license'] || `TL-${Date.now().toString().slice(-8)}`;
  const molId = values['mol-id'] || `MOL-${Date.now().toString().slice(-8)}`;
  const emirate = values.emirate || 'Dubai';
  const adminType = (values.role === 'PLATFORM_ADMIN' || values.type === 'platform') ? 'platform' : 'company';

  console.log('================================================================');
  console.log(' Nextal HR & Payroll — Sovereign First-Admin Bootstrap Tool');
  console.log(` Target Type  : ${adminType === 'platform' ? 'PLATFORM_ADMIN' : 'COMPANY_ADMIN'}`);
  console.log(` Admin Email  : ${email}`);
  if (adminType === 'company') {
    console.log(` Company Name : ${companyName} (${companyNameAr})`);
  }
  console.log('================================================================\n');

  try {
    // 1. Ensure system roles catalog exists
    const rolesCount = await prisma.$base().roles.count();
    if (rolesCount === 0) {
      console.log('Roles catalog is empty. Initializing canonical roles...');
      await seedSystemData(prisma.$base(), { forceReset: true });
    }

    if (adminType === 'platform') {
      const existing = await prisma.$base().users.findUnique({ where: { email } });
      if (existing) {
        console.error(`❌ User with email "${email}" already exists.`);
        process.exit(1);
      }

      // Generate cryptographically strong random compliant password
      const securePassword = 'Adm!' + crypto.randomBytes(6).toString('hex') + 'X8#';
      assertPasswordCompliant(securePassword, { email, name });
      const passwordHash = await authService.hashPassword(securePassword);

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
      console.log(`   User ID            : ${user.id}`);
      console.log(`   Email              : ${user.email}`);
      console.log(`   Temporary Password : ${securePassword}`);
      console.log('\n⚠️  IMPORTANT: Store this temporary password securely. It is printed ONCE and will not be displayed again.\n');
      process.exit(0);
    } else {
      const result = await companyService.createCompanyWithDefaults({
        name: companyName,
        name_ar: companyNameAr,
        trade_license_no: tradeLicense,
        emirate,
        mol_establishment_id: molId,
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
