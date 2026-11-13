import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import authService from '../src/services/authService.js';
import prisma from '../src/lib/prisma.js';

test('Password Hashing & Transparent Rehash (B3)', async (t) => {
  await t.test('hashPassword produces bcrypt hash with cost >= 12', async () => {
    const hash = await authService.hashPassword('MySecurePassword123!');
    assert.ok(hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$'));
    const match = hash.match(/^\$2[aby]?\$(\d+)\$/);
    assert.ok(match);
    assert.ok(parseInt(match[1], 10) >= 12);
  });

  await t.test('needsRehash correctly flags legacy cost hashes (< 12)', () => {
    // 10 rounds legacy hash
    const legacyHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6KA5B8G9d6X7i9Bv.';
    assert.equal(authService.needsRehash(legacyHash), true);

    // 12 rounds hash
    const modernHash = '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6KA5B8G9d6X7i9Bv.';
    assert.equal(authService.needsRehash(modernHash), false);

    // 14 rounds hash
    const highCostHash = '$2b$14$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6KA5B8G9d6X7i9Bv.';
    assert.equal(authService.needsRehash(highCostHash), false);
  });

  await t.test('login verifies legacy hash and transparently upgrades DB record to cost >= 12', async () => {
    const email = `rehash.test.${Date.now()}@example.com`;
    const password = 'LegacyPassword@2026!';
    // Create user with explicit cost 10
    const legacyHash = await bcrypt.hash(password, 10);
    assert.ok(legacyHash.includes('$10$'));

    const company = await prisma.$base().companies.findFirst();
    if (!company) return; // Skip if no DB in unit mode

    const user = await prisma.$base().users.create({
      data: {
        email,
        password_hash: legacyHash,
        company_id: company.id,
        status: 'Active',
      },
    });

    try {
      // Login with legacy hash
      const result = await authService.login({ email, password });
      assert.ok(result.token);

      // Check DB: password_hash should now be upgraded to >= 12
      const updatedUser = await prisma.$base().users.findUnique({ where: { id: user.id } });
      const match = updatedUser.password_hash.match(/^\$2[aby]?\$(\d+)\$/);
      assert.ok(match, 'Hash must be valid bcrypt');
      assert.ok(parseInt(match[1], 10) >= 12, `Expected rounds >= 12, got ${match[1]}`);

      // Verify second login succeeds with the upgraded hash
      const secondResult = await authService.login({ email, password });
      assert.ok(secondResult.token);
    } finally {
      await prisma.$base().users.delete({ where: { id: user.id } }).catch(() => {});
    }
  });
});

