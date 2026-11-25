import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'backend');
const webDir = path.resolve(rootDir, 'frontend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');

let API_PORT = Number(process.env.API_PORT) || 5000;
let WEB_PORT = Number(process.env.WEB_PORT) || 3102;
const baseUrlArg = process.argv.find((a) => a.startsWith('--base-url='));
let BASE_URL = baseUrlArg ? baseUrlArg.split('=')[1] : (process.env.BASE_URL || `http://localhost:${WEB_PORT}`);

const credPath = path.resolve(rootDir, 'demo-credentials.txt');
let demoAdminEmail = process.env.DEMO_ADMIN_EMAIL || '';
let demoAdminPass = process.env.DEMO_ADMIN_PASSWORD || '';
if (fs.existsSync(credPath)) {
  const content = fs.readFileSync(credPath, 'utf8');
  const adminMatch = content.match(/COMPANY_ADMIN\s*:\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
  if (adminMatch) {
    demoAdminEmail = adminMatch[1];
    demoAdminPass = adminMatch[2];
  }
}

function canBindPort(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(true)));
  });
}

function checkHttp(url) {
  return new Promise((resolve) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const req = client.get(url, { rejectUnauthorized: false }, (res) => {
      res.resume();
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForHttp(url, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const interval = setInterval(() => {
      const req = client.get(url, { rejectUnauthorized: false }, (res) => {
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
          } catch {}
        }
      }
    }
  } catch {}
}

async function loginUser(page, email = demoAdminEmail, password = demoAdminPass) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function checkContainerContrast(page, containerSelector, contextName) {
  return await page.evaluate(({ selector, ctx }) => {
    function sRGBtoLin(c) {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    function luminance(r, g, b) {
      return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
    }
    function parseRgba(str) {
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m) {
        return {
          r: parseInt(m[1]),
          g: parseInt(m[2]),
          b: parseInt(m[3]),
          a: m[4] !== undefined ? parseFloat(m[4]) : 1,
        };
      }
      return { r: 0, g: 0, b: 0, a: 1 };
    }
    function getEffectiveBg(element) {
      let el = element;
      const layers = [];
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        if (bg && bg !== 'transparent') {
          const rgba = parseRgba(bg);
          if (rgba.a > 0) {
            layers.unshift(rgba);
          }
        }
        el = el.parentElement;
      }
      const isDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
      let current = isDark ? { r: 29, g: 29, b: 29 } : { r: 255, g: 255, b: 255 };
      for (const layer of layers) {
        current = {
          r: Math.round(layer.r * layer.a + current.r * (1 - layer.a)),
          g: Math.round(layer.g * layer.a + current.g * (1 - layer.a)),
          b: Math.round(layer.b * layer.a + current.b * (1 - layer.a)),
        };
      }
      return current;
    }

    const container = document.querySelector(selector);
    if (!container) return { found: false, violations: [], totalNodes: 0 };

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    const violations = [];
    let nodeCount = 0;

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      const text = (currentNode.nodeValue || '').trim();
      if (!text || text.length === 0) continue;

      const parent = currentNode.parentElement;
      if (!parent) continue;

      // Check visibility
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = window.getComputedStyle(parent);
      if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) continue;

      nodeCount++;
      const fg = parseRgba(style.color);
      const bg = getEffectiveBg(parent);

      const blendedFg = {
        r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
        g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
        b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
      };

      const L1 = luminance(blendedFg.r, blendedFg.g, blendedFg.b);
      const L2 = luminance(bg.r, bg.g, bg.b);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);

      const fontSize = parseFloat(style.fontSize);
      const fontWeight = parseInt(style.fontWeight) || 400;
      const isLarge = fontSize >= 18.5 || (fontSize >= 14 && fontWeight >= 700);
      const required = isLarge ? 3.0 : 4.5;

      if (ratio < required) {
        violations.push({
          context: ctx,
          text: text.slice(0, 35),
          tag: parent.tagName.toLowerCase(),
          fg: `rgb(${blendedFg.r}, ${blendedFg.g}, ${blendedFg.b})`,
          bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
          ratio: Number(ratio.toFixed(2)),
          required,
          isLarge,
        });
      }
    }

    return { found: true, violations, totalNodes: nodeCount };
  }, { selector: containerSelector, ctx: contextName });
}

