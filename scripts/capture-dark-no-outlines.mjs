import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/screenshots/gold-e6a60e');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [1920, 1440];
const locales = ['en', 'ar'];

async function run() {
  console.log('--- Starting Dark Mode Outline & Empty Band Verification ---');
  const browser = await chromium.launch();
  const summary = {
    screenshots: [],
    inspectedElements: [],
    emptyBands: {},
    passed: true,
  };

  for (const locale of locales) {
    for (const width of viewports) {
      const name = `${locale}-dark-${width}px`;
      console.log(`\nValidating ${name}...`);

      const context = await browser.newContext({
        viewport: { width, height: 1080 },
        locale: locale === 'ar' ? 'ar-AE' : 'en-US',
      });

      await context.addCookies([
        { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' },
        { name: 'theme', value: 'dark', domain: 'localhost', path: '/' },
      ]);

      const page = await context.newPage();

      // Ensure dark mode and language in localStorage
      await page.addInitScript(({ loc }) => {
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('nextal_language', loc);
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        if (loc === 'ar') {
          document.documentElement.setAttribute('dir', 'rtl');
          document.documentElement.setAttribute('lang', 'ar');
        } else {
          document.documentElement.setAttribute('dir', 'ltr');
          document.documentElement.setAttribute('lang', 'en');
        }
      }, { loc: locale });

      await page.goto('http://localhost:3000', { waitUntil: 'load' });
      await page.waitForTimeout(1000);

      // Verify theme attributes
      const isDark = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') === 'dark' ||
               document.documentElement.classList.contains('dark');
      });

      if (!isDark) {
        console.warn(`Warning: Theme was not dark on ${name}, triggering theme toggle`);
        await page.evaluate(() => {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.documentElement.classList.add('dark');
        });
      }

      // Check empty band in Live Payroll tile and WPS tile
      const bands = await page.evaluate(() => {
        const liveTile = document.getElementById('live-payroll-tile');
        const wpsTile = document.getElementById('wps-readiness-tile');

        const calcBand = (tile) => {
          if (!tile) return null;
          const rect = tile.getBoundingClientRect();
          const children = Array.from(tile.querySelectorAll('*'));
          let maxBottom = rect.top;
          for (const el of children) {
            const r = el.getBoundingClientRect();
            if (r.bottom > maxBottom && r.height > 0 && r.width > 0) {
              maxBottom = r.bottom;
            }
          }
          const computedStyle = window.getComputedStyle(tile);
          const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
          const effectiveTileBottom = rect.bottom - paddingBottom;
          return Math.max(0, Math.round(effectiveTileBottom - maxBottom));
        };

        return {
          livePayrollEmptyBand: calcBand(liveTile),
          wpsEmptyBand: calcBand(wpsTile),
        };
      });

      console.log(`  Empty bands: Live Payroll = ${bands.livePayrollEmptyBand}px, WPS = ${bands.wpsEmptyBand}px`);
      summary.emptyBands[name] = bands;

      // Inspect elements for borders in dark mode
      const inspected = await page.evaluate(() => {
        const results = [];
        const selectors = [
          { name: 'Live Payroll Breakdown Box', selector: '#live-payroll-tile .inset-box--neutral, #live-payroll-tile .grid.grid-cols-2.sm\\:grid-cols-3' },
          { name: 'Live Payroll Net Pay Box', selector: '#live-payroll-tile .inset-box--primary-strong, #live-payroll-tile div[class*="netToWps"]' },
          { name: 'Live Payroll Next Step Bar', selector: '#live-payroll-tile .callout-bar, #live-payroll-tile div[class*="border-s-"]' },
          { name: 'Headcount Joiners/Leavers Box', selector: '#headcount-tile .inset-box, #headcount-tile div[class*="justify-between"][class*="rounded-xl"]' },
          { name: 'Pending Approvals Counter Chips', selector: '#pending-approvals-tile .inset-box, #pending-approvals-tile .grid.grid-cols-2 > div' },
          { name: 'Pending Approvals Rows', selector: '#pending-approvals-tile .inset-box--interactive, #pending-approvals-tile button[class*="rounded-xl"]' },
          { name: 'Documents Expiring Rows', selector: '#documents-expiry-tile .inset-box, #documents-expiry-tile div[class*="rounded-xl"]' },
          { name: 'Exceptions Waiting Rows', selector: '#exceptions-tile .inset-box, #exceptions-tile div[class*="rounded-xl"]' },
          { name: 'Attendance Status Boxes', selector: '#attendance-segment-tile .inset-box, #attendance-segment-tile .grid.grid-cols-4 > div' },
          { name: 'Top Bar Company Switcher', selector: 'header.glass-top-bar button.topbar-field, header.glass-top-bar button[class*="rounded-control"]' },
          { name: 'Top Bar Search Field', selector: 'header.glass-top-bar input[type="search"]' },
          { name: 'Top Bar Language Pill', selector: 'header.glass-top-bar button[title*="Toggle English"], header.glass-top-bar button[title*="Toggle"]' },
          { name: 'Secondary Button (Import Punches)', selector: 'button:has-text("Import Punches"), button:has-text("استيراد البصمات")' },
        ];

        for (const item of selectors) {
          let el = null;
          if (item.name.includes('Secondary Button')) {
            el = Array.from(document.querySelectorAll('button')).find(
              (b) => b.textContent.includes('Import') || b.textContent.includes('استيراد')
            );
          } else {
            el = document.querySelector(item.selector);
          }

          if (el) {
            const cs = window.getComputedStyle(el);
            results.push({
              name: item.name,
              found: true,
              borderTopWidth: cs.borderTopWidth,
              borderRightWidth: cs.borderRightWidth,
              borderBottomWidth: cs.borderBottomWidth,
              borderLeftWidth: cs.borderLeftWidth,
              borderTopColor: cs.borderTopColor,
              borderBottomColor: cs.borderBottomColor,
              backgroundColor: cs.backgroundColor,
              outline: cs.outline,
            });
          } else {
            results.push({ name: item.name, found: false });
          }
        }

        // Check if page title line exists
        const pageHeader = document.querySelector('.gold-page-title')?.closest('.flex');
        const headerCs = pageHeader ? window.getComputedStyle(pageHeader) : null;
        results.push({
          name: 'Page Title Dividing Line',
          hasBorderBottom: headerCs ? (headerCs.borderBottomWidth !== '0px' && headerCs.borderBottomStyle !== 'none') : false,
        });

        return results;
      });

      summary.inspectedElements.push({ name, details: inspected });

      // Save screenshot
      const screenshotPath = path.join(outDir, `${name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      summary.screenshots.push(screenshotPath);
      console.log(`  Saved screenshot: ${screenshotPath}`);

      await context.close();
    }
  }

  // Also capture light-mode screenshots at 1920px
  for (const locale of locales) {
    const name = `${locale}-light-1920px`;
    console.log(`\nCapturing light-mode reference ${name}...`);

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: locale === 'ar' ? 'ar-AE' : 'en-US',
    });

    await context.addCookies([
      { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' },
      { name: 'theme', value: 'light', domain: 'localhost', path: '/' },
    ]);

    const page = await context.newPage();

    await page.addInitScript(({ loc }) => {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('nextal_language', loc);
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      if (loc === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
      }
    }, { loc: locale });

    await page.goto('http://localhost:3000', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    summary.screenshots.push(screenshotPath);
    console.log(`  Saved screenshot: ${screenshotPath}`);

    await context.close();
  }

  // Capture /styleguide page at 1920px in both themes
  for (const theme of ['light', 'dark']) {
    const name = `styleguide-${theme}-1920px`;
    console.log(`\nCapturing styleguide ${name}...`);
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    await context.addCookies([
      { name: 'theme', value: theme, domain: 'localhost', path: '/' },
    ]);
    const page = await context.newPage();
    await page.addInitScript((th) => {
      localStorage.setItem('theme', th);
      document.documentElement.setAttribute('data-theme', th);
      if (th === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }, theme);
    await page.goto('http://localhost:3000/styleguide', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const screenshotPath = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    summary.screenshots.push(screenshotPath);
    console.log(`  Saved styleguide screenshot: ${screenshotPath}`);
    await context.close();
  }

  await browser.close();

  // Print summary of inspected elements
  console.log('\n--- Border & Empty Band Inspection Summary ---');
  let hasWhiteOutline = false;
  for (const item of summary.inspectedElements[0]?.details || []) {
    if (item.found) {
      console.log(`Element: ${item.name}`);
      console.log(`  Borders: T=${item.borderTopWidth} R=${item.borderRightWidth} B=${item.borderBottomWidth} L=${item.borderLeftWidth}`);
      console.log(`  Colors: T=${item.borderTopColor} B=${item.borderBottomColor} | Bg=${item.backgroundColor}`);
      // Check if light white outline exists
      const isWhiteBorder = (color) => {
        if (!color) return false;
        // Check if alpha > 0.1 for white
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
          const [_, r, g, b, a] = match;
          const alpha = a !== undefined ? parseFloat(a) : 1.0;
          if (parseInt(r) > 200 && parseInt(g) > 200 && parseInt(b) > 200 && alpha > 0.1) {
            return true;
          }
        }
        return false;
      };

      if (
        (item.borderTopWidth !== '0px' && isWhiteBorder(item.borderTopColor)) ||
        (item.borderBottomWidth !== '0px' && isWhiteBorder(item.borderBottomColor))
      ) {
        console.error(`  [FAILURE] Element has white border: ${item.name}`);
        hasWhiteOutline = true;
      } else {
        console.log(`  [PASS] Clean in dark mode.`);
      }
    }
  }

  // Check empty bands < 24px
  for (const [key, b] of Object.entries(summary.emptyBands)) {
    if (b.livePayrollEmptyBand > 24) {
      console.warn(`  [WARN] Live Payroll empty band is ${b.livePayrollEmptyBand}px (> 24px) on ${key}`);
    } else {
      console.log(`  [PASS] Live Payroll empty band is ${b.livePayrollEmptyBand}px (<= 24px) on ${key}`);
    }
    if (b.wpsEmptyBand > 24) {
      console.warn(`  [WARN] WPS empty band is ${b.wpsEmptyBand}px (> 24px) on ${key}`);
    } else {
      console.log(`  [PASS] WPS empty band is ${b.wpsEmptyBand}px (<= 24px) on ${key}`);
    }
  }

  console.log(`\nAll screenshots saved to: ${outDir}`);
  console.log(`Has white outline: ${hasWhiteOutline}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
