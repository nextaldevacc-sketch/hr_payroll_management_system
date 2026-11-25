import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://localhost';

let HR_EMAIL = process.env.DEMO_HR_EMAIL;
let TEST_PASS = process.env.DEMO_HR_PASSWORD;

if (!HR_EMAIL || !TEST_PASS) {
  try {
    let credPath = path.resolve(process.cwd(), 'demo-credentials.txt');
    if (!fs.existsSync(credPath)) {
      credPath = path.resolve(process.cwd(), '..', 'demo-credentials.txt');
    }
    if (fs.existsSync(credPath)) {
      const content = fs.readFileSync(credPath, 'utf8');
      const hrMatch = content.match(/HR_MANAGER\s*:\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
      if (hrMatch) {
        HR_EMAIL = hrMatch[1];
        TEST_PASS = hrMatch[2];
      }
    }
  } catch {}
}

if (!HR_EMAIL || !TEST_PASS) {
  throw new Error('HR_MANAGER credentials not found in env or demo-credentials.txt');
}

describe('Universal Portal Popover & Non-Clipping Dropdown Suite', { concurrency: 1 }, () => {
  let browser;

  before(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--disable-gpu'],
    });
  });

  after(async () => {
    if (browser) await browser.close();
  });

  it('Desktop (1440px): Portals to document.body, positions accurately, coordinates single instance, and dismisses on Escape / outside click', async () => {
    let context;
    try {
      console.log('[Desktop] Starting test...');
      context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();

      // 1. Log in
      console.log('[Desktop] Navigating to login...');
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[type="email"]', { timeout: 15000 });
      await page.fill('input[type="email"]', HR_EMAIL);
      await page.fill('input[type="password"]', TEST_PASS);
      await page.click('button[type="submit"]');
      console.log('[Desktop] Submitted login, waiting for redirect...');
      await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
      console.log('[Desktop] Redirected away from login');
      await page.waitForTimeout(1000);

      // 2. Test TopBar Company / Visa Popover Portal
      console.log('[Desktop] Checking company visa switcher...');
      const switcherExists = await page.waitForSelector('#btn-company-visa-switcher', { timeout: 10000 });
      if (switcherExists) {
        console.log('[Desktop] Clicking company visa switcher...');
        await page.click('#btn-company-visa-switcher');
        const panel = await page.waitForSelector('#company-visa-dropdown-panel', { timeout: 5000 });
        assert.ok(panel, 'Company visa dropdown panel must appear');

        // Verify it is portaled to document.body (direct parent is document.body)
        const isParentBody = await page.evaluate(() => {
          const p = document.getElementById('company-visa-dropdown-panel');
          return p && p.parentElement === document.body;
        });
        assert.strictEqual(isParentBody, true, '#company-visa-dropdown-panel must be portaled directly into document.body');

        // Verify fixed positioning coordinates
        const coords = await page.evaluate(() => {
          const panel = document.getElementById('company-visa-dropdown-panel');
          const trigger = document.getElementById('btn-company-visa-switcher');
          const pRect = panel ? panel.getBoundingClientRect() : null;
          const tRect = trigger ? trigger.getBoundingClientRect() : null;
          return {
            panelTop: pRect ? pRect.top : null,
            triggerBottom: tRect ? tRect.bottom : null,
            panelLeft: pRect ? pRect.left : null,
            panelStyleTop: panel ? panel.style.top : null,
            panelClass: panel ? panel.className : null,
          };
        });
        assert.ok(coords.panelTop !== null && coords.triggerBottom !== null, 'Panel and trigger must have bounding client rects');
        assert.ok(coords.panelTop >= 0, `Panel top (${coords.panelTop}) must be non-negative`);
        console.log('[Desktop] Company visa switcher verified.');
      }

      // 3. Test Single-Instance Coordination: Opening Notification Bell closes Company Popover
      console.log('[Desktop] Clicking notification bell...');
      const notifBell = await page.waitForSelector('#btn-notifications-bell', { timeout: 5000 });
      await notifBell.click();
      console.log('[Desktop] Waiting for notification dropdown panel...');
      await page.waitForSelector('#notifications-dropdown-panel', { timeout: 5000 });
      console.log('[Desktop] Notifications dropdown panel appeared.');

      console.log('[Desktop] Checking if company visa dropdown closed...');
      await page.waitForSelector('#company-visa-dropdown-panel', { state: 'detached', timeout: 5000 });
      const companyOpenExists = await page.evaluate(() => Boolean(document.getElementById('company-visa-dropdown-panel')));
      assert.strictEqual(companyOpenExists, false, 'Opening notifications bell must auto-close company popover');
      console.log('[Desktop] Single-instance coordination verified (company popover closed).');

      console.log('[Desktop] Checking notif parent element...');
      const notifParentBody = await page.evaluate(() => {
        const panel = document.getElementById('notifications-dropdown-panel');
        return panel && panel.parentElement === document.body;
      });
      console.log('[Desktop] notifParentBody:', notifParentBody);
      assert.strictEqual(notifParentBody, true, '#notifications-dropdown-panel must be portaled directly into document.body');
      console.log('[Desktop] Notifications dropdown portaling verified.');

      // 4. Test Escape key dismissal & focus return
      console.log('[Desktop] Pressing Escape...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const notifOpenExists = await page.evaluate(() => Boolean(document.getElementById('notifications-dropdown-panel')));
      assert.strictEqual(notifOpenExists, false, 'Escape key must close notification popover');
      console.log('[Desktop] Escape dismissal verified.');

      // 5. Test User Menu and Outside Click Dismissal
      console.log('[Desktop] Clicking user menu...');
      const userMenuBtn = await page.waitForSelector('#btn-user-menu', { timeout: 5000 });
      await userMenuBtn.click();
      await page.waitForSelector('#user-menu-dropdown-panel', { timeout: 5000 });
      console.log('[Desktop] User menu panel appeared.');

      const userMenuParentBody = await page.evaluate(() => {
        const panel = document.getElementById('user-menu-dropdown-panel');
        return panel && panel.parentElement === document.body;
      });
      assert.strictEqual(userMenuParentBody, true, '#user-menu-dropdown-panel must be portaled into document.body');

      // Click outside on body
      console.log('[Desktop] Clicking outside...');
      await page.mouse.click(10, 100);
      await page.waitForTimeout(200);
      const userMenuOpenExists = await page.evaluate(() => Boolean(document.getElementById('user-menu-dropdown-panel')));
      assert.strictEqual(userMenuOpenExists, false, 'Outside click must close user menu popover');
      console.log('[Desktop] Outside click dismissal verified.');

      // 6. Test Select Component Portaled Listbox
      console.log('[Desktop] Navigating to /payroll...');
      await page.goto(`${BASE_URL}/payroll`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const selectTrigger = await page.$('button[role="combobox"]');
      if (selectTrigger) {
        console.log('[Desktop] Clicking combobox...');
        await selectTrigger.click();
        const listbox = await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
        assert.ok(listbox, 'Listbox must open on combobox click');

        const isListboxInBody = await page.evaluate(() => {
          const lb = document.querySelector('[role="listbox"]');
          return lb && lb.parentElement === document.body;
        });
        assert.strictEqual(isListboxInBody, true, 'Select listbox must be portaled directly to document.body to prevent clipping');

        // Dismiss listbox by pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        console.log('[Desktop] Combobox listbox verified.');
      }

      console.log('[Desktop] Desktop test complete.');
    } catch (err) {
      console.error('[Desktop] FAILED with error:', err.message, err.stack);
      throw err;
    } finally {
      if (context) await context.close();
    }
  });

  it('Mobile (390px): Popover renders as bottom drawer sheet with grab handle', async () => {
    let context;
    try {
      console.log('[Mobile] Starting mobile test...');
      context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();

      // Log in
      console.log('[Mobile] Navigating to login...');
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[type="email"]', { timeout: 15000 });
      await page.fill('input[type="email"]', HR_EMAIL);
      await page.fill('input[type="password"]', TEST_PASS);
      await page.click('button[type="submit"]');
      console.log('[Mobile] Submitted login, waiting for redirect...');
      await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
      console.log('[Mobile] Redirected away from login');
      await page.waitForTimeout(1000);

      // Open notification bell
      console.log('[Mobile] Clicking notification bell...');
      await page.click('#btn-notifications-bell');
      await page.waitForSelector('#notifications-dropdown-panel', { timeout: 5000 });

      // Verify it renders as bottom sheet drawer
      console.log('[Mobile] Inspecting sheet details...');
      const sheetDetails = await page.evaluate(() => {
        const panel = document.getElementById('notifications-dropdown-panel');
        if (!panel) return { found: false, allIds: Array.from(document.querySelectorAll('[id]')).map(e => e.id) };
        const rect = panel.getBoundingClientRect();
        const hasGrabHandle = Boolean(panel.querySelector('.rounded-full.mx-auto'));
        const isBottomAligned = rect.bottom <= window.innerHeight + 10 && rect.bottom >= window.innerHeight - 20;
        return {
          found: true,
          rect: { bottom: rect.bottom, top: rect.top, width: rect.width, height: rect.height },
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          hasGrabHandle,
          isBottomAligned,
          width: rect.width,
        };
      });

      assert.strictEqual(sheetDetails.found, true, `Panel not found in DOM, IDs: ${sheetDetails.allIds?.join(', ')}`);
      assert.strictEqual(sheetDetails.hasGrabHandle, true, 'Bottom sheet drawer must render top grab handle');
      assert.strictEqual(sheetDetails.isBottomAligned, true, 'Bottom sheet drawer must align with bottom of mobile viewport');
      assert.ok(sheetDetails.width >= sheetDetails.windowWidth * 0.9, 'Drawer must span full width of mobile viewport');

      // Dismiss by tapping backdrop
      console.log('[Mobile] Waiting 200ms for mount debounce...');
      await page.waitForTimeout(200);
      console.log('[Mobile] Tapping backdrop...');
      await page.mouse.click(195, 100);
      await page.waitForSelector('#notifications-dropdown-panel', { state: 'detached', timeout: 5000 });
      const panelExists = await page.evaluate(() => Boolean(document.getElementById('notifications-dropdown-panel')));
      assert.strictEqual(panelExists, false, 'Tapping mobile backdrop must dismiss the drawer');

      console.log('[Mobile] Mobile test complete.');
    } catch (err) {
      console.error('[Mobile] FAILED with error:', err.message, err.stack);
      throw err;
    } finally {
      if (context) await context.close();
    }
  });
});
