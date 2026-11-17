/**
 * Startup Environment & Security Validation
 */
export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    errors.push('DATABASE_URL is required');
  } else if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || String(jwtSecret).trim() === '') {
    errors.push('JWT_SECRET environment variable is missing');
  } else {
    if (jwtSecret.length < 32) {
      errors.push(`JWT_SECRET is too short (${jwtSecret.length} chars). Minimum recommended length is 32 characters.`);
    }
    const weakSecrets = ['secret', 'jwtsecret', '123456', 'password', 'changeme'];
    if (weakSecrets.includes(jwtSecret.toLowerCase())) {
      errors.push('JWT_SECRET is using a known weak dictionary word');
    }
    const devPhrases = [
      'super_secret_jwt_key_2026',
      'development_secret_key_not_for_prod',
      'your-jwt-secret-here',
      'replace_this_with_a_secure_random',
      'nextal_super_secret_jwt_key',
      'nextal-secure-jwt-signing-secret-key',
      'nextal_jwt_secret_dev_key',
    ];
    const lower = jwtSecret.toLowerCase();
    if (process.env.NODE_ENV === 'production' && devPhrases.some((phrase) => lower.includes(phrase))) {
      errors.push('JWT_SECRET is using a weak or development default value in production');
    }
  }

  // W3 / FR-EM5: Document Encryption Key validation (32 bytes)
  const docKey = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!docKey) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('DOCUMENT_ENCRYPTION_KEY is required in production (32 bytes / 64 hex chars)');
    } else {
      warnings.push('DOCUMENT_ENCRYPTION_KEY is not set. Using dev-only fallback key. Do NOT use this in production!');
      process.env.DOCUMENT_ENCRYPTION_KEY = 'nextal_doc_encryption_key_32_b!';
    }
  } else {
    const keyBytes = Buffer.from(docKey, docKey.length === 64 ? 'hex' : 'utf8');
    if (keyBytes.length !== 32) {
      errors.push(`DOCUMENT_ENCRYPTION_KEY must be exactly 32 bytes (got ${keyBytes.length} bytes)`);
    }
  }

  if (errors.length > 0) {
    console.error('FATAL: Startup Environment Validation Failed:');
    errors.forEach((err) => console.error(`  - ${err}`));
    if (process.env.NODE_ENV === 'production' || !process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim() === '') {
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    console.warn('WARNING: Startup Environment Notices:');
    warnings.forEach((warn) => console.warn(`  - ${warn}`));
  }

  return { valid: errors.length === 0, errors, warnings };
}

export default validateEnvironment;

