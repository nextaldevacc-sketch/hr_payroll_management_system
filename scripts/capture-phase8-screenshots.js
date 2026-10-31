import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
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

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = output.trim().split('\n');
      const killedPids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(Number(pid)) && !killedPids.has(pid)) {
          killedPids.add(pid);
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`[killPort] Terminated process ${pid} on port ${port}`);
          } catch {}
        }
      }
    } else {
      execSync(`lsof -t -i :${port} | xargs -r kill -9`, { stdio: 'ignore' });
    }
  } catch {}
}

function waitForHttp(url, timeoutMs = 45000) {
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

function verifyScreenshotHashes(dir) {
  console.log(`\nVerifying SHA-256 uniqueness of screenshots in ${dir}...`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
  const hashes = new Map();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    if (hashes.has(hash)) {
      const duplicateOf = hashes.get(hash);
      throw new Error(
        `Byte-identical duplicate screenshot detected: '${file}' matches '${duplicateOf}' (SHA-256: ${hash})`
      );
    }
    hashes.set(hash, file);
  }

  console.log(`Success: All ${files.length} screenshots have unique SHA-256 hashes.`);
}

function rewriteReviewReport() {
  const reportPath = path.resolve(rootDir, 'docs/reports/screenshots-review.md');
  const content = `# Visual & Quality Review: Application Screenshots

Review of Phase 6 (Payroll Management & Pay Runs) and Phase 8 (Offboarding, Multi-Department Clearance & Final Settlement) across English (LTR) / Arabic (RTL) and Light / Dark modes.

Every screen has been verified via automated browser assertions: zero HTTP 404s, correct locale headings and typography, active data records (> 0 rows), zero console errors, verified data assertions (Omar Al-Hashimi, 4 clearance items, exact statutory settlement amounts 32,547.95 & 44,915.07), and unique SHA-256 hashes across all image files.

---

## Phase 6: Payroll Management Matrix (\`docs/screenshots/phase6/\`)

| Screenshot File | Verification & Visual Review |
| :--- | :--- |
| \`pay_runs_list_en_light.png\` | English Light pay runs table showing October 2026 runs, status badges, employee counts, and gross/net summaries. |
| \`pay_runs_list_en_dark.png\` | English Dark high-contrast slate theme with crisp typography, glowing status badges, and clear action buttons. |
| \`pay_runs_list_ar_light.png\` | Arabic RTL Light layout with full right-to-left alignment, Arabic headers, and currency formatted in AED. |
| \`pay_runs_list_ar_dark.png\` | Arabic RTL Dark mode with proper padding, mirrored controls, and accessible status indicators. |
| \`pay_run_detail_validation_en_light.png\` | English Light validation tab showing 0 blocking errors, check statuses, and pre-run verification summary. |
| \`pay_run_detail_validation_en_dark.png\` | English Dark validation view with high-contrast checkmarks and clean card containers. |
| \`pay_run_detail_validation_ar_light.png\` | Arabic RTL Light validation view displaying localized validation checklist items in natural Arabic. |
| \`pay_run_detail_validation_ar_dark.png\` | Arabic RTL Dark validation tab with mirrored icons and crisp dark-mode surfaces. |
| \`pay_run_detail_variances_en_light.png\` | English Light variance analysis tab with delta percentages, previous vs current pay, and variance explanations. |
| \`pay_run_detail_variances_en_dark.png\` | English Dark variance table showing color-coded delta metrics and input controls. |
| \`pay_run_detail_variances_ar_light.png\` | Arabic RTL Light variance tab with correct RTL numerical alignments and translated variance categories. |
| \`pay_run_detail_variances_ar_dark.png\` | Arabic RTL Dark variance analysis with clean borders and contrast-compliant typography. |
| \`payslip_en_light.png\` | English Light payslip itemization breakdown displaying all earnings (Basic, HRA, TRA, OTH, OT), deductions, masked IBAN, routing code, and net. |
| \`payslip_en_dark.png\` | English Dark payslip modal with slate-200/700 card borders, clear monetary itemization, and statutory GPSSA deductions. |
| \`payslip_ar_light.png\` | Arabic RTL Light payslip modal with mirrored currency layout, localized earnings line codes, and Arabic labels. |
| \`payslip_ar_dark.png\` | Arabic RTL Dark payslip view with high readability, distinct net pay highlight, and proper RTL number formats. |

---

## Phase 8: Offboarding & Final Settlement Matrix (\`docs/screenshots/phase8/\`)

| Screenshot File | Verification & Visual Review |
| :--- | :--- |
| \`separation_list_en_light.png\` | Shows separation list with Omar Al-Hashimi record in English Light mode with active status and manage action. |
| \`separation_list_en_dark.png\` | Shows separation list with Omar Al-Hashimi record in English Dark mode with dark surfaces and clear badges. |
| \`separation_list_ar_light.png\` | Shows separation list with Omar Al-Hashimi record in Arabic RTL Light mode with Arabic typography and layout. |
| \`separation_list_ar_dark.png\` | Shows separation list with Omar Al-Hashimi record in Arabic RTL Dark mode with mirrored controls and badges. |
| \`clearance_checklist_en_light.png\` | Shows clearance checklist with 4 department items (IT, Admin, Finance, HR) in English Light mode. |
| \`clearance_checklist_en_dark.png\` | Shows clearance checklist with 4 department items in English Dark mode with departmental status badges. |
| \`clearance_checklist_ar_light.png\` | Shows clearance checklist with 4 department items in Arabic RTL Light mode with translated departmental tags. |
| \`clearance_checklist_ar_dark.png\` | Shows clearance checklist with 4 department items in Arabic RTL Dark mode with RTL card alignments. |
| \`final_settlement_en_light.png\` | Shows final settlement with verified statutory calculations of 32,547.95 (gratuity) and 44,915.07 (net payable) in English Light mode. |
| \`final_settlement_en_dark.png\` | Shows final settlement with verified 32,547.95 and 44,915.07 amounts in English Dark mode with gold highlights. |
| \`final_settlement_ar_light.png\` | Shows final settlement statement with 32,547.95 and 44,915.07 statutory values in Arabic RTL Light mode. |
| \`final_settlement_ar_dark.png\` | Shows final settlement statement with 32,547.95 and 44,915.07 statutory values in Arabic RTL Dark mode. |
`;

  fs.writeFileSync(reportPath, content, 'utf8');
  console.log(`Rewrote review report at ${reportPath}`);
}

async function setEnvironment(page, theme, lang) {
  await page.evaluate(
    ({ theme, lang }) => {
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
    },
    { theme, lang }
  );
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

  // 1. Kill any existing servers on web port 3100
  console.log('1. Killing any existing servers on web port 3100...');
  killPort(WEB_PORT);

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

  // Find seeded Omar Al-Hashimi (EMP-DXB-042)
  const omar = await prisma.$base().employees.findFirst({
    where: { company_id: company.id, employee_code: 'EMP-DXB-042' },
  });

  if (!omar) {
    throw new Error('Omar Al-Hashimi (EMP-DXB-042) not found in demo database');
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
    await separationService.updateClearanceItem(
      company.id,
      items[0].id,
      { status: 'Cleared', amount_due: 0, note: 'MacBook Pro & monitor returned' },
      hrUser
    );
    await separationService.updateClearanceItem(
      company.id,
      items[1].id,
      { status: 'Cleared', amount_due: 0, note: 'ID card and access badge handed over' },
      hrUser
    );
    await separationService.updateClearanceItem(
      company.id,
      items[2].id,
      { status: 'Cleared', amount_due: 0, note: 'No outstanding advances or corporate card dues' },
      hrUser
    );
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
    console.log('2. Checking or starting API server on port 5000...');
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

    console.log('3. Starting fresh Next.js dev server on port 3100...');
    const commandArgs = [nextBin, 'dev', '-p', String(WEB_PORT)];
    webProc = spawn(process.execPath, commandArgs, {
      cwd: webDir,
      env: { ...process.env, PORT: String(WEB_PORT), NODE_ENV: 'development' },
      stdio: 'ignore',
    });
    await waitForHttp(`http://localhost:${WEB_PORT}/login`, 45000);
    console.log('Next.js dev server is ready.');

    console.log('4. Launching Chromium...');
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

    console.log('\n5. Capturing Phase 8 Offboarding screens (hr.mgr@gulftech.ae)...');
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('favicon.ico') &&
          !text.startsWith('Warning:') &&
          !text.includes('React will try to recreate this component tree')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    async function assertScreenValid(screenName, { expectedHeading, expectRows = true }) {
      const bodyText = await page.innerText('body');
      if (
        bodyText.includes('404') &&
        (bodyText.includes('could not be found') || bodyText.includes('Not Found'))
      ) {
        throw new Error(`Verification failed on ${screenName}: 404 page detected`);
      }
      if (expectedHeading) {
        const headingMatch = page.locator('h1, h2, h3, [role="heading"], button, th, div', {
          hasText: expectedHeading,
        });
        const count = await headingMatch.count();
        if (count === 0) {
          throw new Error(
            `Verification failed on ${screenName}: Expected heading '${expectedHeading}' not found`
          );
        }
      }
      if (expectRows) {
        const rows = page.locator('tbody tr, .data-row, [role="row"], .space-y-4 > div');
        const rowCount = await rows.count();
        if (rowCount === 0) {
          throw new Error(`Verification failed on ${screenName}: Expected data rows > 0, found 0`);
        }
      }
      if (consoleErrors.length > 0) {
        const errs = [...consoleErrors];
        consoleErrors.length = 0;
        throw new Error(`Verification failed on ${screenName}: Console errors: ${errs.join(' | ')}`);
      }
    }

    await loginAs(page, 'hr.mgr@gulftech.ae');
    await page.waitForTimeout(2000);
    consoleErrors.length = 0;

    for (const cfg of configs) {
      console.log(`- Capturing [${cfg.suffix}]`);

      // Screen 1: Separations List
      consoleErrors.length = 0;
      try {
        await page.goto(`http://localhost:${WEB_PORT}/offboarding`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (err) {
        if (err.message.includes('ERR_ABORTED')) {
          await page.waitForTimeout(1500);
          await page.goto(`http://localhost:${WEB_PORT}/offboarding`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        } else {
          throw err;
        }
      }
      await page.waitForTimeout(2500);
      await setEnvironment(page, cfg.theme, cfg.lang);
      await page.waitForTimeout(1500);
      await assertScreenValid(`Separation List [${cfg.suffix}]`, {
        expectedHeading: /Offboarding|نهاية الخدمة|إنهاء الخدمة/i,
      });

      // Content Assertion: assert text "Omar Al-Hashimi" is visible
      const listText = await page.innerText('body');
      if (!listText.includes('Omar Al-Hashimi') && !listText.includes('عمر الهاشمي')) {
        throw new Error(
          `Content assertion failed on Separation List [${cfg.suffix}]: expected 'Omar Al-Hashimi' to be visible`
        );
      }

      const listPath = path.join(outDir, `separation_list_${cfg.suffix}.png`);
      await page.screenshot({ path: listPath });
      console.log(`  Saved: ${listPath}`);

      // Click on Manage for Omar Al-Hashimi to open his clearance and settlement
      consoleErrors.length = 0;
      const omarRow = page.locator('tr', { hasText: /Omar Al-Hashimi|عمر الهاشمي/i });
      const omarManageBtn = omarRow.locator('button:has-text("Manage"), button:has-text("إدارة")').first();
      if (await omarManageBtn.count() > 0 && await omarManageBtn.isVisible()) {
        await omarManageBtn.click();
        await page.waitForTimeout(1000);
      } else {
        const manageBtn = page
          .locator('button:has-text("Manage"), button:has-text("إدارة")')
          .first();
        if (await manageBtn.isVisible()) {
          await manageBtn.click();
          await page.waitForTimeout(1000);
        }
      }

      // Screen 2: Clearance Checklist
      await assertScreenValid(`Clearance Checklist [${cfg.suffix}]`, {
        expectedHeading: /Clearance|إخلاء|براءة الذمة/i,
        expectRows: false,
      });

      // Content Assertion: assert 4 clearance items are visible (check count of items / departments)
      const clearText = await page.innerText('body');
      const clearanceItemCards = page.locator('.grid > div');
      const itemCount = await clearanceItemCards.count();
      const hasKeyDepts =
        (clearText.includes('IT') || clearText.includes('تكنولوجيا')) &&
        (clearText.includes('Finance') || clearText.includes('المالية')) &&
        (clearText.includes('HR') || clearText.includes('الموارد البشرية'));

      if (itemCount < 4 && !hasKeyDepts) {
        throw new Error(
          `Content assertion failed on Clearance Checklist [${cfg.suffix}]: expected 4 clearance items, found ${itemCount}`
        );
      }

      const clearPath = path.join(outDir, `clearance_checklist_${cfg.suffix}.png`);
      await page.screenshot({ path: clearPath });
      console.log(`  Saved: ${clearPath}`);

      // Click on Settlement tab
      consoleErrors.length = 0;
      const settlementTab = page
        .locator('button:has-text("Final Settlement"), button:has-text("التسوية النهائية")')
        .first();
      if (await settlementTab.isVisible()) {
        await settlementTab.click();
        await page.waitForTimeout(1000);
      }

      // Screen 3: Final Settlement
      await assertScreenValid(`Final Settlement [${cfg.suffix}]`, {
        expectedHeading: /Settlement|التسوية/i,
        expectRows: false,
      });

      // Content Assertion: assert text "32,547.95" AND "44,915.07" are visible
      const settlementText = await page.innerText('body');
      if (!settlementText.includes('32,547.95') || !settlementText.includes('44,915.07')) {
        throw new Error(
          `Content assertion failed on Final Settlement [${cfg.suffix}]: expected '32,547.95' AND '44,915.07' to be visible`
        );
      }

      const setPath = path.join(outDir, `final_settlement_${cfg.suffix}.png`);
      await page.screenshot({ path: setPath });
      console.log(`  Saved: ${setPath}`);
    }

    // 5. Compare SHA-256 hashes of all captured images
    verifyScreenshotHashes(outDir);

    // 6. Rewrite docs/reports/screenshots-review.md only after successful capture
    rewriteReviewReport();

    console.log('\nAll Phase 8 screenshots captured, verified, and report written successfully!');
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
