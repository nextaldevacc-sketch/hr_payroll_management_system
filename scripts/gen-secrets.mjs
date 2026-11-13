#!/usr/bin/env node
import crypto from 'crypto';

/**
 * Nextal HR & Payroll — Cryptographic Secret Generator
 * Generates cryptographically secure, high-entropy random keys for production deployment.
 */

function generateHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generatePassword(length = 32) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*(-_=+)';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

const jwtSecret = generateHex(32); // 64 hex characters (256-bit entropy)
const docEncryptionKey = generateHex(32); // 64 hex characters (256-bit AES key)
const dbPassword = generateHex(24); // 48 hex characters (clean, URL-safe database password)
const backupPassphrase = generateHex(32); // 64 hex characters

console.log('================================================================');
console.log(' Nextal HR & Payroll — Production Secrets Generated');
console.log('================================================================');
console.log('# Copy and paste the following into your .env.production file:');
console.log('');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`DOCUMENT_ENCRYPTION_KEY=${docEncryptionKey}`);
console.log(`POSTGRES_PASSWORD=${dbPassword}`);
console.log(`BACKUP_ENCRYPTION_PASSPHRASE=${backupPassphrase}`);
console.log('');
console.log('================================================================');
console.log(' IMPORTANT SECURITY NOTICE:');
console.log(' Store DOCUMENT_ENCRYPTION_KEY and BACKUP_ENCRYPTION_PASSPHRASE in a');
console.log(' secure secondary password manager / vault outside the VPS.');
console.log(' If DOCUMENT_ENCRYPTION_KEY is lost, stored encrypted employee documents');
console.log(' CANNOT be decrypted or recovered.');
console.log('================================================================');

