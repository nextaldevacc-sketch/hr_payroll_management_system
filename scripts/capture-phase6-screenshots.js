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
const outDir = path.resolve(rootDir, 'docs/screenshots/phase6');

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
      // Check if build exists, otherwise run dev
      const hasBuild = fs.existsSync(path.join(webDir, '.next'));
      const commandArgs = hasBuild ? [nextBin, 'start', '-p', String(WEB_PORT)] : [nextBin, 'dev', '-p', String(WEB_PORT)];
      webProc = spawn(process.execPath, commandArgs, {
        cwd: webDir,
        env: { ...process.env, PORT: String(WEB_PORT), NODE_ENV: hasBuild ? 'production' : 'development' },
        stdio: 'ignore',
      });
      await waitForHttp(`http://localhost:${WEB_PORT}/login`, 35000);
      console.log('Web server started.');
    }

    // Find October 2026 run ID dynamically
    const octRun = await prisma.pay_runs.findFirst({
      where: {
        period_month: new Date('2026-10-01'),
      },
      select: { id: true, status: true },
    });

    const runId = octRun?.id;
    if (!runId) throw new Error('No October 2026 pay run found in DB');
    console.log(`Using October 2026 Pay Run ID: ${runId}`);

    console.log('3. Launching Chromium...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    // 4. Login as Finance Manager
    console.log('4. Logging in as finance@gulftech.ae...');
    await page.goto(`http://localhost:${WEB_PORT}/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', 'finance@gulftech.ae');
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
      await page.waitForTimeout(500);
    }

    const configs = [
      { lang: 'en', theme: 'light', suffix: 'en_light' },
      { lang: 'en', theme: 'dark', suffix: 'en_dark' },
      { lang: 'ar', theme: 'light', suffix: 'ar_light' },
      { lang: 'ar', theme: 'dark', suffix: 'ar_dark' },
    ];

    console.log('\n5. Capturing Full Phase 6 Screenshot Matrix...');

    for (const cfg of configs) {
      console.log(`\n--- Capturing matrix for [${cfg.suffix}] ---`);

      // 1. Pay Runs List
      await page.goto(`http://localhost:${WEB_PORT}/payroll`, { waitUntil: 'networkidle' });
      await setEnvironment(cfg.theme, cfg.lang);
      await page.waitForTimeout(1000);
      const listPath = path.join(outDir, `pay_runs_list_${cfg.suffix}.png`);
      await page.screenshot({ path: listPath });
      console.log(`Saved: ${listPath}`);

      // 2. Pay Run Detail - Validation tab
      await page.goto(`http://localhost:${WEB_PORT}/payroll/${runId}`, { waitUntil: 'networkidle' });
      await setEnvironment(cfg.theme, cfg.lang);
      const validationTab = page.locator('button', { hasText: /Validation|التحقق/i });
      if (await validationTab.count() > 0) {
        await validationTab.first().click();
        await page.waitForTimeout(800);
      }
      const valPath = path.join(outDir, `pay_run_detail_validation_${cfg.suffix}.png`);
      await page.screenshot({ path: valPath });
      console.log(`Saved: ${valPath}`);

      // 3. Pay Run Detail - Variances tab
      const variancesTab = page.locator('button', { hasText: /Variances|الفروقات/i });
      if (await variancesTab.count() > 0) {
        await variancesTab.first().click();
        await page.waitForTimeout(800);
      }
      const varPath = path.join(outDir, `pay_run_detail_variances_${cfg.suffix}.png`);
      await page.screenshot({ path: varPath });
      console.log(`Saved: ${varPath}`);

      // 4. Payslip (Open Payslips tab and click Breakdown modal)
      const payslipsTab = page.locator('button', { hasText: /Payslips|قسائم/i });
      if (await payslipsTab.count() > 0) {
        await payslipsTab.first().click();
        await page.waitForTimeout(800);
      }
      const breakdownBtn = page.locator('button', { hasText: /Breakdown|تفاصيل/i });
      if (await breakdownBtn.count() > 0) {
        await breakdownBtn.first().click();
        await page.waitForTimeout(800);
      }
      const payslipPath = path.join(outDir, `payslip_${cfg.suffix}.png`);
      await page.screenshot({ path: payslipPath });
      console.log(`Saved: ${payslipPath}`);

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    console.log('\nAll 16 Phase 6 matrix screenshots captured successfully!');
  } finally {
    if (browser) await browser.close().catch(() => {});
    await prisma.$disconnect().catch(() => {});
    if (apiProc) await killProc(apiProc);
    if (webProc) await killProc(webProc);
  }
}

main().catch((err) => {
  console.error('Phase 6 screenshot script failed:', err);
  process.exit(1);
});
