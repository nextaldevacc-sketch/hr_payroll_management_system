import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import treeKill from 'tree-kill';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'backend');
const webDir = path.resolve(rootDir, 'frontend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');
const outDir = path.resolve(rootDir, 'docs/screenshots/phase5');

const API_PORT = 5000;
const WEB_PORT = 3100;

function killProc(proc) {
  return new Promise((resolve) => {
    if (!proc || !proc.pid) return resolve();
    treeKill(proc.pid, 'SIGKILL', () => resolve());
  });
}

function waitForHttp(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode < 500) {
          clearInterval(interval);
          resolve();
        }
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for ${url}`));
        }
      });
      req.setTimeout(1000, () => req.destroy());
    }, 500);
  });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const prisma = new PrismaClient();
  let apiProc = null;
  let webProc = null;
  let browser = null;

  try {
    console.log('1. Checking or starting API server on port 5000...');
    try {
      await waitForHttp(`http://localhost:${API_PORT}/api/v1/health`, 1500);
      console.log('API is already running on 5000.');
    } catch {
      apiProc = spawn(process.execPath, ['--env-file=.env', 'src/server.js'], {
        cwd: apiDir,
        env: { ...process.env, PORT: String(API_PORT), NODE_ENV: 'development' },
        stdio: 'inherit',
      });
      await waitForHttp(`http://localhost:${API_PORT}/api/v1/health`, 25000);
      console.log('API server started.');
    }

    console.log('2. Checking or starting Web server on port 3100...');
    try {
      await waitForHttp(`http://localhost:${WEB_PORT}/login`, 1500);
      console.log('Web server is already running on 3100.');
    } catch {
      webProc = spawn(process.execPath, [nextBin, 'start', '-p', String(WEB_PORT)], {
        cwd: webDir,
        env: { ...process.env, PORT: String(WEB_PORT), NODE_ENV: 'production' },
        stdio: 'ignore',
      });
      await waitForHttp(`http://localhost:${WEB_PORT}/login`, 25000);
      console.log('Web server started.');
    }

    console.log('3. Launching Chromium...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // 4. Log in as HR Manager
    console.log('4. Logging in as Maryam Al-Nuaimi (HR Manager)...');
    await page.goto(`http://localhost:${WEB_PORT}/login`);
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'hr.mgr@gulftech.ae');
    await page.fill('input[type="password"]', 'Nextal@2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log('Login successful.');

    // Helper to configure theme & language
    async function setEnvironment(theme, lang) {
      await page.evaluate(({ theme, lang }) => {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
      }, { theme, lang });
      await page.waitForTimeout(400);
    }

    const configs = [
      { lang: 'en', theme: 'light', suffix: 'en-light' },
      { lang: 'en', theme: 'dark', suffix: 'en-dark' },
      { lang: 'ar', theme: 'light', suffix: 'ar-light' },
      { lang: 'ar', theme: 'dark', suffix: 'ar-dark' },
    ];

    console.log('5. Capturing Phase 5 screenshots...');

    for (const cfg of configs) {
      console.log(`\n--- Config: ${cfg.suffix} ---`);

      // Screen 1: Attendance Daily Grid
      await page.goto(`http://localhost:${WEB_PORT}/attendance`);
      await page.waitForSelector('#tab-attendance-grid', { timeout: 10000 });
      await setEnvironment(cfg.theme, cfg.lang);
      await page.click('#tab-attendance-grid');
      await page.waitForSelector('#attendance-daily-grid', { timeout: 10000 });
      await page.waitForTimeout(600);
      const gridPath = path.join(outDir, `attendance-grid-${cfg.suffix}.png`);
      await page.screenshot({ path: gridPath, fullPage: false });
      console.log(`Saved: attendance-grid-${cfg.suffix}.png`);

      // Screen 2: Overtime Requests
      await page.click('#tab-overtime-requests');
      await page.waitForSelector('#overtime-table', { timeout: 10000 });
      await page.waitForTimeout(600);
      const otPath = path.join(outDir, `overtime-requests-${cfg.suffix}.png`);
      await page.screenshot({ path: otPath, fullPage: false });
      console.log(`Saved: overtime-requests-${cfg.suffix}.png`);

      // Screen 3: Leave Request Form (Modal)
      await page.goto(`http://localhost:${WEB_PORT}/leave`);
      await page.waitForSelector('#new-leave-request-btn', { timeout: 10000 });
      await setEnvironment(cfg.theme, cfg.lang);
      await page.click('#new-leave-request-btn');
      await page.waitForSelector('#submit-leave-btn', { timeout: 8000 });
      await page.waitForTimeout(600);
      const formPath = path.join(outDir, `leave-request-form-${cfg.suffix}.png`);
      await page.screenshot({ path: formPath, fullPage: false });
      console.log(`Saved: leave-request-form-${cfg.suffix}.png`);

      // Close modal by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Screen 4: Approval Inbox
      await page.click('#tab-approval-inbox');
      await page.waitForSelector('#leave-requests-table', { timeout: 10000 });
      await page.waitForTimeout(600);
      const inboxPath = path.join(outDir, `approval-inbox-${cfg.suffix}.png`);
      await page.screenshot({ path: inboxPath, fullPage: false });
      console.log(`Saved: approval-inbox-${cfg.suffix}.png`);
    }

    console.log('\nAll 16 Phase 5 screenshots captured successfully in docs/screenshots/phase5/!');
  } finally {
    if (browser) await browser.close().catch(() => {});
    await prisma.$disconnect().catch(() => {});
    await Promise.all([killProc(apiProc), killProc(webProc)]);
  }
}

main().catch((err) => {
  console.error('Phase 5 screenshot script failed:', err);
  process.exit(1);
});
