import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import treeKill from 'tree-kill';
import prisma from '../backend/src/lib/prisma.js';
import separationService from '../backend/src/services/separationService.js';
import settlementService from '../backend/src/services/settlementService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'backend');
const webDir = path.resolve(rootDir, 'frontend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');
const outDir = path.resolve(rootDir, 'docs/screenshots/phase8');

const API_PORT = 5000;
const WEB_PORT = 3100;

function killProc(proc) {
  return new Promise((resolve) => {
    if (!proc || !proc.pid) return resolve();
    treeKill(proc.pid, 'SIGKILL', () => resolve());
  });
}

function waitForHttp(url, timeoutMs = 35000) {
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
  await page.waitForTimeout(600);
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

  console.log('Ensuring sample separation & settlement data exists for screenshot capture...');
  const company = await prisma.$base().companies.findFirst({
    where: { name: 'Gulf Tech Logistics LLC' },
  });

  const hrUser = await prisma.$base().users.findFirst({
    where: { company_id: company.id, email: { contains: 'hr.mgr' } },
  });
  const gmUser = await prisma.$base().users.findFirst({
    where: { company_id: company.id, email: { contains: 'gm' } },
  });
  const payrollUser = await prisma.$base().users.findFirst({
    where: { company_id: company.id, email: { contains: 'payroll' } },
  });

  const baseEmp = await prisma.$base().employees.findFirst({
    where: { company_id: company.id, status: 'Active' },
    include: { contracts: true },
  });

  // Create or verify Omar separation
  let omar = await prisma.$base().employees.findFirst({
    where: { company_id: company.id, employee_code: 'EMP-SAMPLE-OMAR' },
  });

  if (!omar) {
    omar = await prisma.$base().employees.create({
      data: {
        company_id: company.id,
        company_visa_id: baseEmp.company_visa_id,
        branch_id: baseEmp.branch_id,
        department_id: baseEmp.department_id,
        employee_code: 'EMP-SAMPLE-OMAR',
        name: 'Omar Al-Hashimi',
        arabic_name: 'عمر الهاشمي',
        gender: 'Male',
        nationality: 'ARE',
        residency_type: 'National',
        joining_date: new Date('2019-10-31'),
        status: 'Active',
      },
    });

    const c = baseEmp.contracts[0];
    await prisma.$base().contracts.create({
      data: {
        company_id: company.id,
        employee_id: omar.id,
        contract_type: 'Unlimited',
        start_date: new Date('2019-10-31'),
        job_id: c.job_id,
        department_id: c.department_id,
        shift_id: c.shift_id,
        attendance_policy_id: c.attendance_policy_id,
        structure_id: c.structure_id,
        basic: 6000.0,
        housing: 3000.0,
        transport: 1000.0,
        gross: 10000.0,
        effective_date: new Date('2019-10-31'),
        status: 'Active',
      },
    });
  }

  let sep = await prisma.$base().separations.findFirst({
    where: { company_id: company.id, employee_id: omar.id },
  });

  if (!sep) {
    sep = await separationService.createSeparation(
      company.id,
      {
        employee_id: omar.id,
        type: 'Resignation',
        reason: 'Personal relocation abroad',
        notice_date: '2026-09-30',
        last_working_day: '2026-10-31',
        auto_approve: true,
      },
      hrUser.id
    );
  }

  // Clear 3 items, leave 1 pending to show realistic progress
  const items = await prisma.$base().clearance_items.findMany({
    where: { separation_id: sep.id },
  });
  if (items.length >= 3) {
    await separationService.updateClearanceItem(company.id, items[0].id, { status: 'Cleared', amount_due: 0, note: 'MacBook Pro & monitor returned' }, hrUser);
    await separationService.updateClearanceItem(company.id, items[1].id, { status: 'Cleared', amount_due: 0, note: 'ID card and access badge handed over' }, hrUser);
    await separationService.updateClearanceItem(company.id, items[2].id, { status: 'Cleared', amount_due: 0, note: 'No outstanding advances or corporate card dues' }, hrUser);
  }

  // Ensure settlement is prepared
  let finalSet = await prisma.$base().final_settlements.findUnique({
    where: { separation_id: sep.id },
  });
  if (!finalSet) {
    finalSet = await settlementService.prepareSettlement(
      company.id,
      sep.id,
      {
        basicSalary: 6000.0,
        grossSalary: 10000.0,
        serviceYears: 7.0,
        unusedLeaveDays: 12,
        salaryDue: 10000.0,
        loanRecovery: 0,
      },
      payrollUser.id
    );
  }

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
        stdio: 'ignore',
      });
      await waitForHttp(`http://localhost:${API_PORT}/api/v1/health`, 30000);
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

    console.log('\n4. Capturing Phase 8 Offboarding screens (hr.mgr@gulftech.ae)...');
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await loginAs(page, 'hr.mgr@gulftech.ae');

    for (const cfg of configs) {
      console.log(`- Capturing [${cfg.suffix}]`);

      // Screen 1: Separations List
      await page.goto(`http://localhost:${WEB_PORT}/offboarding`, { waitUntil: 'networkidle' });
      await setEnvironment(page, cfg.theme, cfg.lang);
      await page.waitForTimeout(1000);
      const listPath = path.join(outDir, `separation_list_${cfg.suffix}.png`);
      await page.screenshot({ path: listPath });
      console.log(`  Saved: ${listPath}`);

      // Click on Manage to open detailed clearance tab
      const manageBtn = await page.locator('button:has-text("Manage")').first();
      if (await manageBtn.isVisible()) {
        await manageBtn.click();
        await page.waitForTimeout(800);
      }

      // Screen 2: Clearance Checklist
      const clearPath = path.join(outDir, `clearance_checklist_${cfg.suffix}.png`);
      await page.screenshot({ path: clearPath });
      console.log(`  Saved: ${clearPath}`);

      // Click on Settlement tab
      const settlementTab = await page.locator('button:has-text("Final Settlement"), button:has-text("التسوية النهائية")').first();
      if (await settlementTab.isVisible()) {
        await settlementTab.click();
        await page.waitForTimeout(1000);
      }

      // Screen 3: Final Settlement
      const setPath = path.join(outDir, `final_settlement_${cfg.suffix}.png`);
      await page.screenshot({ path: setPath });
      console.log(`  Saved: ${setPath}`);
    }

    console.log('\nAll Phase 8 screenshots captured successfully!');
  } finally {
    if (browser) await browser.close();
    if (webProc) await killProc(webProc);
    if (apiProc) await killProc(apiProc);
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

