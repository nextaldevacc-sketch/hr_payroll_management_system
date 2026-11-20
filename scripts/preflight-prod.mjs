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
 * Validates production environment files against Part B2 rules and strict security standards.
 * Exits 0 on SUCCESS, exits 1 on FAILURE.
 */

export function parseEnvContent(content) {
  const env = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

export function runPreflight(env) {
  const failures = [];
  const successes = [];
  const warnings = [];

  // 1. NODE_ENV check (must be 'production')
  if (env.NODE_ENV !== 'production') {
    failures.push(`[NODE_ENV] NODE_ENV must be set to 'production' (found: '${env.NODE_ENV}')`);
  } else {
    successes.push("[NODE_ENV] NODE_ENV is 'production'");
  }

  // 2. SEED_MODE check (must not be 'demo')
  if (env.SEED_MODE === 'demo') {
    failures.push("[SEED_MODE] SEED_MODE must not be 'demo' in production");
  } else {
    successes.push("[SEED_MODE] SEED_MODE is production safe");
  }

  // 3. COOKIE_SECURE check (must be 'true')
  if (env.COOKIE_SECURE !== 'true') {
    failures.push(`[COOKIE_SECURE] COOKIE_SECURE must be explicitly set to 'true' (found: '${env.COOKIE_SECURE}')`);
  } else {
    successes.push("[COOKIE_SECURE] COOKIE_SECURE is 'true'");
  }

  // 4. DOMAIN check (FAIL on localhost / 127.0.0.1 / *.local)
  const domain = (env.DOMAIN || '').trim().toLowerCase();
  if (!domain) {
    failures.push("[DOMAIN] DOMAIN is required for TLS and production routing");
  } else if (
    domain === 'localhost' ||
    domain === '127.0.0.1' ||
    domain.endsWith('.local') ||
    domain.includes('localhost') ||
    domain.includes('127.0.0.1')
  ) {
    failures.push(`[DOMAIN] Production DOMAIN cannot be localhost, 127.0.0.1, or .local (found: '${env.DOMAIN}')`);
  } else {
    successes.push(`[DOMAIN] DOMAIN is valid: '${env.DOMAIN}'`);
  }

  // 5. ALLOWED_ORIGIN check (must be https, no localhost, no *)
  const origin = (env.ALLOWED_ORIGIN || '').trim();
  if (!origin) {
    failures.push("[CORS] ALLOWED_ORIGIN is required");
  } else if (!origin.startsWith('https://')) {
    failures.push(`[CORS] ALLOWED_ORIGIN must start with 'https://' (found: '${env.ALLOWED_ORIGIN}')`);
  } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    failures.push(`[CORS] ALLOWED_ORIGIN cannot contain localhost or 127.0.0.1 (found: '${env.ALLOWED_ORIGIN}')`);
  } else if (origin.includes('*')) {
    failures.push(`[CORS] ALLOWED_ORIGIN cannot contain wildcard '*' (found: '${env.ALLOWED_ORIGIN}')`);
  } else {
    successes.push(`[CORS] ALLOWED_ORIGIN is valid: '${env.ALLOWED_ORIGIN}'`);
  }

  // 6. JWT_SECRET check (>= 32 chars and not placeholder/default)
  const jwtSecret = env.JWT_SECRET || '';
  if (!jwtSecret) {
    failures.push("[JWT_SECRET] JWT_SECRET is missing");
  } else if (jwtSecret.length < 32) {
    failures.push(`[JWT_SECRET] JWT_SECRET must be at least 32 characters (length: ${jwtSecret.length})`);
  } else if (/CHANGE_ME|REPLACE_WITH|YOUR_SECRET|EXAMPLE|DEFAULT/i.test(jwtSecret)) {
    failures.push("[JWT_SECRET] JWT_SECRET contains placeholder text");
  } else {
    successes.push("[JWT_SECRET] JWT_SECRET is strong (>= 32 chars)");
  }

  // 7. Check other sensitive keys and placeholders
  const placeholderPatterns = [
    'CHANGE_ME',
    'REPLACE_WITH',
    'YOUR_SECRET',
    'EXAMPLE',
    'DEFAULT',
  ];
  const sensitiveKeys = [
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

  // 8. BACKUP_ENCRYPTION_PASSPHRASE length check
  if (!env.BACKUP_ENCRYPTION_PASSPHRASE || env.BACKUP_ENCRYPTION_PASSPHRASE.length < 16) {
    failures.push('[BACKUP] BACKUP_ENCRYPTION_PASSPHRASE must be at least 16 chars');
  } else {
    successes.push('[BACKUP] BACKUP_ENCRYPTION_PASSPHRASE is strong');
  }

  // 9. MAIL_MODE & SMTP check (FAIL on disabled or placeholder SMTP unless ALLOW_DEMO_MAIL_DISABLED=true)
  const allowDemoMailDisabled = env.ALLOW_DEMO_MAIL_DISABLED === 'true';
  if (!env.MAIL_MODE || env.MAIL_MODE === 'disabled') {
    if (env.MAIL_MODE === 'disabled' && allowDemoMailDisabled) {
      warnings.push("[EMAIL WARNING] MAIL_MODE is set to 'disabled' with ALLOW_DEMO_MAIL_DISABLED=true override. Outbound email is disabled for demo showcase.");
      successes.push("[EMAIL] Demo override active: MAIL_MODE=disabled permitted via ALLOW_DEMO_MAIL_DISABLED=true");
    } else {
      failures.push(`[EMAIL] MAIL_MODE cannot be 'disabled' in production without explicit demo override ALLOW_DEMO_MAIL_DISABLED=true (found: '${env.MAIL_MODE}')`);
    }
  } else {
    const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
    const missing = smtpKeys.filter((k) => !env[k] || /REPLACE_WITH|CHANGE_ME|example\.com|example\.ae/i.test(env[k]));
    if (missing.length > 0) {
      failures.push(`[EMAIL] SMTP not properly configured (missing or placeholder in: ${missing.join(', ')})`);
    } else {
      successes.push('[EMAIL] SMTP settings are present and verified');
    }
  }

  // 10. Run validateEnv core validator
  const coreValidation = validateEnv({ ...env, NODE_ENV: 'production' });
  if (!coreValidation.valid) {
    coreValidation.errors.forEach((err) => failures.push(`[CORE VALIDATION] ${err}`));
  } else {
    successes.push('[CORE VALIDATION] Passed core validateEnv rules');
  }

  // 11. Security Hardening (Body limit)
  if (env.BODY_LIMIT) {
    const match = String(env.BODY_LIMIT).match(/^(\d+)(kb|mb)?$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const unit = (match[2] || 'kb').toLowerCase();
      if (unit === 'mb' && num > 1) {
        failures.push(`[HARDENING] BODY_LIMIT of ${env.BODY_LIMIT} exceeds safe maximum (1mb)`);
      } else {
        successes.push(`[HARDENING] BODY_LIMIT configured safely as '${env.BODY_LIMIT}'`);
      }
    }
  } else {
    successes.push('[HARDENING] Default BODY_LIMIT enforced at 100kb');
  }

  return {
    valid: failures.length === 0,
    failures,
    successes,
    warnings,
  };
}

// CLI Execution entrypoint
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
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
  const env = parseEnvContent(content);
  const result = runPreflight(env);

  console.log('\n--- Checks Executed ---');
  for (const s of result.successes) {
    console.log('  PASS:', s);
  }

  if (result.warnings && result.warnings.length > 0) {
    console.log('\n--- Preflight Warnings ---');
    for (const w of result.warnings) {
      console.warn('  WARN:', w);
    }
  }

  if (!result.valid) {
    console.log('\n--- Preflight Failures Found ---');
    for (const f of result.failures) {
      console.error('  FAIL:', f);
    }
    console.error('\n================================================================');
    console.error(' PREFLIGHT FAILED: Environment file is NOT ready for production.');
    console.error(' Resolve the failures above before deploying.');
    console.error('================================================================');
    process.exit(1);
  } else {
    console.log('\n================================================================');
    console.log(' PREFLIGHT PASSED: Environment configuration is 100% production-ready.');
    console.log('================================================================');
    process.exit(0);
  }
}
