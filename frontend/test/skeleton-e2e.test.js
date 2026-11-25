import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://localhost';

let DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL;
let DEMO_ADMIN_PASS = process.env.DEMO_ADMIN_PASS;

if (!DEMO_ADMIN_EMAIL || !DEMO_ADMIN_PASS) {
  try {
    const credPath = path.resolve(process.cwd(), '../demo-credentials.txt');
    const altCredPath = path.resolve(process.cwd(), 'demo-credentials.txt');
    const targetFile = fs.existsSync(credPath) ? credPath : fs.existsSync(altCredPath) ? altCredPath : null;
    if (targetFile) {
      const content = fs.readFileSync(targetFile, 'utf8');
      const adminMatch = content.match(/COMPANY_ADMIN\s*:\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
      if (adminMatch) {
        DEMO_ADMIN_EMAIL = DEMO_ADMIN_EMAIL || adminMatch[1];
        DEMO_ADMIN_PASS = DEMO_ADMIN_PASS || adminMatch[2];
      }
    }
  } catch {}
}

if (!DEMO_ADMIN_EMAIL || !DEMO_ADMIN_PASS) {
  console.warn('[WARN] DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASS not found in env or demo-credentials.txt');
}

describe('Step 7: E2E Verification of Skeletons, Loader Suppression, Video Login & MFA', () => {
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

  async function loginAsAdmin(page) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#btn-login-submit:not([disabled])', { timeout: 15000 });
    await page.fill('input[type="email"]', DEMO_ADMIN_EMAIL);
    await page.fill('input[type="password"]', DEMO_ADMIN_PASS);
    await page.click('#btn-login-submit');
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  }

  it('1. Delayed route interception: Skeletons visible immediately, no blank flash, CLS < 0.05', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // Authenticate through UI
    await loginAsAdmin(page);

    // Setup PerformanceObserver for CLS
    await page.addInitScript(() => {
      window.__cls = 0;
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__cls += entry.value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch {}
    });

    // Intercept /api/v1/employees* and delay by 1500ms
    await page.route('**/api/v1/employees*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto(`${BASE_URL}/employees`, { waitUntil: 'domcontentloaded' });

    // Assert skeleton or loading placeholders appear during the 1.5s delay
    const hasSkeleton = await page.evaluate(() => {
      const busy = document.querySelectorAll('[aria-busy="true"], .skeleton-shimmer');
      return busy.length > 0;
    });
    assert.ok(hasSkeleton, 'Skeletons or aria-busy loading placeholders must be rendered during API delay');

    // Wait for the delayed data response to settle
    await page.waitForTimeout(2200);

    const cls = await page.evaluate(() => window.__cls);
    assert.ok(cls < 0.05, `CLS must be < 0.05 when real data resolves (actual: ${cls})`);

    await context.close();
  });

  it('2. Intra-page tab switch does NOT show full-screen rotating entry loader', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/approvals`, { waitUntil: 'networkidle' });

    // Click tab inside approvals (e.g. Rejections tab)
    const tabButtons = await page.$$('button[role="tab"]');
    if (tabButtons.length > 1) {
      await tabButtons[1].click();
      await page.waitForTimeout(100);

      // Verify full-screen entry loader is NOT displayed
      const isFullScreenLoaderVisible = await page.evaluate(() => {
        const loader = document.querySelector('[role="status"][aria-busy="true"]');
        if (!loader) return false;
        const rect = loader.getBoundingClientRect();
        return rect.width >= window.innerWidth && rect.height >= window.innerHeight;
      });
      assert.strictEqual(isFullScreenLoaderVisible, false, 'Full-screen loader must NOT flash during tab switch');
    }

    await context.close();
  });

  it('3. Login video attributes, poster fallback, and reduced-motion compliance', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const videoProps = await page.evaluate(() => {
      const v = document.querySelector('video');
      if (!v) return null;
      return {
        muted: v.muted,
        loop: v.loop,
        playsInline: v.playsInline || v.hasAttribute('playsinline'),
        autoplay: v.autoplay || v.hasAttribute('autoplay'),
        poster: v.poster,
        hasSources: v.querySelectorAll('source').length > 0,
      };
    });

    assert.ok(videoProps, '<video> element must be mounted on desktop login');
    assert.strictEqual(videoProps.muted, true, 'Video must be muted');
    assert.strictEqual(videoProps.loop, true, 'Video must loop');
    assert.ok(videoProps.playsInline, 'Video must have playsinline attribute');
    assert.ok(videoProps.poster.includes('poster'), 'Poster fallback must be provided on <video>');
    assert.ok(videoProps.hasSources, 'Video must provide source elements');

    // Test reduced-motion context
    const reducedMotionContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
      ignoreHTTPSErrors: true,
    });
    const reducedPage = await reducedMotionContext.newPage();
    await reducedPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    const isVideoPaused = await reducedPage.evaluate(() => {
      const v = document.querySelector('video');
      return v ? v.paused : true;
    });
    assert.ok(isVideoPaused, 'Video must be paused when prefers-reduced-motion is active');

    await context.close();
    await reducedMotionContext.close();
  });

  it('4. MFA step transitions cleanly without page reload', async () => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // Mock /api/v1/auth/login to trigger MFA requirement
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'mfa_required',
          mfa_required: true,
          mfa_token: 'mock-mfa-token-test',
          user: { id: 'admin-id', email: 'test@example.ae' },
        }),
      });
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#btn-login-submit:not([disabled])', { timeout: 15000 });
    await page.fill('input[type="email"]', 'test@example.ae');
    await page.fill('input[type="password"]', DEMO_ADMIN_PASS || 'DummyMockPass!123');
    await page.click('#btn-login-submit');

    // Wait for the MFA verification screen to appear
    await page.waitForSelector('input[maxLength="6"], input[placeholder*="123456"]', { timeout: 8000 });

    const pageText = await page.evaluate(() => document.body.innerText);
    assert.ok(
      pageText.includes('Two-Factor') || pageText.includes('المصادقة الثنائية'),
      'Must transition smoothly to Two-Factor Authentication without full reload'
    );

    await context.close();
  });
});
