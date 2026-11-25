import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://localhost';

let HR_EMAIL = process.env.DEMO_HR_EMAIL;
let TEST_PASS = process.env.DEMO_HR_PASSWORD;

if (!HR_EMAIL || !TEST_PASS) {
  try {
    let credPath = path.resolve(process.cwd(), 'demo-credentials.txt');
    if (!fs.existsSync(credPath)) {
      credPath = path.resolve(process.cwd(), '..', 'demo-credentials.txt');
    }
    if (fs.existsSync(credPath)) {
      const content = fs.readFileSync(credPath, 'utf8');
      const hrMatch = content.match(/HR_MANAGER\s*:\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
      if (hrMatch) {
        HR_EMAIL = hrMatch[1];
        TEST_PASS = hrMatch[2];
      }
    }
  } catch {}
}

if (!HR_EMAIL || !TEST_PASS) {
  throw new Error('HR_MANAGER credentials not found in env or demo-credentials.txt');
}

describe('Two-Browser-Context Concurrent Session Test', () => {
  let browser;

  before(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
    });
  });

  after(async () => {
    if (browser) await browser.close();
  });

  it('Same HR Manager logs in on two separate browser contexts; logout on context A does not kick context B', async () => {
    // 1. Context A (Device 1)
    const contextA = await browser.newContext({ ignoreHTTPSErrors: true });
    const pageA = await contextA.newPage();

    await pageA.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('input[type="email"]', { timeout: 15000 });
    await pageA.fill('input[type="email"]', HR_EMAIL);
    await pageA.fill('input[type="password"]', TEST_PASS);
    await pageA.click('button[type="submit"]');
    await pageA.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });

    // Verify Context A is authenticated
    const urlA = pageA.url();
    assert.ok(!urlA.includes('/login'), 'Context A should be authenticated');

    // 2. Context B (Device 2)
    const contextB = await browser.newContext({ ignoreHTTPSErrors: true });
    const pageB = await contextB.newPage();

    await pageB.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await pageB.waitForSelector('input[type="email"]', { timeout: 15000 });
    await pageB.fill('input[type="email"]', HR_EMAIL);
    await pageB.fill('input[type="password"]', TEST_PASS);
    await pageB.click('button[type="submit"]');
    await pageB.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });

    // Verify Context B is authenticated
    const urlB = pageB.url();
    assert.ok(!urlB.includes('/login'), 'Context B should be authenticated');

    // 3. Context A logs out
    const logoutResA = await pageA.evaluate(async () => {
      const res = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
      });
      return { status: res.status, ok: res.ok };
    });
    assert.equal(logoutResA.status, 200, 'Context A logout should succeed with 200');

    // Verify Context A session is revoked
    const meA = await pageA.evaluate(async () => {
      const authMe = await fetch('/api/v1/auth/me').then((r) => r.json()).catch((e) => ({ error: e.message }));
      const notifs = await fetch('/api/v1/notifications').then((r) => ({ status: r.status })).catch((e) => ({ error: e.message }));
      return { user: authMe.user, notifStatus: notifs.status };
    });
    assert.equal(meA.user, null, 'Context A should have null user after logging out');
    assert.equal(meA.notifStatus, 401, 'Context A should receive 401 on protected endpoint after logging out');

    // 4. CRITICAL CHECK: Context B MUST STILL BE VALID AND LOGGED IN!
    const meB = await pageB.evaluate(async () => {
      const authMe = await fetch('/api/v1/auth/me').then((r) => r.json()).catch((e) => ({ error: e.message }));
      const notifs = await fetch('/api/v1/notifications').then((r) => ({ status: r.status })).catch((e) => ({ error: e.message }));
      return { user: authMe.user, notifStatus: notifs.status };
    });
    assert.ok(meB.user, 'Context B MUST STILL BE LOGGED IN');
    assert.equal(meB.user.email, HR_EMAIL, 'Context B must still identify as the HR Manager');
    assert.equal(meB.notifStatus, 200, 'Context B protected endpoint must succeed with 200');

    // 5. Cleanup Context B
    await pageB.evaluate(async () => {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
      });
    });

    await contextA.close();
    await contextB.close();
  });
});
