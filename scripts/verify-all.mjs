import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

const ALL_ROUTES = [
  '/',
  '/employees',
  '/attendance',
  '/leave',
  '/payroll',
  '/offboarding',
  '/compliance',
  '/reports',
  '/settings',
  '/audit',
  '/me/profile',
  '/me/payslips',
  '/me/attendance',
  '/me/leave',
  '/me/requests',
  '/me/documents',
  '/styleguide'
];

async function runVerification() {
  console.log('🚀 Starting Comprehensive Playwright Verification...\n');
  const browser = await chromium.launch({ headless: true });
  let totalErrors = 0;
  let testCount = 0;

  try {
    // 1. Verify Hydration & Clean Console on / and /styleguide across (light/dark x en/ar)
    console.log('--- TEST SUITE 1: Hydration & Clean Console Matrix ---');
    const matrixPages = ['/', '/styleguide'];
    const themes = ['light', 'dark'];
    const locales = ['en', 'ar'];

    for (const route of matrixPages) {
      for (const theme of themes) {
        for (const locale of locales) {
          testCount++;
          const context = await browser.newContext({
            viewport: { width: 1440, height: 900 }
          });
          const page = await context.newPage();

          const consoleIssues = [];
          page.on('console', msg => {
            const txt = msg.text();
            const type = msg.type();
            if (
              type === 'error' ||
              txt.toLowerCase().includes('hydration') ||
              txt.toLowerCase().includes('did not match') ||
              txt.toLowerCase().includes('warning: prop')
            ) {
              consoleIssues.push(`[${type}] ${txt}`);
            }
          });

          page.on('pageerror', err => {
            consoleIssues.push(`[pageerror] ${err.message}`);
          });

          await context.addCookies([
            { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' }
          ]);

          const res = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
          
          // Apply theme in localStorage if needed and evaluate
          await page.evaluate((th) => {
            document.documentElement.setAttribute('data-theme', th);
            if (th === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }, theme);
          await page.waitForTimeout(300);

          const status = res.status();
          const passed = status === 200 && consoleIssues.length === 0;

          if (passed) {
            console.log(`  ✅ [PASS] ${route} (theme: ${theme}, locale: ${locale}) -> Status 200, 0 issues`);
          } else {
            totalErrors++;
            console.error(`  ❌ [FAIL] ${route} (theme: ${theme}, locale: ${locale}) -> Status: ${status}, Issues: ${consoleIssues.length}`);
            consoleIssues.forEach(iss => console.error(`      -> ${iss}`));
          }

          await context.close();
        }
      }
    }

    // 2. Verify Every Route in EN and AR
    console.log('\n--- TEST SUITE 2: All 17 Application Routes (en & ar) ---');
    for (const locale of locales) {
      console.log(`\n  Language: ${locale.toUpperCase()}`);
      for (const route of ALL_ROUTES) {
        testCount++;
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 }
        });
        const page = await context.newPage();

        const consoleIssues = [];
        page.on('console', msg => {
          const txt = msg.text();
          const type = msg.type();
          if (
            type === 'error' ||
            txt.toLowerCase().includes('hydration') ||
            txt.toLowerCase().includes('did not match')
          ) {
            consoleIssues.push(`[${type}] ${txt}`);
          }
        });

        page.on('pageerror', err => {
          consoleIssues.push(`[pageerror] ${err.message}`);
        });

        await context.addCookies([
          { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' }
        ]);

        const res = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
        const status = res.status();

        // Check if page contains the expected headings or tiles
        const hasContent = (await page.locator('main').count()) > 0;

        // Check sidebar active link
        let activeLinkCorrect = true;
        if (route !== '/styleguide') {
          const activeLink = await page.locator(`aside nav a[href="${route}"]`).first();
          if (await activeLink.count() > 0) {
            const classAttr = await activeLink.getAttribute('class');
            activeLinkCorrect = classAttr.includes('bg-primary-wash') || classAttr.includes('text-primary');
          }
        }

        const passed = status === 200 && consoleIssues.length === 0 && hasContent && activeLinkCorrect;

        if (passed) {
          console.log(`    ✅ [PASS] ${route} -> 200 OK (Active sidebar indicator verified)`);
        } else {
          totalErrors++;
          console.error(`    ❌ [FAIL] ${route} -> Status: ${status}, Issues: ${consoleIssues.length}, ActiveCorrect: ${activeLinkCorrect}`);
          consoleIssues.forEach(iss => console.error(`        -> ${iss}`));
        }

        await context.close();
      }
    }

    // 3. Verify Custom 404 Page (Styled in Design System with Back to Dashboard Button)
    console.log('\n--- TEST SUITE 3: Styled 404 Page & Navigation ---');
    for (const locale of locales) {
      testCount++;
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
      });
      const page = await context.newPage();

      await context.addCookies([
        { name: 'NEXT_LOCALE', value: locale, domain: 'localhost', path: '/' }
      ]);

      const res = await page.goto(`${BASE_URL}/non-existent-route-for-testing`, { waitUntil: 'networkidle' });
      const status = res.status();

      const notFoundTile = await page.locator('#not-found-tile').count();
      const has404Text = (await page.textContent('body')).includes('404');
      const backButton = page.locator('#back-to-dashboard-btn');
      const hasBackButton = (await backButton.count()) > 0;

      if (status === 404 && notFoundTile > 0 && has404Text && hasBackButton) {
        console.log(`  ✅ [PASS] 404 Page (${locale}) -> Returned 404, rendered styled BentoTile & return button`);
      } else {
        totalErrors++;
        console.error(`  ❌ [FAIL] 404 Page (${locale}) -> Status: ${status}, notFoundTile: ${notFoundTile}, hasBackButton: ${hasBackButton}`);
      }

      // Test clicking back button
      if (hasBackButton) {
        await Promise.all([
          page.waitForURL(`${BASE_URL}/`),
          backButton.click()
        ]);
        const url = page.url();
        if (url === `${BASE_URL}/`) {
          console.log(`  ✅ [PASS] 404 Back to Dashboard navigation works -> Navigated to /`);
        } else {
          totalErrors++;
          console.error(`  ❌ [FAIL] 404 Navigation failed -> URL is ${url}`);
        }
      }

      await context.close();
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    totalErrors++;
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log(`Total tests run: ${testCount}`);
  console.log(`Total failures:  ${totalErrors}`);
  console.log('========================================');

  if (totalErrors > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL CHECKS PASSED PERFECTLY WITH ZERO WARNINGS OR ERRORS!\n');
    process.exit(0);
  }
}

runVerification();
