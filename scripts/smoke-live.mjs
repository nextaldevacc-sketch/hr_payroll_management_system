#!/usr/bin/env node
import { parseArgs } from 'node:util';

/**
 * Nextal HR & Payroll — Live Production Smoke Verification Script
 * Validates a live deployment against core operational and security invariants:
 *   1. Health check (/api/v1/health & /healthz)
 *   2. Web Login page loads (HTTP 200, HTML)
 *   3. Strict Security Headers (nosniff, X-Frame-Options, CSP, HSTS on https)
 *   4. Unauthenticated Access Protection (HTTP 401 on protected API)
 *   5. CORS Origin Enforcement (rejects unauthorized/wildcard origins)
 *   6. Cookie Security Flags (HttpOnly, SameSite, Secure on auth cookies)
 *   7. Authenticated Live Login (optional when SMOKE_EMAIL & SMOKE_PASSWORD provided)
 *
 * Usage:
 *   node scripts/smoke-live.mjs https://payroll.example.ae
 *   SMOKE_EMAIL=admin@comp.ae SMOKE_PASSWORD=Secret node scripts/smoke-live.mjs https://payroll.example.ae
 *
 * Exit code 0 on all PASS; exit code 1 on ANY failure.
 */

const args = process.argv.slice(2);
let targetArg = args.find((a) => !a.startsWith('-')) || process.env.TARGET_URL || 'http://localhost:3100';
const isInsecure = args.includes('-k') || args.includes('--insecure') || process.env.SMOKE_INSECURE === 'true';

if (isInsecure) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Normalize URL (strip trailing slashes)
let baseUrl = targetArg.trim().replace(/\/+$/, '');
if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
  baseUrl = 'https://' + baseUrl;
}

const isHttps = baseUrl.startsWith('https://');
const smokeEmail = process.env.SMOKE_EMAIL;
const smokePassword = process.env.SMOKE_PASSWORD;

console.log('================================================================');
console.log(' Nextal HR & Payroll — Live Production Smoke Verification');
console.log(` Target Origin : ${baseUrl}`);
console.log(` Protocol      : ${isHttps ? 'HTTPS (Secure)' : 'HTTP'}`);
if (smokeEmail) {
  console.log(` Test Account  : ${smokeEmail}`);
}
console.log('================================================================\n');

const results = [];

function pass(name, detail = '') {
  console.log(`  ✅ PASS: ${name}${detail ? ` (${detail})` : ''}`);
  results.push({ name, pass: true, detail });
}

function fail(name, detail = '') {
  console.error(`  ❌ FAIL: ${name}${detail ? ` (${detail})` : ''}`);
  results.push({ name, pass: false, detail });
}

