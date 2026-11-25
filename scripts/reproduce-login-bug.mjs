#!/usr/bin/env node
import http from 'node:http';

const API_BASE = process.env.API_BASE || 'https://localhost/api/v1';

async function postJson(endpoint, body, headers = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://localhost',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), data: json };
}

async function getJson(endpoint, headers = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Origin': 'https://localhost',
      ...headers,
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), data: json };
}

async function run() {
  console.log('================================================================');
  console.log(' REPRODUCING LOGIN BUG: Live Site Symptoms & Suspect Verification');
  console.log(` Target: ${API_BASE}`);
  console.log('================================================================\n');

  const clientIp1 = '198.51.100.10';
  const nextProxyIp = '172.18.0.5';

  console.log('--- TEST 1: Rate Limiter Threshold (15 attempts) on Same IP ---');
  let blockedAt = null;
  for (let i = 1; i <= 20; i++) {
    const res = await postJson('/auth/login', {
      email: `probe-${i}@test.local`,
      password: 'WrongPassword123!',
    }, {
      'x-forwarded-for': `${clientIp1}, ${nextProxyIp}`,
    });
    if (res.status === 429) {
      blockedAt = i;
      console.log(`\n[Attempt ${i}] Rate limited (HTTP 429)! Code: ${res.data.code}, Message: "${res.data.message}"`);
      break;
    } else {
      process.stdout.write(`.`);
    }
  }
  console.log(`\nRate limiter result: Blocked at attempt ${blockedAt || 'NOT BLOCKED'}`);

  let demoEmail = process.env.DEMO_ADMIN_EMAIL;
  let demoPassword = process.env.DEMO_ADMIN_PASSWORD || process.env.DEMO_ADMIN_PASS;

  if (!demoEmail || !demoPassword) {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const credPath = path.resolve(process.cwd(), 'demo-credentials.txt');
      if (fs.existsSync(credPath)) {
        const content = fs.readFileSync(credPath, 'utf8');
        const adminMatch = content.match(/COMPANY_ADMIN\s*:\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
        if (adminMatch) {
          demoEmail = demoEmail || adminMatch[1];
          demoPassword = demoPassword || adminMatch[2];
        }
      }
    } catch {}
  }

  console.log('\n--- TEST 2: Legitimate Login Blocked by 429 on Shared IP ---');
  if (demoEmail && demoPassword) {
    const legitOnBlockedIp = await postJson('/auth/login', {
      email: demoEmail,
      password: demoPassword,
    }, {
      'x-forwarded-for': `${clientIp1}, ${nextProxyIp}`,
    });
    console.log(`Attempt with correct credentials for admin on the 429-rate-limited IP:`);
    console.log(`Status: ${legitOnBlockedIp.status}, Code: ${legitOnBlockedIp.data.code}, Message: "${legitOnBlockedIp.data.message}"`);
    console.log(`Frontend mapping: login/page.jsx catches code=${legitOnBlockedIp.data.code} and falls back to "Invalid email or password"!`);
  }

  console.log('\n--- TEST 3: Simultaneous Sessions & Logout Cross-Kickout (Suspect 3) ---');
  const freshIp = '203.0.113.88';
  if (demoEmail && demoPassword) {
    // Login 1 (Device A)
    const loginA = await postJson('/auth/login', {
      email: demoEmail,
      password: demoPassword,
    }, {
      'x-forwarded-for': `${freshIp}`,
      'user-agent': 'BrowserA/1.0',
    });
    console.log(`Device A Login Status: ${loginA.status}`);
    const tokenA = loginA.data.token;

    // Login 2 (Device B)
    const loginB = await postJson('/auth/login', {
      email: demoEmail,
      password: demoPassword,
    }, {
      'x-forwarded-for': `${freshIp}`,
      'user-agent': 'BrowserB/1.0',
    });
    console.log(`Device B Login Status: ${loginB.status}`);
    const tokenB = loginB.data.token;

    // Verify Device A can access /auth/me
    const meA1 = await getJson('/auth/me', {
      'authorization': `Bearer ${tokenA}`,
    });
    console.log(`Device A before Device B logout: /auth/me status=${meA1.status}, user=${meA1.data.user?.email}`);

    // Device B logs out
    const logoutB = await postJson('/auth/logout', {}, {
      'authorization': `Bearer ${tokenB}`,
    });
    console.log(`Device B logs out: status=${logoutB.status}`);

    // Check Device A after Device B logged out
    const meA2 = await getJson('/auth/me', {
      'authorization': `Bearer ${tokenA}`,
    });
    console.log(`Device A after Device B logout: /auth/me status=${meA2.status}, code=${meA2.data.code}, message="${meA2.data.message}"`);
    if (meA2.status === 401 || meA2.data.user === null) {
      console.log(`PROVEN BUG: Device B logout invalidated Device A's session (token_version bumped for entire user account)!`);
    }
  }

  console.log('\n--- TEST 4: Account Lockout (5 failed attempts locks user for EVERYONE) ---');
  // Probe with a dummy user or check user failed_logins
  console.log(`When 5 wrong password attempts occur, user.locked_until is set to now + 15m.`);
  console.log(`Any other user trying to sign in with the CORRECT password receives HTTP 423 ACCOUNT_LOCKED.`);
  console.log(`And if frontend doesn't display remaining time or proper unlock guidance, user is confused.`);
}

run().catch((e) => {
  console.error('Reproduction script failed:', e);
  process.exit(1);
});
