import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import treeKill from 'tree-kill';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'backend');
const webDir = path.resolve(rootDir, 'frontend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');
const outDir = path.resolve(rootDir, 'docs/screenshots/phase7');

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

async function setEnvironment(page, theme, lang) {
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

async function loginAs(page, email, password = 'Nextal@2026!') {
  await page.goto(`http://localhost:${WEB_PORT}/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

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

    console.log('3. Launching Chromium...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const configs = [
      { lang: 'en', theme: 'light', suffix: 'en_light' },
      { lang: 'en', theme: 'dark', suffix: 'en_dark' },
      { lang: 'ar', theme: 'light', suffix: 'ar_light' },
      { lang: 'ar', theme: 'dark', suffix: 'ar_dark' },
    ];

    // ==========================================
    // Part A: Employee Self-Service Screenshots
    // ==========================================
    console.log('\n4. Capturing Employee Self-Service screens (employee@gulftech.ae)...');
    const empContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const empPage = await empContext.newPage();
    await loginAs(empPage, 'employee@gulftech.ae');

    for (const cfg of configs) {
      console.log(`- Employee screens [${cfg.suffix}]`);

      // Screen 1: My Home
      await empPage.goto(`http://localhost:${WEB_PORT}/me`, { waitUntil: 'networkidle' });
      await setEnvironment(empPage, cfg.theme, cfg.lang);
      await empPage.waitForTimeout(800);
      await empPage.screenshot({ path: path.join(outDir, `my_home_${cfg.suffix}.png`) });

      // Screen 2: My Payslips
      await empPage.goto(`http://localhost:${WEB_PORT}/me/payslips`, { waitUntil: 'networkidle' });
      await setEnvironment(empPage, cfg.theme, cfg.lang);
      await empPage.waitForTimeout(800);
      await empPage.screenshot({ path: path.join(outDir, `my_payslips_${cfg.suffix}.png`) });

      // Screen 3: My Requests
      await empPage.goto(`http://localhost:${WEB_PORT}/me/requests`, { waitUntil: 'networkidle' });
      await setEnvironment(empPage, cfg.theme, cfg.lang);
      await empPage.waitForTimeout(800);
      await empPage.screenshot({ path: path.join(outDir, `my_requests_${cfg.suffix}.png`) });
    }

    // Screen: My Home at 390px (Mobile view)
    console.log('- My Home at 390px mobile viewport');
    await empPage.setViewportSize({ width: 390, height: 844 });
    await empPage.goto(`http://localhost:${WEB_PORT}/me`, { waitUntil: 'networkidle' });
    await setEnvironment(empPage, 'dark', 'en');
    await empPage.waitForTimeout(800);
    await empPage.screenshot({ path: path.join(outDir, `my_home_390px.png`) });
    await empContext.close();

    // ==========================================
    // Part B: Dashboard as HR Manager
    // ==========================================
    console.log('\n5. Capturing Dashboard as HR Manager (hr.mgr@gulftech.ae)...');
    const hrContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const hrPage = await hrContext.newPage();
    await loginAs(hrPage, 'hr.mgr@gulftech.ae');

    for (const cfg of configs) {
      console.log(`- Dashboard HR Manager [${cfg.suffix}]`);
      await hrPage.goto(`http://localhost:${WEB_PORT}/`, { waitUntil: 'networkidle' });
      await setEnvironment(hrPage, cfg.theme, cfg.lang);
      await hrPage.waitForTimeout(1000);
      await hrPage.screenshot({ path: path.join(outDir, `dashboard_hr_manager_${cfg.suffix}.png`) });
    }
    await hrContext.close();

    // ==========================================
    // Part C: Dashboard as Dept Manager
    // ==========================================
    console.log('\n6. Capturing Dashboard as Dept Manager (dept.mgr@gulftech.ae)...');
    const deptContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const deptPage = await deptContext.newPage();
    await loginAs(deptPage, 'dept.mgr@gulftech.ae');

    for (const cfg of configs) {
      console.log(`- Dashboard Dept Manager [${cfg.suffix}]`);
      await deptPage.goto(`http://localhost:${WEB_PORT}/`, { waitUntil: 'networkidle' });
      await setEnvironment(deptPage, cfg.theme, cfg.lang);
      await deptPage.waitForTimeout(1000);
      await deptPage.screenshot({ path: path.join(outDir, `dashboard_dept_manager_${cfg.suffix}.png`) });
    }
    await deptContext.close();

    console.log('\nAll Phase 7 screenshots successfully captured in docs/screenshots/phase7/!');
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (apiProc) await killProc(apiProc);
    if (webProc) await killProc(webProc);
  }
}

main().catch((err) => {
  console.error('Phase 7 screenshot capture failed:', err);
  process.exit(1);
});

