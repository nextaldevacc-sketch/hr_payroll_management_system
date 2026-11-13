/**
 * Production Startup Environment Validator
 * Required by PART 7B (B2)
 *
 * In NODE_ENV=production, refuses start if:
 * 1. JWT_SECRET missing, < 32 chars, or using default / weak secret
 * 2. DOCUMENT_ENCRYPTION_KEY missing, not 32 bytes, or using dev fallback
 * 3. DATABASE_URL points at localhost default credentials (postgres:postgres@localhost / 127.0.0.1)
 * 4. COOKIE_SECURE is not 'true'
 * 5. ALLOWED_ORIGIN is missing or wildcard '*'
 * 6. ENABLE_JOBS is not explicitly set ('true' or 'false')
 */

export function validateEnv(env = process.env) {
  const errors = [];
  const warnings = [];
  const isProd = env.NODE_ENV === 'production';

  // 1. JWT_SECRET
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else {
    if (jwtSecret.length < 32) {
      errors.push(`JWT_SECRET is too short (${jwtSecret.length} chars). Minimum length is 32 characters.`);
    }
    const exactWeak = ['secret', 'jwtsecret', '123456', 'password', 'changeme', 'admin', 'test'];
    const devPhrases = [
      'super_secret_jwt_key_2026',
      'development_secret_key_not_for_prod',
      'your-jwt-secret-here',
      'replace_this_with_a_secure_random',
    ];
    const lower = jwtSecret.toLowerCase();
    if (exactWeak.includes(lower) || devPhrases.some((phrase) => lower.includes(phrase))) {
      errors.push('JWT_SECRET is using a weak or development default value');
    }
  }

  // 2. DOCUMENT_ENCRYPTION_KEY
  const docKey = env.DOCUMENT_ENCRYPTION_KEY;
  const devFallbacks = [
    'nextal_doc_encryption_key_32_b!',
    'dev_document_encryption_key_32b_',
    '0000000000000000000000000000000000000000000000000000000000000000',
  ];
  if (!docKey) {
    if (isProd) {
      errors.push('DOCUMENT_ENCRYPTION_KEY is required in production (32 bytes / 64 hex chars)');
    } else {
      warnings.push('DOCUMENT_ENCRYPTION_KEY is not set. Using dev fallback.');
    }
  } else {
    if (devFallbacks.includes(docKey)) {
      if (isProd) {
        errors.push('DOCUMENT_ENCRYPTION_KEY must not use dev-only fallback key in production');
      } else {
        warnings.push('DOCUMENT_ENCRYPTION_KEY is using dev fallback.');
      }
    }
    const keyBytes = Buffer.from(docKey, docKey.length === 64 ? 'hex' : 'utf8');
    if (keyBytes.length !== 32) {
      errors.push(`DOCUMENT_ENCRYPTION_KEY must be exactly 32 bytes (got ${keyBytes.length} bytes)`);
    }
  }

  // 3. DATABASE_URL
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    errors.push('DATABASE_URL is required');
  } else if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  } else if (isProd) {
    const isLocalhostDefault =
      dbUrl.includes('postgres:postgres@localhost') ||
      dbUrl.includes('postgres:postgres@127.0.0.1') ||
      dbUrl.includes('postgres:postgres@0.0.0.0');
    if (isLocalhostDefault) {
      errors.push('DATABASE_URL points at localhost default credentials (postgres:postgres@localhost)');
    }
  }

  // 4. COOKIE_SECURE (in production)
  if (isProd) {
    if (env.COOKIE_SECURE !== 'true') {
      errors.push("COOKIE_SECURE must be explicitly set to 'true' in production");
    }
  }

  // 5. ALLOWED_ORIGIN (in production)
  if (isProd) {
    const allowedOrigin = env.ALLOWED_ORIGIN;
    if (!allowedOrigin || allowedOrigin.trim() === '') {
      errors.push('ALLOWED_ORIGIN is required in production');
    } else if (allowedOrigin.trim() === '*' || allowedOrigin.includes('*')) {
      errors.push("ALLOWED_ORIGIN cannot be wildcard '*' in production");
    }
  }

  // 6. ENABLE_JOBS (in production)
  if (isProd) {
    if (env.ENABLE_JOBS !== 'true' && env.ENABLE_JOBS !== 'false') {
      errors.push("ENABLE_JOBS must be explicitly set to 'true' or 'false' in production");
    }
  }

  // 7. Email / SMTP Configuration (E1 Requirement)
  if (isProd) {
    if (env.MAIL_MODE === 'disabled') {
      warnings.push('MAIL_MODE is set to disabled. Production email notifications are turned off.');
    } else {
      const requiredSmtp = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
      const missingSmtp = requiredSmtp.filter((k) => !env[k] || String(env[k]).trim() === '');
      if (missingSmtp.length > 0) {
        errors.push(`Production email delivery requires SMTP settings (${missingSmtp.join(', ')} missing). Set MAIL_MODE=disabled only if emails are intentionally disabled.`);
      }
      if (env.SMTP_PORT && isNaN(parseInt(env.SMTP_PORT, 10))) {
        errors.push('SMTP_PORT must be a valid integer port number');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function enforceStartupValidation(env = process.env) {
  const result = validateEnv(env);
  if (!result.valid) {
    console.error('FATAL: Startup Environment Validation Failed:');
    result.errors.forEach((err) => console.error(`  - ${err}`));
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  if (result.warnings.length > 0) {
    console.warn('WARNING: Startup Environment Notices:');
    result.warnings.forEach((warn) => console.warn(`  - ${warn}`));
  }
  return result;
}

export default validateEnv;
