#!/usr/bin/env node
/**
 * Header Check Script (PART 8 Item 3)
 * Verifies Next.js web application security headers:
 * - Content-Security-Policy (strict, self-hosted fonts, no unsafe-eval)
 * - X-Frame-Options (DENY)
 * - X-Content-Type-Options (nosniff)
 * - Referrer-Policy (strict-origin-when-cross-origin)
 * - Permissions-Policy
 */
import nextConfig from '../frontend/next.config.js';
import assert from 'node:assert/strict';

console.log('--- Checking Next.js Standalone Security Headers Configuration ---');

async function verifyHeaders() {
  assert.ok(typeof nextConfig.headers === 'function', 'nextConfig must define async headers() function');

  const headersConfig = await nextConfig.headers();
  assert.ok(Array.isArray(headersConfig), 'headers() must return an array');
  assert.ok(headersConfig.length > 0, 'headers() array must not be empty');

  const rootRule = headersConfig.find((r) => r.source === '/:path*');
  assert.ok(rootRule, 'Must define security headers for /:path*');

  const headersMap = {};
  for (const h of rootRule.headers) {
    headersMap[h.key.toLowerCase()] = h.value;
  }

  // 1. Content-Security-Policy
  const csp = headersMap['content-security-policy'];
  assert.ok(csp, 'Content-Security-Policy header is missing');
  console.log('✓ Content-Security-Policy present:', csp);

  assert.ok(csp.includes("default-src 'self'"), "CSP must include default-src 'self'");
  assert.ok(csp.includes("font-src 'self'"), "CSP must restrict fonts to 'self' (self-hosted fonts only)");
  assert.ok(!csp.includes("'unsafe-eval'"), "CSP must strictly forbid 'unsafe-eval' in production");
  assert.ok(csp.includes("frame-ancestors 'none'"), "CSP must include frame-ancestors 'none'");
  assert.ok(!csp.includes('fonts.googleapis.com'), 'CSP must not whitelist external font CDNs');

  // 2. X-Frame-Options
  const xfo = headersMap['x-frame-options'];
  assert.equal(xfo, 'DENY', 'X-Frame-Options must be DENY');
  console.log('✓ X-Frame-Options: DENY');

  // 3. X-Content-Type-Options
  const xcto = headersMap['x-content-type-options'];
  assert.equal(xcto, 'nosniff', 'X-Content-Type-Options must be nosniff');
  console.log('✓ X-Content-Type-Options: nosniff');

  // 4. Referrer-Policy
  const rp = headersMap['referrer-policy'];
  assert.equal(rp, 'strict-origin-when-cross-origin', 'Referrer-Policy must be strict-origin-when-cross-origin');
  console.log('✓ Referrer-Policy: strict-origin-when-cross-origin');

  // 5. Permissions-Policy
  const pp = headersMap['permissions-policy'];
  assert.ok(pp, 'Permissions-Policy header is missing');
  assert.ok(pp.includes('camera=()'), 'Permissions-Policy must disable camera');
  assert.ok(pp.includes('microphone=()'), 'Permissions-Policy must disable microphone');
  console.log('✓ Permissions-Policy:', pp);

  console.log('\n✅ All Next.js web security headers verified successfully.');
}

verifyHeaders().catch((err) => {
  console.error('\n❌ Header verification failed:', err.message);
  process.exit(1);
});

