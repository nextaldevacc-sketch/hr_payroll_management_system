import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

import treeKill from 'tree-kill';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(__dirname, '../..');
const apiDir = path.resolve(rootDir, 'backend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');
const apiEntry = path.resolve(apiDir, 'src/server.js');

dotenv.config({ path: path.resolve(apiDir, '.env') });

describe('Settings Shift Grace Minutes UI Persistence & Audit Logs (Playwright)', { timeout: 120000 }, () => {
  let apiProcess = null;
  let webProcess = null;
  let browser = null;
  let prisma = null;

  const API_PORT = 5000;
  const WEB_PORT = 3100;
  const testDbUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';

  function killProcWithTree(proc) {
    return new Promise((resolve) => {
      if (!proc || !proc.pid) return resolve();
      treeKill(proc.pid, 'SIGKILL', () => {
        setTimeout(resolve, 600);
      });
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
    try {
      prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      await prisma.users.updateMany({
        data: { failed_logins: 0, locked_until: null },
      });

      // 1. Check or start API on port 5000 targeting test DB
      try {
        await waitForHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`, 1500);
        console.log('API server already running on port 5000');
      } catch {
        console.log('Starting API server on port 5000...');
        apiProcess = spawn(process.execPath, [apiEntry], {
          cwd: apiDir,
          env: { ...process.env, PORT: String(API_PORT), NODE_ENV: 'test', DATABASE_URL: testDbUrl, DATABASE_URL_TEST: testDbUrl },
        });
        await waitForHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`, 20000);
        console.log('API server ready on port 5000');
      }

      // 2. Check or start Web on port 3100
      try {
        await waitForHttp(`http://127.0.0.1:${WEB_PORT}/login`, 1500);
        console.log('Web server already running on port 3100');
      } catch {
        console.log('Starting Next.js server on port 3100...');
        const distDir = fs.existsSync(path.join(webDir, '.next-build')) ? '.next-build' : '.next';
        webProcess = spawn(process.execPath, [nextBin, 'start', '-p', String(WEB_PORT)], {
          cwd: webDir,
          env: {
            ...process.env,
            PORT: String(WEB_PORT),
            NODE_ENV: 'production',
            NEXT_DIST_DIR: distDir,
            API_ORIGIN: `http://127.0.0.1:${API_PORT}`,
            NEXT_PUBLIC_API_URL: '/api/v1',
            NEXT_PUBLIC_FEATURE_PLATFORM_ADMIN: 'false',
          },
        });
        await waitForHttp(`http://127.0.0.1:${WEB_PORT}/login`, 25000);
        console.log('Web server ready on port 3100');
      }

      // 3. Launch Playwright Chromium
      browser = await chromium.launch({ headless: true });
    } catch (err) {
      await Promise.all([killProcWithTree(apiProcess), killProcWithTree(webProcess)]);
      throw err;
    }
  });

  after(async () => {
    try {
      if (browser) {
        await browser.close().catch(() => {});
      }
      if (prisma) {
        await prisma.$disconnect().catch(() => {});
      }
    } finally {
      await Promise.all([killProcWithTree(apiProcess), killProcWithTree(webProcess)]);
    }
  });

  it('changes shift grace minutes in UI, reloads page, confirms persistence, and verifies audit & version records in DB', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Log in as Company Admin
    await page.goto(`http://127.0.0.1:${WEB_PORT}/login`);
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'admin@gulftech.ae');
    await page.fill('input[type="password"]', 'Nextal@2026!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    // 2. Navigate to /settings
    await page.goto(`http://127.0.0.1:${WEB_PORT}/settings`);
    await page.waitForSelector('#settings-tile-shifts_policies');

    // 3. Open Shifts & Attendance Policies drawer
    await page.click('#settings-tile-shifts_policies');
    await page.waitForSelector('[data-testid^="shift-card-"]', { timeout: 8000 });

    // 4. Click Edit on the first shift card
    const firstCard = page.locator('[data-testid^="shift-card-"]').first();
    const cardTestId = await firstCard.getAttribute('data-testid');
    const shiftId = cardTestId.replace('shift-card-', '');

    const editBtn = page.locator('[data-testid^="shift-edit-btn-"]').first();
    await editBtn.click();
    await page.waitForSelector('[data-testid="shift-grace-input"]');

    // 5. Read current value and toggle between 25 and 15
    const graceInput = page.locator('[data-testid="shift-grace-input"]').first();
    const currentVal = await graceInput.inputValue();
    const newGraceVal = currentVal === '25' ? '15' : '25';

    await graceInput.fill(newGraceVal);

    // 6. Click Save Policies & Shifts
    const saveBtn = page.locator('[data-testid="save-shifts-btn"]');
    await saveBtn.click();

    // Wait for mutation to complete and toast/cache update
    await page.waitForTimeout(2000);

    // 7. Reload page to verify real persistence from backend
    await page.reload();
    await page.waitForSelector('#settings-tile-shifts_policies', { timeout: 10000 });

    // 8. Re-open drawer and assert displayed grace minutes
    await page.click('#settings-tile-shifts_policies');
    await page.waitForSelector('[data-testid^="shift-card-"]', { timeout: 8000 });

    const graceDisplay = page.locator('[data-testid^="shift-grace-display-"]').first();
    const displayedText = await graceDisplay.innerText();
    assert.equal(
      displayedText.trim(),
      `${newGraceVal}m`,
      `Shift grace minutes must persist as ${newGraceVal}m across reload`
    );

    // 9. Verify PostgreSQL Database Audit Log for the edited shift
    const latestAudit = await prisma.audit_logs.findFirst({
      where: { table_name: 'shifts', action: 'UPDATE', record_id: shiftId },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(latestAudit, 'An audit_logs row must be created with entity: shifts and action: UPDATE');
    assert.equal(
      Number(latestAudit.new_values.grace_minutes),
      Number(newGraceVal),
      `Audit log new_values.grace_minutes must match updated value (${newGraceVal})`
    );

    // 10. Verify PostgreSQL Database Settings Version for the edited shift
    const latestVersion = await prisma.settings_versions.findFirst({
      where: { entity_type: 'shift', entity_id: shiftId },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(latestVersion, 'A settings_versions row must be created with entity_type: shift');
    assert.equal(
      Number(latestVersion.snapshot.grace_minutes),
      Number(newGraceVal),
      `Settings version snapshot.grace_minutes must match updated value (${newGraceVal})`
    );

    await context.close();
  });
});
