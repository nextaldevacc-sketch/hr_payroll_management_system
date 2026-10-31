import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import treeKill from 'tree-kill';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(__dirname, '../..');
const apiDir = path.resolve(rootDir, 'backend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');

describe('Phase 7: 390px Mobile Responsive Layout (No Horizontal Scroll)', { timeout: 120000 }, () => {
  let apiProcess = null;
  let webProcess = null;
  let browser = null;

  const API_PORT = 5000;
  const WEB_PORT = 3100;

  function killProcWithTree(proc) {
    return new Promise((resolve) => {
      if (!proc || !proc.pid) return resolve();
      treeKill(proc.pid, 'SIGKILL', () => resolve());
    });
  }

  function waitForHttp(url, timeoutMs = 25000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const req = http.get(url, (res) => {
          res.resume();
          if (res.statusCode < 500) {
            clearInterval(interval);
            resolve();
          }
        });
        req.on('error', () => {
          if (Date.now() - startTime > timeoutMs) {
            clearInterval(interval);
            reject(new Error(`Timeout waiting for ${url}`));
          }
        });
        req.setTimeout(1000, () => req.destroy());
      }, 500);
    });
  }

  before(async () => {
    // 1. Ensure API is running
    try {
      await waitForHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`, 1500);
    } catch {
      const testDbUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';
      apiProcess = spawn(process.execPath, [path.resolve(apiDir, 'src/server.js')], {
        cwd: apiDir,
        env: { ...process.env, PORT: String(API_PORT), NODE_ENV: 'test', DATABASE_URL: testDbUrl, DATABASE_URL_TEST: testDbUrl },
        stdio: 'ignore',
      });
      await waitForHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`, 25000);
    }

    // 2. Ensure Web is running
    try {
      await waitForHttp(`http://127.0.0.1:${WEB_PORT}/login`, 1500);
    } catch {
      const distDir = fs.existsSync(path.join(webDir, '.next-build')) ? '.next-build' : (fs.existsSync(path.join(webDir, '.next')) ? '.next' : null);
      const hasBuild = Boolean(distDir);
      const commandArgs = hasBuild ? [nextBin, 'start', '-p', String(WEB_PORT)] : [nextBin, 'dev', '-p', String(WEB_PORT)];
      webProcess = spawn(process.execPath, commandArgs, {
        cwd: webDir,
        env: {
          ...process.env,
          PORT: String(WEB_PORT),
          NODE_ENV: hasBuild ? 'production' : 'development',
          NEXT_DIST_DIR: distDir || '.next',
          NEXT_PUBLIC_API_URL: `http://127.0.0.1:${API_PORT}/api/v1`,
          NEXT_PUBLIC_FEATURE_PLATFORM_ADMIN: 'false',
        },
        stdio: 'ignore',
      });
      await waitForHttp(`http://127.0.0.1:${WEB_PORT}/login`, 35000);
    }

    // 3. Launch mobile browser at exactly 390px
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  after(async () => {
    if (browser) await browser.close().catch(() => {});
    if (apiProcess) await killProcWithTree(apiProcess);
    if (webProcess) await killProcWithTree(webProcess);
  });

  it('390px viewport has zero horizontal scroll across all Self-Service screens in en & ar', async () => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // Log in as employee
    await page.goto(`http://127.0.0.1:${WEB_PORT}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', 'employee@gulftech.ae');
    await page.fill('input[type="password"]', 'Nextal@2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    const selfServiceUrls = [
      '/me',
      '/me/profile',
      '/me/payslips',
      '/me/attendance',
      '/me/leave',
      '/me/requests',
      '/me/documents',
    ];

    const configs = [
      { lang: 'en', dir: 'ltr' },
      { lang: 'ar', dir: 'rtl' },
    ];

    for (const cfg of configs) {
      // Set lang & direction
      await page.evaluate(({ lang, dir }) => {
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', lang);
        document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
      }, cfg);

      for (const route of selfServiceUrls) {
        await page.goto(`http://127.0.0.1:${WEB_PORT}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);

        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientW = docEl.clientWidth;
          return {
            scrollW,
            clientW,
            diff: scrollW - clientW,
          };
        });

        assert.ok(
          overflow.diff <= 1,
          `Route ${route} [${cfg.lang}] had horizontal overflow! scrollWidth=${overflow.scrollW}, clientWidth=${overflow.clientW}`
        );
      }
    }

    await context.close();
  });
});

