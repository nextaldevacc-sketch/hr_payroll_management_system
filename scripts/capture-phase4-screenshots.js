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
const outDir = path.resolve(rootDir, 'docs/screenshots/phase4');

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
      apiProc = spawn(process.execPath, ['src/index.js'], {
        cwd: apiDir,
        env: { ...process.env, PORT: String(API_PORT), NODE_ENV: 'development' },
        stdio: 'ignore',
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

    // Get an employee with versioned contracts (EMP-DXB-001)
    const emp = await prisma.employees.findFirst({
      where: { employee_code: 'EMP-DXB-001' },
    });
    if (!emp) throw new Error('EMP-DXB-001 not found in database. Seed needed?');
    const empId = emp.id;
    console.log(`Using employee EMP-DXB-001 (ID: ${empId}) for profile screenshots.`);

    console.log('3. Launching Chromium...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // 4. Log in as HR Manager (has salary access & HR verify permission)
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
        localStorage.setItem('nextal_language', lang);
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

    console.log('5. Capturing screenshots...');

    for (const cfg of configs) {
      console.log(`\n--- Config: ${cfg.suffix} ---`);

      // Screen 1: Employee List
      await page.goto(`http://localhost:${WEB_PORT}/employees`);
      await page.waitForSelector('#employee-search-input', { timeout: 10000 });
      await setEnvironment(cfg.theme, cfg.lang);
      await page.waitForTimeout(600);
      const listPath = path.join(outDir, `employee-list-${cfg.suffix}.png`);
      await page.screenshot({ path: listPath, fullPage: false });
      console.log(`Saved: employee-list-${cfg.suffix}.png`);

      // Screen 2: Employee Profile - Job & Contract Tab
      await page.goto(`http://localhost:${WEB_PORT}/employees/${empId}`);
      await page.waitForSelector('#tab-jobContract', { timeout: 10000 });
      await setEnvironment(cfg.theme, cfg.lang);
      await page.click('#tab-jobContract');
      await page.waitForTimeout(600);
      const jobPath = path.join(outDir, `employee-profile-job-${cfg.suffix}.png`);
      await page.screenshot({ path: jobPath, fullPage: false });
      console.log(`Saved: employee-profile-job-${cfg.suffix}.png`);

      // Screen 3: Employee Profile - Salary History Tab
      await page.click('#tab-salaryHistory');
      await page.waitForTimeout(600);
      const salPath = path.join(outDir, `employee-profile-salary-${cfg.suffix}.png`);
      await page.screenshot({ path: salPath, fullPage: false });
      console.log(`Saved: employee-profile-salary-${cfg.suffix}.png`);

      // Screen 4: New Employee Wizard
      await page.goto(`http://localhost:${WEB_PORT}/employees/new`);
      await page.waitForSelector('#btn-step1-submit', { timeout: 10000 });
      await setEnvironment(cfg.theme, cfg.lang);
      await page.waitForTimeout(600);
      const wizPath = path.join(outDir, `employee-wizard-${cfg.suffix}.png`);
      await page.screenshot({ path: wizPath, fullPage: false });
      console.log(`Saved: employee-wizard-${cfg.suffix}.png`);
    }

    console.log('\nAll 16 Phase 4 screenshots captured successfully!');
  } finally {
    if (browser) await browser.close().catch(() => {});
    await prisma.$disconnect().catch(() => {});
    await Promise.all([killProc(apiProc), killProc(webProc)]);
  }
}

main().catch((err) => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});
