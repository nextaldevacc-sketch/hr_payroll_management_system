import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

import prisma from '../backend/src/lib/prisma.js';
import companyService from '../backend/src/services/companyService.js';

async function main() {
  const options = {
    name: { type: 'string', short: 'n' },
    'name-ar': { type: 'string' },
    'trade-license': { type: 'string', short: 't' },
    'trade-licence': { type: 'string' },
    'admin-email': { type: 'string', short: 'e' },
    'admin-name': { type: 'string', default: 'Company Administrator' },
    'mol-id': { type: 'string', short: 'm' },
    emirate: { type: 'string', default: 'Dubai' },
  };

  const { values } = parseArgs({ options, allowPositionals: true });

  const name = values.name || process.argv[2];
  const nameAr = values['name-ar'] || name;
  const tradeLicense = values['trade-license'] || values['trade-licence'] || process.argv[3];
  const adminEmail = values['admin-email'] || process.argv[4];
  const adminName = values['admin-name'] || 'Company Administrator';
  const molId = values['mol-id'] || `MOL-${Date.now()}`;
  const emirate = values.emirate || 'Dubai';

  if (!name || !tradeLicense || !adminEmail) {
    console.log(`
Usage: npm run setup:company -- [options]
Options:
  -n, --name          Company English Name (required)
      --name-ar       Company Arabic Name (optional)
  -t, --trade-license Trade License Number (required)
  -e, --admin-email   Company Admin Work Email (required)
      --admin-name    Company Admin Full Name (optional)
  -m, --mol-id        MOHRE / MOL Establishment ID (optional)
      --emirate       UAE Emirate (default: Dubai)

Example:
  npm run setup:company -- -n "Apex Global Technologies LLC" --name-ar "شركة أبيكس للتكنولوجيا العالمية ذ.م.م" -t "TL-APEX-7777" -e "admin@apextech.ae"
`);
    process.exit(1);
  }

  try {
    // 0. Verify system roles catalog before attempting provisioning
    const rolesCount = await prisma.$base().roles.count();
    if (rolesCount === 0) {
      console.error('\n❌ ERROR: System roles catalog is empty.');
      console.error('Fresh databases must be initialized with canonical roles before running setup:company.');
      console.error('Please run: npm run seed:system\n');
      process.exit(1);
    }
    const adminRole = await prisma.$base().roles.findUnique({ where: { code: 'COMPANY_ADMIN' } });
    if (!adminRole) {
      console.error('\n❌ ERROR: Required system role "COMPANY_ADMIN" is missing from the database.');
      console.error('Please run: npm run seed:system\n');
      process.exit(1);
    }

    console.log(`\nProvisioning company: "${name}" (${nameAr})...`);
    const result = await companyService.createCompanyWithDefaults({
      name,
      name_ar: nameAr,
      trade_license_no: tradeLicense,
      emirate,
      mol_establishment_id: molId,
      admin_email: adminEmail,
      admin_name: adminName,
    });

    console.log('✅ Company successfully provisioned with UAE defaults:');
    console.log(`  Company ID         : ${result.company.id}`);
    console.log(`  Name               : ${result.company.name} / ${result.company.name_ar}`);
    console.log(`  Trade License      : ${result.company.trade_license_no}`);
    console.log(`  Admin User         : ${result.adminUser.email} (Status: ${result.adminUser.status})`);
    console.log(`  Temporary Password : ${result.tempPassword}`);
    console.log(`  Invite URL         : ${result.inviteUrl || `/login?tab=invite&token=${result.inviteToken}`}\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create company:', err.message);
    process.exit(1);
  } finally {
    await prisma.$base().$disconnect();
  }
}

main();

