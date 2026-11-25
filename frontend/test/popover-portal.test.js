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

describe('Universal Portal Popover & Non-Clipping Dropdown Suite', () => {
  let browser;

  before(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
    });
  });

  after(async () => {
    if (browser) await browser.close();
  });

  it('Desktop (1440px): Portals to document.body, positions accurately, coordinates single instance, and dismisses on Escape / outside click', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // 1. Log in
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', HR_EMAIL);
    await page.fill('input[type="password"]', TEST_PASS);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });

    // 2. Test TopBar Company / Visa Popover Portal
    const companySwitcher = await page.$('#btn-company-visa-switcher');
    if (companySwitcher) {
      await companySwitcher.click();
      await page.waitForSelector('#company-visa-dropdown-panel', { timeout: 5000 });
      await page.waitForTimeout(200);

      // Verify it is portaled to document.body (direct parent is document.body)
      const isParentBody = await page.evaluate(() => {
        const panel = document.getElementById('company-visa-dropdown-panel');
        return panel && panel.parentElement === document.body;
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
      assert.ok(coords.panelTop >= coords.triggerBottom - 5, `Panel top (${coords.panelTop}) must be at or below trigger bottom (${coords.triggerBottom})`);
    }

    // 3. Test Single-Instance Coordination: Opening Notification Bell closes Company Popover
    const notifBell = await page.waitForSelector('#btn-notifications-bell', { timeout: 5000 });
    await notifBell.click();
    await page.waitForSelector('#notifications-dropdown-panel', { timeout: 5000 });

    const companyOpenAfterNotif = await page.$('#company-visa-dropdown-panel');
    assert.strictEqual(companyOpenAfterNotif, null, 'Opening notifications bell must auto-close company popover');

    const notifParentBody = await page.evaluate(() => {
      const panel = document.getElementById('notifications-dropdown-panel');
      return panel && panel.parentElement === document.body;
    });
    assert.strictEqual(notifParentBody, true, '#notifications-dropdown-panel must be portaled directly into document.body');

    // 4. Test Escape key dismissal & focus return
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const notifOpenAfterEscape = await page.$('#notifications-dropdown-panel');
    assert.strictEqual(notifOpenAfterEscape, null, 'Escape key must close notification popover');

    // 5. Test User Menu and Outside Click Dismissal
    const userMenuBtn = await page.waitForSelector('#btn-user-menu', { timeout: 5000 });
    await userMenuBtn.click();
    await page.waitForSelector('#user-menu-dropdown-panel', { timeout: 5000 });

    const userMenuParentBody = await page.evaluate(() => {
      const panel = document.getElementById('user-menu-dropdown-panel');
      return panel && panel.parentElement === document.body;
    });
    assert.strictEqual(userMenuParentBody, true, '#user-menu-dropdown-panel must be portaled into document.body');

    // Click outside on body
    await page.mouse.click(10, 100);
    await page.waitForTimeout(100);
    const userMenuAfterClick = await page.$('#user-menu-dropdown-panel');
    assert.strictEqual(userMenuAfterClick, null, 'Outside click must close user menu popover');

    // 6. Test Select Component Portaled Listbox
    await page.goto(`${BASE_URL}/payroll/runs`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const selectTrigger = await page.$('button[role="combobox"]');
    if (selectTrigger) {
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
      await page.waitForTimeout(100);
    }

    await context.close();
  });

  it('Mobile (390px): Popover renders as bottom drawer sheet with grab handle', async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // Log in
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', HR_EMAIL);
    await page.fill('input[type="password"]', TEST_PASS);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });

    // Open notification bell
    const notifBell = await page.waitForSelector('#btn-notifications-bell', { timeout: 5000 });
    await notifBell.click();
    await page.waitForSelector('#notifications-dropdown-panel', { timeout: 5000 });

    // Verify it renders as bottom sheet drawer
    const sheetDetails = await page.evaluate(() => {
      const panel = document.getElementById('notifications-dropdown-panel');
      if (!panel) return null;
      const rect = panel.getBoundingClientRect();
      const hasGrabHandle = Boolean(panel.querySelector('.rounded-full.mx-auto'));
      const isBottomAligned = rect.bottom <= window.innerHeight + 5 && rect.bottom >= window.innerHeight - 10;
      return {
        hasGrabHandle,
        isBottomAligned,
        width: rect.width,
        windowWidth: window.innerWidth,
      };
    });

    assert.ok(sheetDetails, 'Bottom sheet drawer must be mounted in DOM');
    assert.strictEqual(sheetDetails.hasGrabHandle, true, 'Bottom sheet drawer must render top grab handle');
    assert.strictEqual(sheetDetails.isBottomAligned, true, 'Bottom sheet drawer must align with bottom of mobile viewport');
    assert.ok(sheetDetails.width >= sheetDetails.windowWidth * 0.9, 'Drawer must span full width of mobile viewport');

    // Dismiss by tapping backdrop
    await page.mouse.click(195, 100);
    await page.waitForTimeout(150);
    const panelAfterTap = await page.$('#notifications-dropdown-panel');
    assert.strictEqual(panelAfterTap, null, 'Tapping mobile backdrop must dismiss the drawer');

    await context.close();
  });
});
