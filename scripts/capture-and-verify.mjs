import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/screenshots/phase0-fix');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [1920, 1440, 1024, 768];
const configs = [
  { locale: 'en', theme: 'light' },
  { locale: 'en', theme: 'dark' },
  { locale: 'ar', theme: 'light' },
  { locale: 'ar', theme: 'dark' },
];

const tileIds = [
  'live-payroll-tile',
  'headcount-tile',
  'pending-approvals-tile',
  'wps-readiness-tile',
  'documents-expiry-tile',
  'exceptions-tile',
  'attendance-segment-tile',
  'overtime-tile',
  'payroll-trend-tile',
  'department-chart-tile',
  'finance-liabilities-tile',
  'week-ahead-tile',
  'quick-actions-tile',
  'recent-activity-tile',
  'variance-tile',
];

async function run() {
  console.log('Starting Playwright automated validation & screenshot capture...');
  const browser = await chromium.launch();
  const results = {
    screenshots: [],
    assertions: {
      noHorizontalScroll: true,
      noTileOverlaps: true,
      noTileOverflow: true,
    },
    fonts: {},
    tileEmptyBands: {},
    failures: []
  };

  for (const config of configs) {
    for (const width of viewports) {
      const name = `${config.locale}-${config.theme}-${width}px`;
      console.log(`Testing ${name}...`);

      const context = await browser.newContext({
        viewport: { width, height: 1080 },
        locale: config.locale === 'ar' ? 'ar-AE' : 'en-US',
      });

      // Set NEXT_LOCALE cookie
      await context.addCookies([
        {
          name: 'NEXT_LOCALE',
          value: config.locale,
          domain: 'localhost',
          path: '/',
        },
      ]);

      const page = await context.newPage();

      // Navigate to dashboard
      await page.goto('http://localhost:3000', { waitUntil: 'load' });

      // Apply theme via localStorage and document attribute
      await page.evaluate((theme) => {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, config.theme);

      // Wait 600ms for transitions and font rendering
      await page.waitForTimeout(600);

      // 1. Assert no horizontal scroll: scrollWidth <= clientWidth
      const scrollCheck = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasScroll: doc.scrollWidth > doc.clientWidth,
        };
      });

      if (scrollCheck.hasScroll) {
        results.assertions.noHorizontalScroll = false;
        results.failures.push(`${name}: Horizontal scroll detected (scrollWidth=${scrollCheck.scrollWidth}, clientWidth=${scrollCheck.clientWidth})`);
      }

      // 2. Assert no two tiles overlap and no tile overflow
      const tileMetrics = await page.evaluate((ids) => {
        const metrics = {};
        for (const id of ids) {
          const el = document.getElementById(id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          metrics[id] = {
            id,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            overflows: el.scrollHeight > el.clientHeight + 2,
          };
        }
        return metrics;
      }, tileIds);

      // Overlap check
      const metricList = Object.values(tileMetrics);
      for (let i = 0; i < metricList.length; i++) {
        for (let j = i + 1; j < metricList.length; j++) {
          const a = metricList[i];
          const b = metricList[j];
          // Check if a and b overlap
          const overlaps = !(
            a.right <= b.left ||
            a.left >= b.right ||
            a.bottom <= b.top ||
            a.top >= b.bottom
          );
          if (overlaps) {
            results.assertions.noTileOverlaps = false;
            results.failures.push(`${name}: Overlap detected between ${a.id} and ${b.id}`);
          }
        }
      }

      // Overflow check
      for (const t of metricList) {
        if (t.overflows) {
          results.assertions.noTileOverflow = false;
          results.failures.push(`${name}: Tile ${t.id} content overflows (scrollHeight=${t.scrollHeight}, clientHeight=${t.clientHeight})`);
        }
      }

      // 3. Font Family check (record on 1920px)
      if (width === 1920) {
        const fontData = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          const cell = document.querySelector('bdi') || document.querySelector('p');
          const body = document.body;
          return {
            h1Font: h1 ? window.getComputedStyle(h1).fontFamily : '',
            cellFont: cell ? window.getComputedStyle(cell).fontFamily : '',
            bodyFont: window.getComputedStyle(body).fontFamily,
          };
        });
        results.fonts[config.locale] = fontData;
      }

      // 4. Empty vertical band check (record on 1920px dark mode)
      if (width === 1920 && config.locale === 'en' && config.theme === 'dark') {
        const emptyBandData = await page.evaluate((ids) => {
          const res = {};
          for (const id of ids) {
            const el = document.getElementById(id);
            if (!el) continue;
            // Check vertical gaps inside tile
            const children = Array.from(el.children);
            let maxGap = 0;
            for (let i = 0; i < children.length - 1; i++) {
              const r1 = children[i].getBoundingClientRect();
              const r2 = children[i + 1].getBoundingClientRect();
              const gap = r2.top - r1.bottom;
              if (gap > maxGap) maxGap = gap;
            }
            res[id] = {
              maxGap: Math.round(maxGap),
              hasEmptyBandOver24px: maxGap > 24,
            };
          }
          return res;
        }, tileIds);
        results.tileEmptyBands = emptyBandData;
      }

      // Capture screenshot
      const shotPath = path.join(outDir, `${name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      results.screenshots.push(shotPath);

      if (config.theme === 'dark') {
        const goldDir = path.resolve('docs/screenshots/gold-e6a60e');
        if (!fs.existsSync(goldDir)) {
          fs.mkdirSync(goldDir, { recursive: true });
        }
        const darkShotPath = path.join(goldDir, `${name}.png`);
        fs.copyFileSync(shotPath, darkShotPath);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log('Finished capturing all 16 screenshots.');
  console.log(JSON.stringify(results, null, 2));

  fs.writeFileSync(
    path.join(outDir, 'verification-report.json'),
    JSON.stringify(results, null, 2)
  );
}

run().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
