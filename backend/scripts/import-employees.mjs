#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import prisma from '../src/lib/prisma.js';
import employeeImportService from '../src/services/employeeImportService.js';

async function main() {
  const options = {
    company: { type: 'string', short: 'c' },
    'company-id': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'credentials-file': { type: 'string', default: 'demo-credentials.txt' },
  };

  const { values, positionals } = parseArgs({ options, allowPositionals: true, strict: false });

  const filePath = positionals[0];
  const companyName = values.company;
  let companyId = values['company-id'];
  const dryRun = Boolean(values['dry-run']);
  const credentialsFile = values['credentials-file'] || 'demo-credentials.txt';

  if (!filePath || (!companyName && !companyId)) {
    console.log(`
Usage: node scripts/import-employees.mjs <file.csv|file.xlsx> --company <name> [--dry-run]
Options:
  -c, --company          Company Name (e.g. "Gulf Tech Logistics LLC")
      --company-id       Company ID (UUID)
      --dry-run          Validate only, do not write to database
      --credentials-file Output file for generated temporary passwords (default: demo-credentials.txt)

Example:
  node scripts/import-employees.mjs docs/samples/employee-import-sample.csv --company "Gulf Tech Logistics LLC" --dry-run
`);
    process.exit(1);
  }

  let fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    const candidatePaths = [
      path.resolve(__dirname, '../../', filePath),
      path.resolve(__dirname, '../', filePath),
      path.resolve('/app', filePath),
      path.resolve('/app/backend', filePath),
    ];
    for (const cand of candidatePaths) {
      if (fs.existsSync(cand)) {
        fullPath = cand;
        break;
      }
    }
  }

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    if (!companyId && companyName) {
      const comp = await prisma.$base().companies.findFirst({
        where: { name: { equals: companyName, mode: 'insensitive' } },
      });
      if (!comp) {
        console.error(`❌ Company "${companyName}" not found in database.`);
        process.exit(1);
      }
      companyId = comp.id;
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const filename = path.basename(fullPath);

    console.log(`\n--- Starting Employee Bulk Import ---`);
    console.log(`  File       : ${filename} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);
    console.log(`  Target Path: ${fullPath}`);
    console.log(`  Company ID : ${companyId}`);
    console.log(`  Mode       : ${dryRun ? 'DRY-RUN (Validation only)' : 'REAL (Transactional write)'}\n`);

    const result = await employeeImportService.processImport({
      buffer: fileBuffer,
      filename,
      companyId,
      dryRun,
    });

    if (result.errors && result.errors.length > 0) {
      console.log(`❌ Validation Failed: ${result.invalidRows} invalid row(s) out of ${result.totalRows} total row(s).\n`);
      console.log('Error Details:');
      for (const err of result.errors) {
        console.log(`  [Row ${err.row}] Field: "${err.field}" | Message: ${err.message} (Value: "${err.value || ''}")`);
      }
      process.exit(1);
    }

    if (dryRun) {
      console.log(`✅ DRY-RUN SUCCESSFUL: All ${result.validRows} row(s) are valid.`);
      console.log(`  No changes were made to the database.`);
      console.log(`  To execute real import, run without --dry-run.\n`);
      process.exit(0);
    }

    console.log(`✅ REAL IMPORT SUCCESSFUL:`);
    console.log(`  Imported Employees : ${result.importedCount}`);
    console.log(`  Created IDs        : ${result.createdEmployeeIds.join(', ')}`);

    if (result.credentials && result.credentials.length > 0) {
      const credText = result.credentials
        .map((c) => `EMPLOYEE | ${c.employee_code.padEnd(10)} | ${c.name.padEnd(25)} | ${c.email.padEnd(30)} | Password: ${c.tempPassword}`)
        .join('\n');
      fs.appendFileSync(path.resolve(process.cwd(), credentialsFile), `\n--- Bulk Import Logins (${new Date().toISOString()}) ---\n${credText}\n`);
      console.log(`  Credentials saved to: ${credentialsFile} (strictly gitignored)\n`);
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Import execution failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$base().$disconnect();
  }
}

main();
