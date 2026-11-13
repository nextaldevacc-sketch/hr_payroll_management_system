import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/config/validateEnv.js';

test('Production Environment Validation (B2 Requirements)', async (t) => {
  const baseValidProdEnv = {
    NODE_ENV: 'production',
    JWT_SECRET: 'a_very_strong_production_jwt_secret_with_sufficient_entropy_64_bytes!',
    DOCUMENT_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://nextal_prod_user:StrongProdPass123!@db.internal:5432/nextal_prod?sslmode=require',
    COOKIE_SECURE: 'true',
    ALLOWED_ORIGIN: 'https://hr.apextech.ae',
    ENABLE_JOBS: 'true',
    SMTP_HOST: 'smtp.mailgun.org',
    SMTP_PORT: '587',
    SMTP_USER: 'postmaster@apextech.ae',
    SMTP_PASS: 'secret_smtp_pass',
    MAIL_FROM: 'noreply@apextech.ae',
  };

  await t.test('passes with fully compliant production environment', () => {
    const res = validateEnv(baseValidProdEnv);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
  });

  await t.test('refuses start if JWT_SECRET is missing', () => {
    const env = { ...baseValidProdEnv, JWT_SECRET: '' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('JWT_SECRET is required')));
  });

  await t.test('refuses start if JWT_SECRET is too short (< 32 chars)', () => {
    const env = { ...baseValidProdEnv, JWT_SECRET: 'short_secret_under_32' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('JWT_SECRET is too short')));
  });

  await t.test('refuses start if JWT_SECRET uses weak default/dictionary value', () => {
    const env = { ...baseValidProdEnv, JWT_SECRET: 'super_secret_jwt_key_2026_default_template_dev' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('weak or development default')));
  });

  await t.test('refuses start if DOCUMENT_ENCRYPTION_KEY is missing in production', () => {
    const env = { ...baseValidProdEnv, DOCUMENT_ENCRYPTION_KEY: '' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('DOCUMENT_ENCRYPTION_KEY is required in production')));
  });

  await t.test('refuses start if DOCUMENT_ENCRYPTION_KEY uses dev fallback key', () => {
    const env = { ...baseValidProdEnv, DOCUMENT_ENCRYPTION_KEY: 'nextal_doc_encryption_key_32_b!' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('dev-only fallback key in production')));
  });

  await t.test('refuses start if DATABASE_URL points at localhost default creds in production', () => {
    const env = { ...baseValidProdEnv, DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nextal_db' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('localhost default credentials')));
  });

  await t.test('refuses start if COOKIE_SECURE is not true in production', () => {
    const env = { ...baseValidProdEnv, COOKIE_SECURE: 'false' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("COOKIE_SECURE must be explicitly set to 'true'")));
  });

  await t.test('refuses start if ALLOWED_ORIGIN is wildcard * in production', () => {
    const env = { ...baseValidProdEnv, ALLOWED_ORIGIN: '*' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("cannot be wildcard '*'")));
  });

  await t.test('refuses start if ALLOWED_ORIGIN is missing in production', () => {
    const env = { ...baseValidProdEnv, ALLOWED_ORIGIN: '' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('ALLOWED_ORIGIN is required')));
  });

  await t.test('refuses start if ENABLE_JOBS is not explicitly set in production', () => {
    const env = { ...baseValidProdEnv, ENABLE_JOBS: undefined };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("ENABLE_JOBS must be explicitly set to 'true' or 'false'")));
  });

  await t.test('refuses start in production if SMTP settings missing without MAIL_MODE=disabled', () => {
    const env = { ...baseValidProdEnv, SMTP_HOST: '' };
    const res = validateEnv(env);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('Production email delivery requires SMTP settings')));
  });

  await t.test('passes in production without SMTP settings if MAIL_MODE=disabled is explicitly set', () => {
    const env = { ...baseValidProdEnv, SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', MAIL_MODE: 'disabled' };
    const res = validateEnv(env);
    assert.equal(res.valid, true);
    assert.ok(res.warnings.some((w) => w.includes('MAIL_MODE is set to disabled')));
  });
});

