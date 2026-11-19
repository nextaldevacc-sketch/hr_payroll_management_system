/**
 * Enterprise Password Complexity & Policy Engine (SEC-M6)
 *
 * Rules:
 * 1. Minimum 10 characters
 * 2. At least one uppercase letter (A-Z)
 * 3. At least one lowercase letter (a-z)
 * 4. At least one number (0-9)
 * 5. At least one special character (!@#$%^&*()_+-=[]{};':"\\|,.<>/?~`)
 * 6. Cannot contain the user's name or email username (substring match, case-insensitive, >= 3 chars)
 * 7. Cannot match any password in the common password list (20+ common passwords)
 */

export const COMMON_PASSWORDS = [
  'password',
  'password123',
  'password123!',
  'admin123',
  'admin123!',
  'admin12345!',
  'welcome123!',
  'p@ssword123',
  'password@1',
  'password@12',
  'changeme123!',
  'secret1234!',
  'company123!',
  'qwerty12345!',
  '1234567890Aa!',
  'letmein1234!',
  'passw0rd123!',
  'iloveyou123!',
  'sunshine123!',
  'princess123!',
];

/**
 * Validates password complexity against company security policy
 * @param {string} password - Password candidate
 * @param {object} [context] - Optional user context (email, name, firstName, lastName)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePassword(password, context = {}) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password is required and must be a string'],
    };
  }

  // 1. Min 10 characters
  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  }

  // 2. Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  // 3. Lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  // 4. Number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  // 5. Special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  const lowerPwd = password.toLowerCase();

  // 6. Common password list check
  const isCommon = COMMON_PASSWORDS.some((common) => common.toLowerCase() === lowerPwd);
  if (isCommon) {
    errors.push('Password is too common and easily guessed. Please choose a more complex phrase');
  }

  // 7. Context checks: email username and user name
  if (context) {
    const { email, name, firstName, lastName } = context;

    // Check email username (part before @)
    if (email && typeof email === 'string') {
      const emailUsername = email.split('@')[0].trim().toLowerCase();
      if (emailUsername.length >= 3 && lowerPwd.includes(emailUsername)) {
        errors.push('Password cannot contain your email username');
      } else {
        // Also check separated parts of email username (e.g. "imran" from "imran.khalid")
        const emailParts = emailUsername.split(/[\s,._-]+/);
        for (const part of emailParts) {
          if (part.length >= 3 && lowerPwd.includes(part)) {
            errors.push('Password cannot contain your email username');
            break;
          }
        }
      }
    }

    // Check name parts
    const nameCandidates = [];
    if (name && typeof name === 'string') {
      nameCandidates.push(...name.split(/[\s,._-]+/));
    }
    if (firstName && typeof firstName === 'string') {
      nameCandidates.push(...firstName.split(/[\s,._-]+/));
    }
    if (lastName && typeof lastName === 'string') {
      nameCandidates.push(...lastName.split(/[\s,._-]+/));
    }

    const uniqueNameParts = [...new Set(nameCandidates.map((n) => n.trim().toLowerCase()))];
    for (const part of uniqueNameParts) {
      if (part.length >= 3 && lowerPwd.includes(part)) {
        errors.push(`Password cannot contain your name ("${part}")`);
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts that a password complies with policy; throws 400 WEAK_PASSWORD on failure
 * @param {string} password
 * @param {object} [context]
 * @returns {boolean}
 */
export function assertPasswordCompliant(password, context = {}) {
  const { valid, errors } = validatePassword(password, context);
  if (!valid) {
    const err = new Error(errors.join('. '));
    err.status = 400;
    err.code = 'WEAK_PASSWORD';
    err.errors = errors;
    throw err;
  }
  return true;
}