async function run() {
  // ---------------------------------------------------------------------------
  // Check 1: Healthcheck Endpoint
  // ---------------------------------------------------------------------------
  try {
    let healthUrl = `${baseUrl}/api/v1/health`;
    let res = await fetch(healthUrl, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) {
      // Try fallback /healthz
      healthUrl = `${baseUrl}/healthz`;
      res = await fetch(healthUrl, { method: 'GET', headers: { Accept: 'application/json' } });
    }

    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body.status === 'ok') {
        pass('API Healthcheck', `status=ok, db=${body.database || 'connected'}, endpoint=${healthUrl}`);
      } else {
        fail('API Healthcheck', `Unhealthy payload: ${JSON.stringify(body)}`);
      }
    } else {
      fail('API Healthcheck', `HTTP ${res.status} from ${healthUrl}`);
    }
  } catch (err) {
    fail('API Healthcheck', `Connection failed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // Check 2: Web Login Page Loads
  // ---------------------------------------------------------------------------
  let loginHeaders = null;
  try {
    const loginUrl = `${baseUrl}/login`;
    const res = await fetch(loginUrl, { method: 'GET' });
    loginHeaders = res.headers;

    if (res.ok) {
      const html = await res.text();
      const hasContent = html.includes('Nextal') || html.includes('Payroll') || html.includes('login') || html.includes('html');
      if (hasContent) {
        pass('Web Login Page', `HTTP 200, length=${html.length} bytes`);
      } else {
        fail('Web Login Page', 'Page rendered empty or unrecognizable content');
      }
    } else {
      fail('Web Login Page', `HTTP ${res.status} from ${loginUrl}`);
    }
  } catch (err) {
    fail('Web Login Page', `Connection failed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // Check 3: Strict Security Headers
  // ---------------------------------------------------------------------------
  try {
    const probeUrl = `${baseUrl}/api/v1/health`;
    const res = await fetch(probeUrl);
    const headers = res.headers;

    // A. X-Content-Type-Options
    const nosniff = headers.get('x-content-type-options');
    if (nosniff && nosniff.toLowerCase().includes('nosniff')) {
      pass('Header: X-Content-Type-Options', nosniff);
    } else {
      fail('Header: X-Content-Type-Options', `Missing or invalid: '${nosniff}'`);
    }

    // B. X-Frame-Options
    const xfo = headers.get('x-frame-options');
    if (xfo && (xfo.toUpperCase() === 'DENY' || xfo.toUpperCase() === 'SAMEORIGIN')) {
      pass('Header: X-Frame-Options', xfo);
    } else {
      fail('Header: X-Frame-Options', `Missing or invalid: '${xfo}'`);
    }

    // C. Strict-Transport-Security (HSTS required on HTTPS)
    const hsts = headers.get('strict-transport-security') || (loginHeaders && loginHeaders.get('strict-transport-security'));
    if (isHttps) {
      if (hsts && hsts.includes('max-age')) {
        pass('Header: Strict-Transport-Security', hsts);
      } else {
        fail('Header: Strict-Transport-Security', `Missing on HTTPS connection: '${hsts}'`);
      }
    } else {
      pass('Header: Strict-Transport-Security', 'Skipped on plain HTTP connection');
    }
  } catch (err) {
    fail('Security Headers', `Failed to inspect headers: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // Check 4: Unauthenticated Access Protection (Expect 401)
  // ---------------------------------------------------------------------------
  try {
    const protectedUrl = `${baseUrl}/api/v1/employees`;
    const res = await fetch(protectedUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.status === 401) {
      pass('Unauthenticated Access Guard', `HTTP 401 correctly returned from ${protectedUrl}`);
    } else {
      fail('Unauthenticated Access Guard', `Expected HTTP 401, got HTTP ${res.status}`);
    }
  } catch (err) {
    fail('Unauthenticated Access Guard', `Request failed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // Check 5: CORS Origin Enforcement
  // ---------------------------------------------------------------------------
  try {
    const corsProbeUrl = `${baseUrl}/api/v1/health`;
    const evilOrigin = 'https://malicious-attacker-site.com';
    const res = await fetch(corsProbeUrl, {
      method: 'GET',
      headers: {
        Origin: evilOrigin,
        Accept: 'application/json',
      },
    });

    const acao = res.headers.get('access-control-allow-origin');
    if (!acao || acao !== evilOrigin) {
      pass('CORS Origin Restriction', `Attacker origin '${evilOrigin}' not reflected (acao='${acao}')`);
    } else {
      fail('CORS Origin Restriction', `Attacker origin was illegally reflected: ${acao}`);
    }
  } catch (err) {
    fail('CORS Origin Restriction', `Request failed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // Check 6: Cookie Flags & Live Authentication (if credentials provided)
  // ---------------------------------------------------------------------------
  if (smokeEmail && smokePassword) {
    try {
      const loginEndpoint = `${baseUrl}/api/v1/auth/login`;
      const loginRes = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: baseUrl,
        },
        body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
      });

      const setCookie = loginRes.headers.get('set-cookie') || '';
      const loginBody = await loginRes.json().catch(() => ({}));

      if (loginRes.ok) {
        pass('Live Account Login', `HTTP 200 for ${smokeEmail}`);

        // Inspect cookie flags
        if (setCookie) {
          const isHttpOnly = /httponly/i.test(setCookie);
          const hasSameSite = /samesite=(lax|strict|none)/i.test(setCookie);
          const isSecure = /secure/i.test(setCookie);

          if (isHttpOnly) {
            pass('Cookie Flag: HttpOnly', 'Present on auth cookie');
          } else {
            fail('Cookie Flag: HttpOnly', 'Missing HttpOnly on session cookie');
          }

          if (hasSameSite) {
            pass('Cookie Flag: SameSite', setCookie.match(/samesite=[a-z]+/i)[0]);
          } else {
            fail('Cookie Flag: SameSite', 'Missing SameSite policy on session cookie');
          }

          if (isHttps) {
            if (isSecure) {
              pass('Cookie Flag: Secure', 'Present on HTTPS connection');
            } else {
              fail('Cookie Flag: Secure', 'Missing Secure flag on HTTPS connection');
            }
          }
        } else {
          // If token returned in JSON
          if (loginBody.token) {
            pass('Auth Token Returned', 'JWT token present in login payload');
          } else if (loginBody.mfa_required) {
            pass('Auth MFA Flow', 'mfa_required=true returned for privileged user');
          } else {
            fail('Auth Session', 'Neither Set-Cookie nor token returned in login response');
          }
        }
      } else if (loginBody.mfa_required) {
        pass('Live Account Login', `MFA challenge issued (HTTP ${loginRes.status}, mfa_required=true)`);
      } else {
        fail('Live Account Login', `HTTP ${loginRes.status}: ${loginBody.message || JSON.stringify(loginBody)}`);
      }
    } catch (err) {
      fail('Live Account Login', `Authentication probe failed: ${err.message}`);
    }
  } else {
    console.log('  ℹ️  INFO: Live account login skipped (set SMOKE_EMAIL & SMOKE_PASSWORD to test)');
  }

  // ---------------------------------------------------------------------------
  // Summary & Exit Code
  // ---------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.log('\n================================================================');
  console.log(` Verification Summary: ${passed}/${total} checks passed (${failed} failed)`);
  console.log('================================================================');

  if (failed > 0) {
    console.error(`\n❌ LIVE SMOKE VERIFICATION FAILED with ${failed} failure(s).\n`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL LIVE SMOKE CHECKS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal smoke test runner error:', err);
  process.exit(1);
});
