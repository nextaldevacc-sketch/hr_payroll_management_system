import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import treeKill from 'tree-kill';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(__dirname, '../..');
const apiDir = path.resolve(rootDir, 'backend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');

describe('Part 1: Real Login, Logout, Route Protection & Permissions', { timeout: 150000 }, () => {
  let apiProcess = null;
  let webProcess = null;
  let browser = null;
  let prisma = null;

  const API_PORT = 5000;
  const WEB_PORT = 3100;
  const TEST_PASSWORD = 'Nextal@2026!'; // Used only by test runner against test DB

  function killProcWithTree(proc) {
    return new Promise((resolve) => {
      if (!proc || !proc.pid) return resolve();
      treeKill(proc.pid, 'SIGKILL', () => resolve());
    });
  }

  function waitForHttp(url, timeoutMs = 25000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const req = http.get(url, (res) => {
          res.resume();
          if (res.statusCode < 500) {
            clearInterval(interval);
            resolve();
          }
        });
        req.on('error', () => {
          if (Date.now() - startTime > timeoutMs) {
            clearInterval(interval);
            reject(new Error(`Timeout waiting for ${url}`));
          }
        });
        req.setTimeout(1000, () => req.destroy());
      }, 500);
    });
  }

  before(async () => {
    const testDbUrl =
      process.env.DATABASE_URL_TEST ||
      'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';
    prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
    await prisma.users.updateMany({
      data: { failed_logins: 0, locked_until: null },
    });

    // 1. Ensure API server is running on test database
    try {
      await waitForHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`, 1500);
    } catch {
      apiProcess = spawn(process.execPath, [path.resolve(apiDir, 'src/server.js')], {
        cwd: apiDir,
        env: {
          ...process.env,
          PORT: String(API_PORT),
          NODE_ENV: 'test',
          DATABASE_URL: testDbUrl,
          DATABASE_URL_TEST: testDbUrl,
          FEATURE_PLATFORM_ADMIN: 'false',
        },
        stdio: 'ignore',
      });
      await waitForHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`, 25000);
    }

    // 2. Ensure Web Next.js server is running
    try {
      await waitForHttp(`http://127.0.0.1:${WEB_PORT}/login`, 1500);
    } catch {
      const distDir = fs.existsSync(path.join(webDir, '.next-build'))
        ? '.next-build'
        : fs.existsSync(path.join(webDir, '.next'))
        ? '.next'
        : null;
      const hasBuild = Boolean(distDir);
      const commandArgs = hasBuild
        ? [nextBin, 'start', '-p', String(WEB_PORT)]
        : [nextBin, 'dev', '-p', String(WEB_PORT)];

      webProcess = spawn(process.execPath, commandArgs, {
        cwd: webDir,
        env: {
          ...process.env,
          PORT: String(WEB_PORT),
          NODE_ENV: hasBuild ? 'production' : 'development',
          NEXT_DIST_DIR: distDir || '.next',
          NEXT_PUBLIC_API_URL: `http://127.0.0.1:${API_PORT}/api/v1`,
          NEXT_PUBLIC_FEATURE_PLATFORM_ADMIN: 'false',
        },
        stdio: 'ignore',
      });
      await waitForHttp(`http://127.0.0.1:${WEB_PORT}/login`, 35000);
    }

    // 3. Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  after(async () => {
    if (browser) await browser.close();
    if (prisma) {
      await prisma.users.updateMany({
        data: { failed_logins: 0, locked_until: null },
      });
      await prisma.$disconnect().catch(() => {});
    }
    if (webProcess) await killProcWithTree(webProcess);
    if (apiProcess) await killProcWithTree(apiProcess);
  });

  it('1. Unauthenticated visit to /, /payroll, /me redirects to /login?next= and has NO sidebar', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Visit /
    await page.goto(`http://127.0.0.1:${WEB_PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 15000 });
    assert.ok(page.url().includes('/login'));

    // Assert sidebar element is completely absent on the login page
    const asideCount = await page.locator('aside, [data-testid="glass-sidebar"], [data-testid="sidebar"]').count();
    assert.equal(asideCount, 0, 'Login page must not render any sidebar component');

    // Visit /payroll
    await page.goto(`http://127.0.0.1:${WEB_PORT}/payroll`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 15000 });
    assert.ok(page.url().includes('next=%2Fpayroll') || page.url().includes('next=/payroll'));

    // Visit /me
    await page.goto(`http://127.0.0.1:${WEB_PORT}/me`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 15000 });
    assert.ok(page.url().includes('next=%2Fme') || page.url().includes('next=/me'));

    await context.close();
  });

  it('2. Login as each role lands on the right page; Employee lands on /me', async () => {
    const rolesToTest = [
      { email: 'admin@gulftech.ae', expectedUrl: '/' },
      { email: 'hr.mgr@gulftech.ae', expectedUrl: '/' },
      { email: 'hr.officer@gulftech.ae', expectedUrl: '/' },
      { email: 'payroll@gulftech.ae', expectedUrl: '/' },
      { email: 'employee@gulftech.ae', expectedUrl: '/me' },
    ];

    for (const item of rolesToTest) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[BROWSER LOG (${item.email})]:`, msg.text()));
      page.on('pageerror', (err) => console.log(`[BROWSER ERROR (${item.email})]:`, err.message));

      await page.goto(`http://127.0.0.1:${WEB_PORT}/login`, { waitUntil: 'domcontentloaded' });
      await page.fill('input[type="email"]', item.email);
      await page.fill('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');

      if (item.expectedUrl === '/me') {
        await page.waitForURL((url) => url.pathname.startsWith('/me'), { timeout: 15000 });
        assert.ok(page.url().includes('/me'), `Expected employee to land on /me, got ${page.url()}`);
      } else {
        await page.waitForURL((url) => url.pathname === '/' || !url.pathname.includes('/login'), {
          timeout: 15000,
        });
        assert.ok(!page.url().includes('/login'), `Expected ${item.email} to land on dashboard`);
      }

      await context.close();
    }
  });

  it('3. Wrong password shows generic error; 5 wrong locks account with timer', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const lockTargetEmail = 'emp-dxb-020@gulftech.ae'; // Dedicated employee account for lockout test

    // 1. Single wrong password
    await page.goto(`http://127.0.0.1:${WEB_PORT}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', lockTargetEmail);
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForSelector('text=Invalid email or password', { timeout: 10000 });
    const errorText = await page.textContent('body');
    assert.ok(errorText.includes('Invalid email or password') || errorText.includes('البريد الإلكتروني أو كلمة المرور'));

    // 2. Test 5 failed attempts lockout on backend API
    for (let i = 0; i < 4; i++) {
      await fetch(`http://127.0.0.1:${API_PORT}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lockTargetEmail, password: 'WrongPassword!' }),
      });
    }

    // 5th attempt triggers lockout
    const res5 = await fetch(`http://127.0.0.1:${API_PORT}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockTargetEmail, password: 'WrongPassword!' }),
    });
    const data5 = await res5.json();
    assert.equal(res5.status, 423, '5th consecutive failure must return HTTP 423 Locked');
    assert.equal(data5.code, 'ACCOUNT_LOCKED');
    assert.ok(data5.message.includes('locked'), 'Lockout message must inform user');

    await context.close();
  });

  it('4. Logout redirects to /login; Back button prevents protected data; old cookie is invalidated', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Sign in as HR Manager
    await page.goto(`http://127.0.0.1:${WEB_PORT}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'hr.mgr@gulftech.ae');
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname === '/' || !url.pathname.includes('/login'), { timeout: 15000 });

    // Extract cookie before logout
    const cookiesBefore = await context.cookies();
    const tokenCookie = cookiesBefore.find((c) => c.name === 'nextal_token');
    assert.ok(tokenCookie, 'nextal_token cookie must be present after login');

    // Click Sign out in sidebar or top bar
    const logoutBtn = page.locator('button[title*="Sign out"], button:has-text("Sign out"), button:has-text("تسجيل الخروج")').first();
    await logoutBtn.click({ force: true });
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 15000, waitUntil: 'domcontentloaded' });
    assert.ok(page.url().includes('/login'), 'Must redirect to /login upon sign out');

    // Navigating back to protected page after logout redirects to /login
    await page.goto(`http://127.0.0.1:${WEB_PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    assert.ok(page.url().includes('/login'), 'Visiting / after sign out must redirect to /login');

    // Test old cookie directly on API /auth/me -> must be 401 Unauthorized
    const meRes = await fetch(`http://127.0.0.1:${API_PORT}/api/v1/auth/me`, {
      headers: { Cookie: `nextal_token=${tokenCookie.value}` },
    });
    assert.equal(meRes.status, 401, 'Old cookie must return 401 because token_version was incremented on logout');

    await context.close();
  });

  it('5. Session expired query parameter displays warning notice', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto(`http://127.0.0.1:${WEB_PORT}/login?reason=session_expired`, { waitUntil: 'domcontentloaded' });
    const content = await page.textContent('body');
    assert.ok(
      content.includes('Your session expired, please sign in again') ||
        content.includes('انتهت جلستك، يرجى تسجيل الدخول مرة أخرى'),
      'Must render session expired notice'
    );

    await context.close();
  });

  it('6. Employee accessing /payroll shows 403 Forbidden; HR Officer accessing /payroll shows 403', async () => {
    // 1. Employee accessing /payroll
    const context1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page1 = await context1.newPage();

    await page1.goto(`http://127.0.0.1:${WEB_PORT}/login`, { waitUntil: 'domcontentloaded' });
    await page1.fill('input[type="email"]', 'employee@gulftech.ae');
    await page1.fill('input[type="password"]', TEST_PASSWORD);
    await page1.click('button[type="submit"]');
    await page1.waitForURL((url) => url.pathname.startsWith('/me'), { timeout: 15000 });

    await page1.goto(`http://127.0.0.1:${WEB_PORT}/payroll`, { waitUntil: 'domcontentloaded' });
    await page1.waitForSelector('text=403', { timeout: 15000 });
    const text1 = await page1.textContent('body');
    assert.ok(text1.includes('403') && (text1.includes('Forbidden') || text1.includes('صلاحية')), 'Employee typing /payroll must see 403 page');
    await context1.close();

    // 2. HR Officer accessing /payroll
    const context2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page2 = await context2.newPage();

    await page2.goto(`http://127.0.0.1:${WEB_PORT}/login`, { waitUntil: 'domcontentloaded' });
    await page2.fill('input[type="email"]', 'hr.officer@gulftech.ae');
    await page2.fill('input[type="password"]', TEST_PASSWORD);
    await page2.click('button[type="submit"]');
    await page2.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    await page2.goto(`http://127.0.0.1:${WEB_PORT}/payroll`, { waitUntil: 'domcontentloaded' });
    await page2.waitForSelector('text=403', { timeout: 15000 });
    const text2 = await page2.textContent('body');
    assert.ok(text2.includes('403') && (text2.includes('Forbidden') || text2.includes('صلاحية')), 'HR Officer typing /payroll must see 403 page');
    await context2.close();
  });

  it('7. Grep check: zero DEMO_USERS, zero switchDemoUser, zero persona, zero localhost:5000 in frontend/src', () => {
    // Check for persona code
    let personaGrep = '';
    try {
      personaGrep = execSync('git grep -n -E "\\b(DEMO_USERS|switchDemoUser|personas?)\\b" frontend/src', {
        cwd: rootDir,
        encoding: 'utf8',
      });
    } catch {
      personaGrep = '';
    }
    assert.equal(personaGrep.trim(), '', `Found forbidden demo persona patterns in frontend/src:\n${personaGrep}`);

    // Check for localhost:5000
    let localhostGrep = '';
    try {
      localhostGrep = execSync('git grep -n "localhost:5000" frontend/src', {
        cwd: rootDir,
        encoding: 'utf8',
      });
    } catch {
      localhostGrep = '';
    }
    assert.equal(localhostGrep.trim(), '', `Found hard-coded localhost:5000 in frontend/src:\n${localhostGrep}`);
  });

  it('8. Same-origin proxy: login at http://localhost:3100 AND http://127.0.0.1:3100 reaches dashboard and survives reload', async () => {
    for (const host of ['127.0.0.1', 'localhost']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      await page.goto(`http://${host}:${WEB_PORT}/login`, { waitUntil: 'domcontentloaded' });
      await page.fill('input[type="email"]', 'admin@gulftech.ae');
      await page.fill('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');

      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
      assert.ok(!page.url().includes('/login'), `Host ${host} failed to reach dashboard`);

      // Reload page and verify session survives
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      assert.ok(!page.url().includes('/login'), `Host ${host} session failed after reload`);

      await context.close();
    }
  });

  it('9. Stale-cookie: invalid nextal_token cookie on / lands on /login once (no loop) and allows login', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies([
      {
        name: 'nextal_token',
        value: 'invalid.stale.token.value',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();
    let redirectCount = 0;
    page.on('response', (res) => {
      if (res.status() === 307 || res.status() === 308 || res.status() === 302) {
        redirectCount++;
      }
    });

    await page.goto(`http://127.0.0.1:${WEB_PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    assert.ok(page.url().includes('/login'), 'Must land on /login with invalid token');
    assert.ok(redirectCount <= 3, `Expected at most 1-2 redirects, got ${redirectCount} (redirect loop detected)`);

    // Verify user can now sign in normally
    await page.fill('input[type="email"]', 'admin@gulftech.ae');
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    assert.ok(!page.url().includes('/login'), 'User could not sign in after stale token');

    await context.close();
  });

  it('10. Logout and login clear cache: HR data never leaks to employee', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 1. Log in as HR Manager
    await page.goto(`http://127.0.0.1:${WEB_PORT}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'hr.mgr@gulftech.ae');
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // Open employees page to cache employee data in React Query
    await page.goto(`http://127.0.0.1:${WEB_PORT}/employees`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Employees', { timeout: 10000 });

    // 2. Sign out
    const logoutBtn = page.locator('button[title*="Sign out"], button:has-text("Sign out"), button:has-text("تسجيل الخروج")').first();
    await logoutBtn.click({ force: true });
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 15000, waitUntil: 'domcontentloaded' });

    // Track network requests when logging in as employee
    let employeeDataRequested = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/employees') && !req.url().includes('/me')) {
        employeeDataRequested = true;
      }
    });

    // 3. Log in as Employee
    await page.fill('input[type="email"]', 'employee@gulftech.ae');
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.startsWith('/me'), { timeout: 15000 });

    // Verify employee landed on /me and no HR employees endpoint was hit or leaked
    assert.equal(employeeDataRequested, false, 'No /employees endpoint request should be made by employee session');
    const bodyText = await page.textContent('body');
    assert.ok(!bodyText.includes('Gulf Tech Employee Directory'), 'HR employee directory leaked to employee view');

    await context.close();
  });
});
