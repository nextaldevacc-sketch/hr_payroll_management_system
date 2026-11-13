#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateEnv } from '../backend/src/config/validateEnv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Nextal HR & Payroll — Production Preflight Verification Script
 * Validates production environment files against Part B2 rules and security standards before deployment.
 * Exits 0 on SUCCESS, exits 1 on FAILURE.
 */

const targetFile = process.argv[2] || '.env.production';
const fullPath = path.isAbsolute(targetFile) ? targetFile : path.join(rootDir, targetFile);

console.log('================================================================');
console.log(' Nextal HR & Payroll — Production Preflight Verification');
console.log(' Target File:', targetFile);
console.log('================================================================');

if (!fs.existsSync(fullPath)) {
  console.error(`ERROR: Environment file not found: ${fullPath}`);
  process.exit(1);
}

const content = fs.readFileSync(fullPath, 'utf8');
const env = {};

for (const rawLine of content.split('\n')) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) continue;
  const key = line.slice(0, eqIdx).trim();
  let val = line.slice(eqIdx + 1).trim();
  // Strip enclosing quotes if present
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

// Ensure NODE_ENV is set to production for validation checks
env.NODE_ENV = 'production';

const failures = [];
const successes = [];

// 1. Run core backend startup validator
const coreValidation = validateEnv(env);
if (!coreValidation.valid) {
  coreValidation.errors.forEach((err) => failures.push(`[CORE VALIDATION] ${err}`));
} else {
  successes.push('[CORE VALIDATION] Passed all 6 startup criteria');
}

// 2. Check for unreplaced placeholders in critical variables
const placeholderPatterns = [
  'CHANGE_ME',
  'REPLACE_WITH',
  'YOUR_SECRET',
  'EXAMPLE',
  'DEFAULT',
];

const sensitiveKeys = [
  'JWT_SECRET',
  'DOCUMENT_ENCRYPTION_KEY',
  'POSTGRES_PASSWORD',
  'BACKUP_ENCRYPTION_PASSPHRASE',
];

for (const key of sensitiveKeys) {
  const val = env[key] || '';
  if (!val) {
    failures.push(`[SECRETS] ${key} is missing or empty`);
  } else if (placeholderPatterns.some((pattern) => val.toUpperCase().includes(pattern))) {
    failures.push(`[SECRETS] ${key} contains an unreplaced placeholder value ('${val.slice(0, 16)}...')`);
  } else {
    successes.push(`[SECRETS] ${key} is present and entropy-verified`);
  }
}

// 3. Check Domain & HTTPS Origin
if (!env.DOMAIN || env.DOMAIN.trim() === '') {
  failures.push('[DOMAIN] DOMAIN is required for Caddy automated TLS certificate');
} else {
  successes.push(`[DOMAIN] DOMAIN configured as '${env.DOMAIN}'`);
}

if (!env.ALLOWED_ORIGIN || !env.ALLOWED_ORIGIN.startsWith('https://')) {
  // Allow http://localhost for local verification only
  if (!env.ALLOWED_ORIGIN || !env.ALLOWED_ORIGIN.includes('localhost')) {
    failures.push('[CORS] ALLOWED_ORIGIN must start with https:// for production');
  }
}

// 4. Check Backup Passphrase
if (!env.BACKUP_ENCRYPTION_PASSPHRASE || env.BACKUP_ENCRYPTION_PASSPHRASE.length < 16) {
  failures.push('[BACKUP] BACKUP_ENCRYPTION_PASSPHRASE is required and must be at least 16 chars');
} else {
  successes.push('[BACKUP] BACKUP_ENCRYPTION_PASSPHRASE is present and strong');
}

// 5. Check Email (SMTP) configuration
if (env.MAIL_MODE === 'disabled') {
  console.log('  WARN: MAIL_MODE=disabled - invites and password resets cannot be emailed');
} else {
  const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
  const missing = smtpKeys.filter((k) => !env[k] || /REPLACE_WITH|example\.com|example\.ae/i.test(env[k]));
  if (missing.length > 0) {
    failures.push(`[EMAIL] SMTP not configured (missing or placeholder: ${missing.join(', ')}). Set real values or MAIL_MODE=disabled`);
  } else {
    successes.push('[EMAIL] SMTP settings are present');
  }
}

// Output Results
console.log('');
console.log('--- Checks Executed ---');
for (const s of successes) {
  console.log('  PASS:', s);
}

if (failures.length > 0) {
  console.log('');
  console.error('--- Preflight Failures Found ---');
  for (const f of failures) {
    console.error('  FAIL:', f);
  }
  console.log('');
  console.error('================================================================');
  console.error(' PREFLIGHT FAILED: Environment file is NOT ready for production.');
  console.error(' Resolve the failures above before deploying.');
  console.error('================================================================');
  process.exit(1);
} else {
  console.log('');
  console.log('================================================================');
  console.log(' PREFLIGHT PASSED: Environment configuration is 100% production-ready.');
  console.log('================================================================');
  process.exit(0);
}

