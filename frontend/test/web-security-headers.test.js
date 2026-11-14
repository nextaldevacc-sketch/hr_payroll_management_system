import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../next.config.js';

describe('Part 8 Item 3: Next.js Web Security Headers', () => {
  it('Configures complete strict security headers in next.config.js', async () => {
    assert.equal(typeof nextConfig.headers, 'function');
    const headersList = await nextConfig.headers();
    const globalRule = headersList.find((h) => h.source === '/:path*');
    assert.ok(globalRule, 'Must define global header rules for /:path*');

    const headers = {};
    for (const h of globalRule.headers) {
      headers[h.key.toLowerCase()] = h.value;
    }

    // CSP
    const csp = headers['content-security-policy'];
    assert.ok(csp, 'CSP header required');
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes("font-src 'self'"), 'Fonts must be self-hosted only');
    assert.ok(!csp.includes("'unsafe-eval'"), 'Must strictly forbid unsafe-eval in production');
    assert.ok(csp.includes("frame-ancestors 'none'"));

    // Frames & Sniffing
    assert.equal(headers['x-frame-options'], 'DENY');
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');

    // Permissions
    assert.ok(headers['permissions-policy']);
    assert.ok(headers['permissions-policy'].includes('camera=()'));
    assert.ok(headers['permissions-policy'].includes('microphone=()'));
  });
});