async function run() {
  console.log('--- Automated WCAG AA Contrast & Self-Hosted Font Verification ---');
  let apiProc = null;
  let webProc = null;
  let browser = null;

  const TEST_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';

  try {
    const healthUrl = BASE_URL.startsWith('https') ? `${BASE_URL}/api/v1/health` : `http://127.0.0.1:${API_PORT}/api/v1/health`;
    let apiUp = await checkHttp(healthUrl);
    if (!apiUp) {
      const can5000 = await canBindPort(5000);
      if (!can5000) {
        API_PORT = 5001;
      }
      killPort(API_PORT);
      console.log(`[check-contrast] Starting API server on port ${API_PORT}...`);
      apiProc = spawn(process.execPath, ['src/server.js'], {
        cwd: apiDir,
        env: {
          ...process.env,
          PORT: String(API_PORT),
          DATABASE_URL: TEST_DB_URL,
          DATABASE_URL_TEST: TEST_DB_URL,
          NODE_ENV: 'development',
          FEATURE_PLATFORM_ADMIN: 'false',
        },
        stdio: 'inherit',
      });
      await waitForHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`, 30000);
    }

    const webUp = await checkHttp(`${BASE_URL}/login`);
    if (!webUp) {
      killPort(WEB_PORT);
      console.log(`[check-contrast] Starting Next.js Web server on port ${WEB_PORT}...`);
      const hasBuild = fs.existsSync(path.join(webDir, '.next-build')) || fs.existsSync(path.join(webDir, '.next'));
      const distDir = fs.existsSync(path.join(webDir, '.next-build')) ? '.next-build' : '.next';
      const webCmd = hasBuild ? ['start', '-p', String(WEB_PORT)] : ['dev', '-p', String(WEB_PORT)];
      webProc = spawn(process.execPath, [nextBin, ...webCmd], {
        cwd: webDir,
        env: {
          ...process.env,
          NODE_ENV: hasBuild ? 'production' : 'development',
          NEXT_DIST_DIR: distDir,
          PORT: String(WEB_PORT),
          API_ORIGIN: `http://127.0.0.1:${API_PORT}`,
          NEXT_PUBLIC_API_URL: '/api/v1',
        },
        stdio: 'inherit',
      });
      await waitForHttp(`${BASE_URL}/login`, 45000);
    }

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
    });
    const MODES = [
      { theme: 'light', locale: 'en', dir: 'ltr', name: 'light-en' },
      { theme: 'dark', locale: 'en', dir: 'ltr', name: 'dark-en' },
      { theme: 'light', locale: 'ar', dir: 'rtl', name: 'light-ar' },
      { theme: 'dark', locale: 'ar', dir: 'rtl', name: 'dark-ar' },
    ];

    let totalNodesChecked = 0;
    const allViolations = [];
    const fontViolations = [];
    let googleFontRequests = 0;

    for (const mode of MODES) {
      console.log(`\n==============================================`);
      console.log(`Testing Mode: ${mode.name.toUpperCase()} (Theme: ${mode.theme}, Locale: ${mode.locale})`);
      console.log(`==============================================`);

      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();

      // Monitor network for zero google font requests (A3)
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
          googleFontRequests++;
          fontViolations.push(`Blocked external Google Font request: ${url}`);
        }
      });

      await loginUser(page);

      // Set theme and locale
      await page.evaluate(({ th, loc, d }) => {
        try { localStorage.setItem('theme', th); } catch {}
        if (th === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
        document.documentElement.setAttribute('dir', d);
        document.documentElement.setAttribute('lang', loc);
      }, { th: mode.theme, loc: mode.locale, d: mode.dir });
      await page.waitForTimeout(500);

      // A3: Check computed font-family
      const fonts = await page.evaluate((loc) => {
        const bodyFont = window.getComputedStyle(document.body).fontFamily;
        const h1 = document.querySelector('h1');
        const h1Font = h1 ? window.getComputedStyle(h1).fontFamily : '';
        const th = document.querySelector('th');
        const thFont = th ? window.getComputedStyle(th).fontFamily : '';
        const input = document.querySelector('input');
        const inputFont = input ? window.getComputedStyle(input).fontFamily : '';
        return { bodyFont, h1Font, thFont, inputFont };
      }, mode.locale);

      const expectedKeyword = mode.locale === 'ar' ? 'Plex' : 'Manrope';
      console.log(`[Fonts] Mode ${mode.name}: body font-family: "${fonts.bodyFont}"`);
      if (!fonts.bodyFont.toLowerCase().includes(expectedKeyword.toLowerCase())) {
        fontViolations.push(`[${mode.name}] Expected font-family to include '${expectedKeyword}', got '${fonts.bodyFont}'`);
      }

      // Check 1: Settings Users & Roles - Invite User Modal
      console.log('  -> Inspecting Users & Roles: Invite User Modal');
      await page.goto(`${BASE_URL}/settings/users`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000);

      await page.evaluate(({ th }) => {
        if (th === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }, { th: mode.theme });

      const inviteBtn = page.locator('#btn-invite-user');
      if (await inviteBtn.isVisible()) {
        await inviteBtn.click();
        await page.waitForTimeout(600);
        const res = await checkContainerContrast(page, '.fixed.inset-0.z-50', `${mode.name} Users:InviteModal`);
        totalNodesChecked += res.totalNodes;
        if (res.violations.length > 0) allViolations.push(...res.violations);
        const cancelBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Cancel"), .fixed.inset-0.z-50 button:has-text("إلغاء"), .fixed.inset-0.z-50 button:has-text("✕")').first();
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForSelector('.fixed.inset-0.z-50', { state: 'detached', timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);
      }

      // Check 2: Settings Users & Roles - Bulk Logins Modal
      console.log('  -> Inspecting Users & Roles: Bulk Logins Modal');
      const bulkBtn = page.locator('button:has-text("Bulk-Create Employee Logins"), button:has-text("إنشاء حسابات مجمعة")');
      if (await bulkBtn.isVisible()) {
        await bulkBtn.click();
        await page.waitForTimeout(800);
        const res = await checkContainerContrast(page, '.fixed.inset-0.z-50', `${mode.name} Users:BulkModal`);
        totalNodesChecked += res.totalNodes;
        if (res.violations.length > 0) allViolations.push(...res.violations);
        const cancelBtn = page.locator('.fixed.inset-0.z-50 button:has-text("Cancel"), .fixed.inset-0.z-50 button:has-text("إلغاء"), .fixed.inset-0.z-50 button:has-text("✕")').first();
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForSelector('.fixed.inset-0.z-50', { state: 'detached', timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);
      }

      // Check 3: Dashboard - Quick Actions & Drawer
      console.log('  -> Inspecting Dashboard Quick Import Drawer');
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await page.evaluate(({ th }) => {
        if (th === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }, { th: mode.theme });

      const importBtn = page.locator('#btn-quick-import-punches, [data-testid="quick-action-import-punches"]');
      if ((await importBtn.count()) > 0 && (await importBtn.first().isVisible())) {
        await importBtn.first().click();
        await page.waitForTimeout(600);
        const res = await checkContainerContrast(page, '#drawer-panel, .glass-panel', `${mode.name} Dashboard:ImportDrawer`);
        totalNodesChecked += res.totalNodes;
        if (res.violations.length > 0) allViolations.push(...res.violations);
        const drawerClose = page.locator('#btn-drawer-close, button:has-text("✕")').first();
        if (await drawerClose.isVisible()) {
          await drawerClose.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(300);
      }

      // Check 4: TopBar Notification & Company Dropdowns
      console.log('  -> Inspecting TopBar Dropdowns');
      const notifBtn = page.locator('#btn-topbar-notifications');
      if (await notifBtn.isVisible()) {
        await notifBtn.click();
        await page.waitForTimeout(400);
        const res = await checkContainerContrast(page, '.absolute.end-0.mt-2, #notifications-dropdown', `${mode.name} TopBar:Notifications`);
        totalNodesChecked += res.totalNodes;
        if (res.violations.length > 0) allViolations.push(...res.violations);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }

      await context.close();
    }

    console.log(`\n======================================================`);
    console.log(`Total Text Nodes Inspected: ${totalNodesChecked}`);
    console.log(`Google Fonts External Requests: ${googleFontRequests} (must be 0)`);
    console.log(`Font Family Violations: ${fontViolations.length}`);
    console.log(`WCAG AA Contrast Violations: ${allViolations.length}`);
    console.log(`======================================================`);

    if (fontViolations.length > 0) {
      console.error('\nFont Verification Failures:');
      fontViolations.forEach((fv) => console.error(`  - ${fv}`));
    }

    if (allViolations.length > 0) {
      console.error('\nContrast Ratio Violations:');
      allViolations.forEach((v) => {
        console.error(`  [FAIL] ${v.context} -> <${v.tag}> "${v.text}": ratio ${v.ratio}:1 (needed ${v.required}:1). FG: ${v.fg}, BG: ${v.bg}`);
      });
      process.exit(1);
    }

    if (googleFontRequests > 0 || fontViolations.length > 0) {
      process.exit(1);
    }

    console.log('\nResult: ALL PASS (WCAG AA Contrast & Self-Hosted Fonts)\n');
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (apiProc) apiProc.kill();
    if (webProc) webProc.kill();
  }
}

run().catch((err) => {
  console.error('[check-contrast] Unhandled error:', err);
  process.exit(1);
});
