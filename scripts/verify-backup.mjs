#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Nextal HR & Payroll — Backup Verification Script (verify-backup.mjs)
 * Restores the latest encrypted backup into an isolated scratch database
 * and executes full integrity assertions (check-integrity.mjs).
 */

console.log('================================================================');
console.log(' Nextal HR & Payroll — Production Backup Verification');
console.log('================================================================');

// 1. Locate latest encrypted backup
const backupDir = path.join(rootDir, 'backups', 'daily');
let targetBackup = process.argv[2];

if (!targetBackup) {
  if (!fs.existsSync(backupDir)) {
    console.error(`ERROR: Backup directory not found: ${backupDir}`);
    console.error('Run deploy/backup.sh first to produce an encrypted backup archive.');
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir)
    .filter((f) => f.endsWith('.enc'))
    .map((f) => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    console.error(`ERROR: No .enc backup files found in ${backupDir}`);
    process.exit(1);
  }

  targetBackup = path.join(backupDir, files[0].name);
}

console.log(`[Backup Verify] Target Backup Archive: ${targetBackup}`);

const passphrase = process.env.BACKUP_ENCRYPTION_PASSPHRASE || '3912d43de3b0cfba498ca8f6fb533472a90fda6ba508310d0f1f43496707d590';
const scratchDb = 'nextal_hr_backup_verify';
const scratchDbUrl = `postgresql://postgres:postgres@127.0.0.1:5432/${scratchDb}?schema=public`;

const tmpDir = path.join(rootDir, '.backup_verify_tmp');
if (fs.existsSync(tmpDir)) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
fs.mkdirSync(tmpDir, { recursive: true });

function decryptArchive(inputFile, outputFile, pass) {
  const encBuffer = fs.readFileSync(inputFile);
  const header = encBuffer.subarray(0, 8).toString('utf8');
  if (header !== 'Salted__') {
    throw new Error('Invalid backup archive format: missing OpenSSL Salted__ magic header');
  }
  const salt = encBuffer.subarray(8, 16);
  const ciphertext = encBuffer.subarray(16);
  const derived = crypto.pbkdf2Sync(pass, salt, 100000, 48, 'sha256');
  const key = derived.subarray(0, 32);
  const iv = derived.subarray(32, 48);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  fs.writeFileSync(outputFile, decrypted);
}

try {
  // 2. Decrypt backup archive
  console.log('[Backup Verify] Decrypting archive using AES-256-CBC PBKDF2 (100,000 iterations)...');
  const decryptedBundle = path.join(tmpDir, 'bundle.tar.gz');
  decryptArchive(targetBackup, decryptedBundle, passphrase);

  // 3. Unpack bundle
  console.log('[Backup Verify] Unpacking archive bundle...');
  execSync(`tar -xzf "${decryptedBundle}" -C "${tmpDir}"`, { stdio: 'inherit' });

  const dumpFiles = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.dump'));
  if (dumpFiles.length === 0) {
    throw new Error('No .dump file found inside decrypted archive bundle.');
  }
  const dumpFile = path.join(tmpDir, dumpFiles[0]);

  // Determine postgres container
  let pgContainer = 'nextal-postgres';
  try {
    const containers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
    if (containers.includes('nextal-postgres')) {
      pgContainer = 'nextal-postgres';
    } else if (containers.includes('nextal-postgres-prod')) {
      pgContainer = 'nextal-postgres-prod';
    }
  } catch (_) {}

  // 4. Create scratch database
  console.log(`[Backup Verify] Initializing isolated scratch database '${scratchDb}' on container '${pgContainer}'...`);
  try {
    execSync(`docker exec ${pgContainer} dropdb -U postgres --if-exists ${scratchDb}`, { stdio: 'ignore' });
  } catch (_) {}
  execSync(`docker exec ${pgContainer} createdb -U postgres ${scratchDb}`, { stdio: 'inherit' });

  // 5. Restore dump into scratch database
  console.log(`[Backup Verify] Restoring database dump into '${scratchDb}'...`);
  execSync(`docker exec -i ${pgContainer} pg_restore -U postgres -d ${scratchDb} --clean --if-exists --no-owner --no-privileges`, {
    input: fs.readFileSync(dumpFile),
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  // 6. Run check-integrity against restored scratch database
  console.log('[Backup Verify] Running check-integrity.mjs against restored database...');
  execSync('node scripts/check-integrity.mjs', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: scratchDbUrl,
      DATABASE_URL_TEST: scratchDbUrl,
    },
  });

  console.log('');
  console.log('================================================================');
  console.log(' BACKUP VERIFICATION PASSED: Database restored and 100% integral.');
  console.log('================================================================');
} catch (err) {
  console.error('');
  console.error('================================================================');
  console.error(' BACKUP VERIFICATION FAILED:', err.message);
  console.error('================================================================');
  process.exit(1);
} finally {
  // Cleanup scratch database and temporary files
  console.log('[Backup Verify] Cleaning up scratch database and decrypted files...');
  try {
    let pgContainer = 'nextal-postgres';
    try {
      const containers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
      if (containers.includes('nextal-postgres')) {
        pgContainer = 'nextal-postgres';
      } else if (containers.includes('nextal-postgres-prod')) {
        pgContainer = 'nextal-postgres-prod';
      }
    } catch (_) {}
    execSync(`docker exec ${pgContainer} dropdb -U postgres --if-exists ${scratchDb}`, { stdio: 'ignore' });
  } catch (_) {}
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
