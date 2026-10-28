import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'docs/screenshots/phase6');
const WEB_PORT = 3100;

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const prisma = new PrismaClient();
  let browser = null;

  try {
    // Find October 2026 run ID dynamically
    const octRun = await prisma.pay_runs.findFirst({
      where: {
        period_month: new Date('2026-10-01'),
      },
      select: { id: true, status: true },
    });

    const runId = octRun?.id || '5b5c2dae-da23-42f1-b3a9-794213884066';
    console.log(`Using October 2026 Pay Run ID: ${runId}`);

    console.log('1. Launching Chromium...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2, // High resolution
    });

    const page = await context.newPage();

    // 2. Login as Finance Manager
    console.log('2. Logging in as finance@gulftech.ae...');
    await page.goto(`http://localhost:${WEB_PORT}/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'finance@gulftech.ae');
    await page.fill('input[type="password"]', 'Nextal@2026!');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log('Login successful.');

    // Ensure dark theme is active
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    });
    await page.waitForTimeout(500);

    // Screen 1: Pay Runs List
    console.log('3. Capturing pay_runs_list.png...');
    await page.goto(`http://localhost:${WEB_PORT}/payroll`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const listPath = path.join(outDir, 'pay_runs_list.png');
    await page.screenshot({ path: listPath, fullPage: false });
    console.log(`Saved: ${listPath}`);

    // Screen 2: Pay Run Detail Summary
    console.log('4. Capturing pay_run_detail_summary.png...');
    await page.goto(`http://localhost:${WEB_PORT}/payroll/${runId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const summaryPath = path.join(outDir, 'pay_run_detail_summary.png');
    await page.screenshot({ path: summaryPath, fullPage: false });
    console.log(`Saved: ${summaryPath}`);

    // Screen 3: Pay Run Detail Validation Issues
    console.log('5. Capturing pay_run_detail_validation.png...');
    // Click on Validation Issues tab
    const validationTab = page.locator('button', { hasText: /Validation Issues/i });
    if (await validationTab.count() > 0) {
      await validationTab.first().click();
    } else {
      console.warn('Validation tab button not found by text, trying fallback');
    }
    await page.waitForTimeout(1000);
    const validationPath = path.join(outDir, 'pay_run_detail_validation.png');
    await page.screenshot({ path: validationPath, fullPage: false });
    console.log(`Saved: ${validationPath}`);

    // Screen 4: Pay Run Detail Payslips & Breakdown Modal
    console.log('6. Capturing pay_run_detail_payslips.png...');
    const payslipsTab = page.locator('button', { hasText: /Payslips/i });
    if (await payslipsTab.count() > 0) {
      await payslipsTab.first().click();
    }
    await page.waitForTimeout(1500);

    // Click "Breakdown" button on the first row
    const breakdownBtn = page.locator('button', { hasText: 'Breakdown' });
    if (await breakdownBtn.count() > 0) {
      await breakdownBtn.first().click();
      await page.waitForTimeout(1000);
    } else {
      console.warn('Breakdown button not found');
    }
    const payslipModalPath = path.join(outDir, 'pay_run_detail_payslips.png');
    await page.screenshot({ path: payslipModalPath, fullPage: false });
    console.log(`Saved: ${payslipModalPath}`);

    // Close the modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Screen 5: Pay Run Detail Variances
    console.log('7. Capturing pay_run_detail_variances.png...');
    const variancesTab = page.locator('button', { hasText: /Variances/i });
    if (await variancesTab.count() > 0) {
      await variancesTab.first().click();
    }
    await page.waitForTimeout(1500);
    const variancesPath = path.join(outDir, 'pay_run_detail_variances.png');
    await page.screenshot({ path: variancesPath, fullPage: false });
    console.log(`Saved: ${variancesPath}`);

    // Screen 6: Salary Adjustments
    console.log('8. Capturing salary_adjustments.png...');
    await page.goto(`http://localhost:${WEB_PORT}/payroll/adjustments`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const adjPath = path.join(outDir, 'salary_adjustments.png');
    await page.screenshot({ path: adjPath, fullPage: false });
    console.log(`Saved: ${adjPath}`);

    console.log('\nAll 6 Phase 6 screenshots successfully captured in docs/screenshots/phase6/!');
  } finally {
    if (browser) await browser.close().catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error('Phase 6 screenshot script failed:', err);
  process.exit(1);
});
