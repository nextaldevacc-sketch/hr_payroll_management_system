import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/screenshots/phase3');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const combinations = [
  { locale: 'en', theme: 'light' },
  { locale: 'en', theme: 'dark' },
  { locale: 'ar', theme: 'light' },
  { locale: 'ar', theme: 'dark' },
];

async function run() {
  console.log('--- Starting Phase 3 Screenshot Capture ---');
  const browser = await chromium.launch({ headless: true });

  for (const { locale, theme } of combinations) {
    console.log(`\nCapturing views for [${locale.toUpperCase()}] [${theme.toUpperCase()}]...`);

    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      locale: locale === 'ar' ? 'ar-AE' : 'en-US',
    });

    await context.addCookies([
      { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' },
      { name: 'theme', value: theme, domain: 'localhost', path: '/' },
    ]);

    const page = await context.newPage();

    // Set theme and language in localStorage & root attributes
    await page.addInitScript(
      ({ loc, thm }) => {
        localStorage.setItem('theme', thm);
        localStorage.setItem('nextal_language', loc);
        document.documentElement.setAttribute('data-theme', thm);
        if (thm === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        if (loc === 'ar') {
          document.documentElement.setAttribute('dir', 'rtl');
          document.documentElement.setAttribute('lang', 'ar');
        } else {
          document.documentElement.setAttribute('dir', 'ltr');
          document.documentElement.setAttribute('lang', 'en');
        }
      },
      { loc: locale, thm: theme }
    );

    // 1. Settings Home Overview
    await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const homePath = path.join(outDir, `settings-home-${locale}-${theme}.png`);
    await page.screenshot({ path: homePath, fullPage: true });
    console.log(`  Saved: ${homePath}`);

    // 2. Salary Rules & Simulator Drawer
    const salaryTile = page.locator('#settings-tile-salary_rules');
    await salaryTile.click();
    await page.waitForTimeout(600);

    const salaryRulesPath = path.join(outDir, `salary-rules-${locale}-${theme}.png`);
    await page.screenshot({ path: salaryRulesPath, fullPage: true });
    console.log(`  Saved: ${salaryRulesPath}`);

    // Switch to simulator tab
    const simTab = page.locator('button:has-text("Test This Rule Simulator"), button:has-text("محاكي احتساب الراتب")');
    if (await simTab.count() > 0) {
      await simTab.first().click();
      await page.waitForTimeout(500);
      const simulatorPath = path.join(outDir, `salary-simulator-${locale}-${theme}.png`);
      await page.screenshot({ path: simulatorPath, fullPage: true });
      console.log(`  Saved: ${simulatorPath}`);
    }

    // Close drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 3. Approval Settings Drawer
    const approvalTile = page.locator('#settings-tile-approvals');
    await approvalTile.click();
    await page.waitForTimeout(600);

    const approvalsPath = path.join(outDir, `approval-settings-${locale}-${theme}.png`);
    await page.screenshot({ path: approvalsPath, fullPage: true });
    console.log(`  Saved: ${approvalsPath}`);

    await context.close();
  }

  await browser.close();
  console.log(`\nAll Phase 3 screenshots captured successfully to: ${outDir}`);
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
