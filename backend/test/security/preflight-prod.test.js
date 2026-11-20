import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runPreflight } from '../../../scripts/preflight-prod.mjs';

describe('SEC-PREFLIGHT: Production Preflight Hardening Validation', () => {
  const validProductionEnv = {
    NODE_ENV: 'production',
    SEED_MODE: 'none',
    COOKIE_SECURE: 'true',
    DOMAIN: 'payroll.emirateslogistics.ae',
    ALLOWED_ORIGIN: 'https://payroll.emirateslogistics.ae',
    JWT_SECRET: '81b1648a5f3a277f196e70f505f0432c9c6838c45321307349a48e48f2a9e871',
    DOCUMENT_ENCRYPTION_KEY: '1e2b466375d1e650296955d67eacf05960d0eac68db6fda39a65efb0cfaf1b76',
    POSTGRES_PASSWORD: 'f5984c03d09a24446e121516e5ca939a888c3a5b',
    BACKUP_ENCRYPTION_PASSPHRASE: '3912d43de3b0cfba498ca8f6fb533472a90fda6ba508310d0f1f43496707d590',
    MAIL_MODE: 'smtp',
    SMTP_HOST: 'smtp.sendgrid.net',
    SMTP_PORT: '587',
    SMTP_USER: 'apikey',
    SMTP_PASS: 'SG.some_real_secret_token_123456789',
    MAIL_FROM: 'noreply@emirateslogistics.ae',
    DATABASE_URL: 'postgresql://nextal_app:f5984c03d09a24446e121516e5ca939a888c3a5b@postgres:5432/nextal_hr_prod?schema=public',
    ENABLE_JOBS: 'true',
  };

  it('1. PASS: passes with fully compliant production environment', () => {
    const res = runPreflight({ ...validProductionEnv });
    assert.equal(res.valid, true, `Expected valid production env to pass, failed with: ${res.failures.join(', ')}`);
    assert.equal(res.failures.length, 0);
  });

  it('2. FAIL: fails when DOMAIN is localhost, 127.0.0.1, or ends with .local', () => {
    for (const badDomain of ['localhost', '127.0.0.1', 'corp.local', 'sub.domain.local']) {
      const res = runPreflight({ ...validProductionEnv, DOMAIN: badDomain });
      assert.equal(res.valid, false, `Expected failure for DOMAIN=${badDomain}`);
      assert.ok(
        res.failures.some((f) => f.includes('[DOMAIN]')),
        `Expected [DOMAIN] failure for ${badDomain}`
      );
    }
  });

  it('3. FAIL: fails when MAIL_MODE is disabled in production', () => {
    const res = runPreflight({ ...validProductionEnv, MAIL_MODE: 'disabled' });
    assert.equal(res.valid, false);
    assert.ok(res.failures.some((f) => f.includes("[EMAIL] MAIL_MODE cannot be 'disabled'")));
  });

  it('4. FAIL: fails when SMTP settings contain unreplaced placeholders or example domains', () => {
    const badPlaceholders = [
      { SMTP_HOST: 'smtp.example.com' },
      { SMTP_USER: 'REPLACE_WITH_USER' },
      { SMTP_PASS: 'CHANGE_ME_PASSWORD' },
      { MAIL_FROM: 'noreply@example.ae' },
    ];

    for (const override of badPlaceholders) {
      const res = runPreflight({ ...validProductionEnv, ...override });
      assert.equal(res.valid, false, `Expected failure for SMTP placeholder: ${JSON.stringify(override)}`);
      assert.ok(
        res.failures.some((f) => f.includes('[EMAIL]')),
        `Expected [EMAIL] failure for ${JSON.stringify(override)}`
      );
    }
  });

  it('5. FAIL: fails when COOKIE_SECURE != true', () => {
    for (const badCookie of ['false', '', undefined, '0']) {
      const res = runPreflight({ ...validProductionEnv, COOKIE_SECURE: badCookie });
      assert.equal(res.valid, false);
      assert.ok(res.failures.some((f) => f.includes('[COOKIE_SECURE]')));
    }
  });

  it('6. FAIL: fails when ALLOWED_ORIGIN is not https, contains localhost, or contains wildcard *', () => {
    const badOrigins = [
      'http://payroll.emirateslogistics.ae',
      'https://localhost:3000',
      'https://127.0.0.1:3000',
      '*',
      'https://*.emirateslogistics.ae',
    ];

    for (const badOrigin of badOrigins) {
      const res = runPreflight({ ...validProductionEnv, ALLOWED_ORIGIN: badOrigin });
      assert.equal(res.valid, false, `Expected failure for ALLOWED_ORIGIN=${badOrigin}`);
      assert.ok(
        res.failures.some((f) => f.includes('[CORS]')),
        `Expected [CORS] failure for ${badOrigin}`
      );
    }
  });

  it('7. FAIL: fails when NODE_ENV != production', () => {
    for (const badNodeEnv of ['development', 'test', 'staging', '']) {
      const res = runPreflight({ ...validProductionEnv, NODE_ENV: badNodeEnv });
      assert.equal(res.valid, false);
      assert.ok(res.failures.some((f) => f.includes('[NODE_ENV]')));
    }
  });

  it('8. FAIL: fails when SEED_MODE=demo in production', () => {
    const res = runPreflight({ ...validProductionEnv, SEED_MODE: 'demo' });
    assert.equal(res.valid, false);
    assert.ok(res.failures.some((f) => f.includes('[SEED_MODE]')));
  });

  it('9. FAIL: fails when JWT_SECRET < 32 characters or uses placeholder', () => {
    for (const badSecret of ['shortsecret', '1234567890123456789012345678901', 'REPLACE_WITH_GENERATED_64_CHAR_HEX_JWT_SECRET']) {
      const res = runPreflight({ ...validProductionEnv, JWT_SECRET: badSecret });
      assert.equal(res.valid, false, `Expected failure for JWT_SECRET=${badSecret}`);
      assert.ok(res.failures.some((f) => f.includes('[JWT_SECRET]')));
    }
  });

  it('10. ALLOW_DEMO_MAIL_DISABLED=true: allows MAIL_MODE=disabled with warning, but fails without it', () => {
    // 1. Fails when MAIL_MODE=disabled without ALLOW_DEMO_MAIL_DISABLED
    const failRes = runPreflight({ ...validProductionEnv, MAIL_MODE: 'disabled' });
    assert.equal(failRes.valid, false);
    assert.ok(failRes.failures.some((f) => f.includes("[EMAIL] MAIL_MODE cannot be 'disabled'")));

    // 2. Passes when MAIL_MODE=disabled with ALLOW_DEMO_MAIL_DISABLED=true and emits warning
    const passRes = runPreflight({ ...validProductionEnv, MAIL_MODE: 'disabled', ALLOW_DEMO_MAIL_DISABLED: 'true' });
    assert.equal(passRes.valid, true, `Expected valid with demo override, failed with: ${passRes.failures.join(', ')}`);
    assert.ok(passRes.warnings.some((w) => w.includes('[EMAIL WARNING]')));
  });
});
