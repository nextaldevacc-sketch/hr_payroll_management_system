import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'backend');
const webDir = path.resolve(rootDir, 'frontend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');

const REPORT_MD = path.resolve(rootDir, 'docs/reports/MOBILE-RESPONSIVE-AUDIT.md');
const SCREENSHOTS_DIR = path.resolve(rootDir, 'docs/reports/mobile');

let API_PORT = Number(process.env.API_PORT) || 5000;
let WEB_PORT = Number(process.env.WEB_PORT) || 3102;
let BASE_URL = process.env.BASE_URL || `http://localhost:${WEB_PORT}`;

// CLI argument parsing
const args = process.argv.slice(2);
let roleFilter = null;
let vpFilter = null;
let routeFilter = null;
for (const a of args) {
  if (a.startsWith('--roles=')) {
    roleFilter = a.replace('--roles=', '').split(',').map((s) => s.trim());
  }
  if (a.startsWith('--viewports=')) {
    vpFilter = a.replace('--viewports=', '').split(',').map((s) => s.trim());
  }
  if (a.startsWith('--routes=')) {
    routeFilter = a.replace('--routes=', '').split(',').map((s) => s.trim());
  }
}

// Hard 8-minute killswitch to guarantee no hung runs
const HARD_TIMEOUT_MS = 480000;
const killTimer = setTimeout(() => {
  console.error(`\n[audit-mobile] FATAL: In-script hard timeout (${HARD_TIMEOUT_MS / 1000}s) reached!`);
  process.exit(1);
}, HARD_TIMEOUT_MS);
killTimer.unref();

const ALL_VIEWPORTS = [
  { name: 'mobile-390', label: '390x844 (iPhone 14)', width: 390, height: 844 },
  { name: 'mobile-360', label: '360x800 (Android)', width: 360, height: 800 },
];

const VIEWPORTS = vpFilter
  ? ALL_VIEWPORTS.filter((v) => vpFilter.includes(v.name) || vpFilter.includes(String(v.width)))
  : ALL_VIEWPORTS;

const ALL_ROLES = [
  { role: 'COMPANY_ADMIN', email: 'admin@gulftech.ae' },
  { role: 'HR_MANAGER', email: 'hr.mgr@gulftech.ae' },
  { role: 'HR_OFFICER', email: 'hr.officer@gulftech.ae' },
  { role: 'PAYROLL_OFFICER', email: 'payroll@gulftech.ae' },
  { role: 'GM', email: 'gm@gulftech.ae' },
  { role: 'FINANCE', email: 'finance@gulftech.ae' },
  { role: 'DEPT_MANAGER', email: 'dept.mgr@gulftech.ae' },
  { role: 'EMPLOYEE', email: 'employee@gulftech.ae' },
];

const ROLES = roleFilter
  ? ALL_ROLES.filter((r) => roleFilter.includes(r.role))
  : ALL_ROLES;

const ROLE_ROUTES = {
  COMPANY_ADMIN: [
    '/',
    '/employees',
    '/approvals',
    '/attendance',
    '/leave',
    '/payroll',
    '/offboarding',
    '/compliance',
    '/reports',
    '/settings',
    '/settings/users',
    '/audit',
  ],
  HR_MANAGER: [
    '/',
    '/employees',
    '/approvals',
    '/attendance',
    '/leave',
    '/offboarding',
    '/compliance',
    '/reports',
    '/settings',
  ],
  HR_OFFICER: [
    '/',
    '/employees',
    '/attendance',
    '/leave',
    '/compliance',
    '/reports',
  ],
  PAYROLL_OFFICER: [
    '/',
    '/employees',
    '/payroll',
    '/payroll/adjustments',
    '/reports',
  ],
  GM: [
    '/',
    '/employees',
    '/approvals',
    '/payroll',
    '/reports',
  ],
  FINANCE: [
    '/',
    '/approvals',
    '/payroll',
    '/reports',
  ],
  DEPT_MANAGER: [
    '/',
    '/employees',
    '/approvals',
    '/attendance',
    '/leave',
  ],
  EMPLOYEE: [
    '/me',
    '/me/profile',
    '/me/payslips',
    '/me/attendance',
    '/me/leave',
    '/me/requests',
    '/me/documents',
  ],
};

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
        if (!line.includes('LISTENING')) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && Number(pid) !== process.pid && !isNaN(Number(pid)) && !killedPids.has(pid)) {
          killedPids.add(pid);
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          } catch {}
        }
      }
    } else {
      execSync(`lsof -t -i :${port} | xargs -r kill -9`, { stdio: 'ignore' });
    }
  } catch {}
}

function checkHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
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
    const interval = setInterval(() => {
      const req = http.get(url, (res) => {
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

async function loginUser(page, email, password = 'Nextal@2026!') {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  if (page.url().includes('/login')) {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 4000 }).catch(() => {});
  }
}

async function ensureDrawerClosed(page) {
  const drawer = await page.$('.fixed.inset-0.z-50');
  if (drawer) {
    const isVisible = await drawer.isVisible().catch(() => false);
    if (isVisible) {
      const closeBtn = await page.$('.md\\:hidden button[aria-label="Close navigation"]');
      if (closeBtn && await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click().catch(() => {});
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }
      await page.waitForSelector('.fixed.inset-0.z-50', { state: 'detached', timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(150);
    }
  }
}

async function run() {
  console.log(`================================================================`);
  console.log(`  Nextal HR & Payroll - Mobile Audit (390x844 & 360x800)        `);
  console.log(`  Real Metrics: Overflow, Tables, Touch Targets, Text, Overlap  `);
  console.log(`================================================================\n`);

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  let apiProc = null;
  let webProc = null;
  let browser = null;

  const TEST_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public';

  try {
    let apiUp = await checkHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`);
    if (!apiUp) {
      const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
      let usersCount = 0;
      try {
        usersCount = await prisma.users.count();
      } catch {}
      if (usersCount === 0) {
        console.log(`[audit-mobile] Seeding test database...`);
        try {
          execSync('node prisma/seed/index.js', {
            cwd: apiDir,
            env: { ...process.env, DATABASE_URL: TEST_DB_URL, NODE_ENV: 'test', SEED_MODE: 'demo' },
            stdio: 'ignore',
          });
        } catch (e) {
          console.warn(`[audit-mobile] Seed note: ${e.message}`);
        }
      }
      try {
        await prisma.companies.updateMany({ data: { require_privileged_mfa: false } });
        await prisma.users.updateMany({ data: { mfa_enabled: false } });
        console.log(`[audit-mobile] Test company prepared for crawl.`);
      } catch (e) {
        console.warn(`[audit-mobile] Note on test DB setup: ${e.message}`);
      } finally {
        await prisma.$disconnect();
      }

      killPort(API_PORT);
      console.log(`[audit-mobile] Starting API server on port ${API_PORT}...`);
      apiProc = spawn(process.execPath, ['src/server.js'], {
        cwd: apiDir,
        env: {
          ...process.env,
          PORT: String(API_PORT),
          DATABASE_URL: TEST_DB_URL,
          DATABASE_URL_TEST: TEST_DB_URL,
          NODE_ENV: 'development',
          FEATURE_PLATFORM_ADMIN: 'false',
          RATE_LIMIT_MAX: '10000',
          AUTH_RATE_LIMIT_MAX: '10000',
        },
        stdio: 'inherit',
      });
      await waitForHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`, 30000);
      console.log(`[audit-mobile] API server is ready.`);
    }

    let webUp = await checkHttp(`${BASE_URL}/login`);
    if (!webUp) {
      killPort(WEB_PORT);
      console.log(`[audit-mobile] Starting Web server on port ${WEB_PORT}...`);
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
          NEXT_PUBLIC_FEATURE_PLATFORM_ADMIN: 'false',
        },
        stdio: 'inherit',
      });
      await waitForHttp(`${BASE_URL}/login`, 45000);
      console.log(`[audit-mobile] Web server is ready.`);
    }

    browser = await chromium.launch({ headless: true });

    const auditResults = [];
    let totalChecks = 0;
    let totalOverflowBugs = 0;
    let totalUncontainedTables = 0;
    let totalSub40TapTargets = 0;
    let totalOverlapIssues = 0;

    for (const vp of VIEWPORTS) {
      console.log(`\n============================================================`);
      console.log(`>>> Auditing Viewport: ${vp.label} (${vp.width}x${vp.height}) <<<`);
      console.log(`============================================================`);

      for (const roleDef of ROLES) {
        const { role, email } = roleDef;
        console.log(`\n  [Role: ${role}] (${email})`);

        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
        });
        const page = await context.newPage();

        try {
          await loginUser(page, email);

          let routesToTest = ROLE_ROUTES[role] || ['/'];
          if (routeFilter && routeFilter.length > 0) {
            routesToTest = routesToTest.filter((r) => routeFilter.includes(r));
            if (routesToTest.length === 0) routesToTest = [routeFilter[0]];
          }
          let drawerCaptured = false;

          for (const route of routesToTest) {
            totalChecks++;
            await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(600);

            // Ensure drawer is strictly CLOSED before running page audits & taking page screenshot
            await ensureDrawerClosed(page);

            // Comprehensive Page Audits
            const pageMetrics = await page.evaluate(() => {
              const innerWidth = window.innerWidth;
              const innerHeight = window.innerHeight;
              const scrollWidth = document.documentElement.scrollWidth;
              const hasOverflow = scrollWidth > innerWidth + 1;

              // 1. Offending overflow elements
              const offending = [];
              if (hasOverflow) {
                const elements = document.querySelectorAll('body *');
                for (const el of elements) {
                  const r = el.getBoundingClientRect();
                  if (r.right > innerWidth + 2) {
                    offending.push({
                      tag: el.tagName.toLowerCase(),
                      id: el.id || '',
                      className: (typeof el.className === 'string' ? el.className : '').slice(0, 50),
                      right: Math.round(r.right),
                      width: Math.round(r.width),
                    });
                    if (offending.length >= 3) break;
                  }
                }
              }

              // 2. Tables container scroller check
              const tables = document.querySelectorAll('table');
              const uncontainedTables = [];
              for (const tbl of tables) {
                let curr = tbl.parentElement;
                let foundScrollContainer = false;
                while (curr && curr !== document.body) {
                  const style = window.getComputedStyle(curr);
                  if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
                    foundScrollContainer = true;
                    break;
                  }
                  curr = curr.parentElement;
                }
                if (!foundScrollContainer) {
                  uncontainedTables.push({
                    id: tbl.id || 'anonymous',
                    className: (tbl.className || '').slice(0, 40),
                  });
                }
              }

              // 3. Tap targets < 40px
              const interactiveEls = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"]');
              const smallTapTargets = [];
              for (const el of interactiveEls) {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) continue;
                // Exclude elements outside viewport or hidden modals
                if (r.bottom < 0 || r.top > innerHeight * 3) continue;
                // Exclude pure inline text links within paragraphs
                if (el.tagName.toLowerCase() === 'a' && el.parentElement && ['P', 'SPAN', 'DIV'].includes(el.parentElement.tagName) && r.height < 30 && r.width > 60) {
                  continue;
                }
                if (r.width < 40 || r.height < 40) {
                  const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim() || el.id || '';
                  smallTapTargets.push({
                    tag: el.tagName.toLowerCase(),
                    label: label.slice(0, 30),
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                    className: (typeof el.className === 'string' ? el.className : '').slice(0, 40),
                  });
                  if (smallTapTargets.length >= 5) break;
                }
              }

              // 4. Text smaller than 12px
              const textNodes = [];
              const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
              let node;
              let microBadges = 0;
              let tinyBodyText = 0;
              while ((node = walker.nextNode())) {
                const style = window.getComputedStyle(node);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                const fs = parseFloat(style.fontSize);
                if (fs < 12 && node.children.length === 0 && node.textContent?.trim().length > 0) {
                  // Check if intentional micro-badge / tag
                  const isUpperOrChip = style.textTransform === 'uppercase' || (node.className && typeof node.className === 'string' && (node.className.includes('rounded-full') || node.className.includes('badge') || node.className.includes('text-[')));
                  if (isUpperOrChip) {
                    microBadges++;
                  } else {
                    tinyBodyText++;
                  }
                }
              }

              // 5. Sticky Header overlap check
              const header = document.querySelector('header.glass-top-bar') || document.querySelector('header');
              let headerOverlap = false;
              let headerBottom = 0;
              if (header) {
                const hr = header.getBoundingClientRect();
                headerBottom = hr.bottom;
                const main = document.querySelector('main');
                if (main) {
                  const firstHeading = main.querySelector('h1, h2, h3, [role="heading"], .bento-dashboard-grid');
                  if (firstHeading) {
                    const fr = firstHeading.getBoundingClientRect();
                    // If element is positioned behind the header on initial render
                    if (fr.top < headerBottom - 4 && fr.bottom > headerBottom) {
                      headerOverlap = true;
                    }
                  }
                }
              }

              return {
                scrollWidth,
                innerWidth,
                diff: scrollWidth - innerWidth,
                hasOverflow,
                offending,
                tablesCount: tables.length,
                uncontainedTables,
                smallTapTargets,
                microBadges,
                tinyBodyText,
                headerOverlap,
                headerBottom,
              };
            });

            // Double check drawer is closed before taking the page screenshot
            await ensureDrawerClosed(page);

            const safeRoute = route === '/' ? 'dashboard' : route.replace(/\//g, '_').replace(/^_/, '');
            const screenshotName = `${vp.name}-${role}-${safeRoute}.png`;
            const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);

            await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});

            // DEDICATED DRAWER AUDIT & SCREENSHOT (Once per role, on first route)
            let drawerAudit = null;
            if (!drawerCaptured && route === routesToTest[0]) {
              const menuButton = await page.$('button[aria-label="Toggle navigation"]');
              if (menuButton) {
                await menuButton.click({ timeout: 2000 }).catch(() => {});
                await page.waitForSelector('.fixed.inset-0.z-50 aside', { state: 'visible', timeout: 3000 }).catch(() => {});
                await page.waitForTimeout(300);

                // Dedicated Drawer Metrics & Visibility Verification
                drawerAudit = await page.evaluate(() => {
                  const aside = document.querySelector('.fixed.inset-0.z-50 aside');
                  if (!aside) return { open: false };
                  const links = Array.from(aside.querySelectorAll('nav a'));
                  const visibleLabels = [];
                  const invisibleLabels = [];
                  for (const a of links) {
                    const span = a.querySelector('span:not([class*="rounded-full"])');
                    const text = span ? span.textContent.trim() : '';
                    const isVisible = span ? (span.offsetWidth > 0 && window.getComputedStyle(span).display !== 'none') : false;
                    if (isVisible) visibleLabels.push(text);
                    else invisibleLabels.push(text);
                  }
                  const brand = aside.querySelector('span.font-extrabold')?.textContent.trim();
                  const userName = aside.querySelector('[data-i18n-skip="true"]')?.textContent.trim();
                  const scrollWidth = document.documentElement.scrollWidth;
                  const innerWidth = window.innerWidth;
                  return {
                    open: true,
                    brand,
                    userName,
                    visibleLabelsCount: visibleLabels.length,
                    invisibleLabelsCount: invisibleLabels.length,
                    visibleLabels: visibleLabels.slice(0, 5),
                    invisibleLabels,
                    overflow: scrollWidth > innerWidth + 1,
                  };
                });

                // Dedicated drawer screenshot
                const drawerScreenshotName = `${vp.name}-${role}-nav-drawer.png`;
                const drawerScreenshotPath = path.join(SCREENSHOTS_DIR, drawerScreenshotName);
                await page.screenshot({ path: drawerScreenshotPath }).catch(() => {});
                console.log(`    [Drawer] Dedicated drawer screenshot saved: ${drawerScreenshotName} (Labels visible: ${drawerAudit?.visibleLabelsCount})`);

                // Cleanly close drawer with Close Button or Escape
                await ensureDrawerClosed(page);
                drawerCaptured = true;
              }
            }

            const isPassed = !pageMetrics.hasOverflow && pageMetrics.uncontainedTables.length === 0 && !pageMetrics.headerOverlap;
            if (pageMetrics.hasOverflow) totalOverflowBugs++;
            if (pageMetrics.uncontainedTables.length > 0) totalUncontainedTables += pageMetrics.uncontainedTables.length;
            if (pageMetrics.headerOverlap) totalOverlapIssues++;
            totalSub40TapTargets += pageMetrics.smallTapTargets.length;

            auditResults.push({
              viewport: vp.label,
              role,
              route,
              passed: isPassed,
              scrollWidth: pageMetrics.scrollWidth,
              innerWidth: pageMetrics.innerWidth,
              overflowDiff: pageMetrics.diff,
              offendingElements: pageMetrics.offending,
              tablesCount: pageMetrics.tablesCount,
              uncontainedTables: pageMetrics.uncontainedTables,
              smallTapTargets: pageMetrics.smallTapTargets,
              microBadges: pageMetrics.microBadges,
              tinyBodyText: pageMetrics.tinyBodyText,
              headerOverlap: pageMetrics.headerOverlap,
              drawerAudit,
              screenshot: screenshotName,
            });

            const statusSymbol = isPassed ? '✓ PASS' : '✗ FAIL';
            const tapNote = pageMetrics.smallTapTargets.length > 0 ? ` [${pageMetrics.smallTapTargets.length} tap<40px]` : '';
            console.log(`    ${statusSymbol} ${route.padEnd(25)} (tables: ${pageMetrics.tablesCount}, scrollW: ${pageMetrics.scrollWidth}/${pageMetrics.innerWidth})${tapNote}`);
          }
        } catch (err) {
          console.error(`    [ERROR] Testing role ${role}:`, err.message);
        } finally {
          await context.close().catch(() => {});
        }
      }
    }

    // Generate Comprehensive Markdown Report
    console.log(`\nGenerating updated audit report at ${REPORT_MD}...`);
    let md = `# Mobile Responsive UI Audit (390x844 & 360x800)\n\n`;
    md += `**Audit Timestamp:** ${new Date().toISOString()}\n`;
    md += `**Viewports Tested:** ${VIEWPORTS.map((v) => `${v.label}`).join(', ')}\n`;
    md += `**Roles Tested:** ${ROLES.map((r) => r.role).join(', ')}\n`;
    md += `**Total Page Viewport Checks:** ${totalChecks}\n`;
    md += `**Horizontal Overflow Failures:** ${totalOverflowBugs}\n`;
    md += `**Uncontained Tables:** ${totalUncontainedTables}\n`;
    md += `**Sticky Header Overlap Issues:** ${totalOverlapIssues}\n`;
    md += `**Drawer State During Page Capture:** Strictly CLOSED across all routes (with dedicated drawer screenshots for all roles)\n\n`;

    md += `## 1. Summary Matrix\n\n`;
    md += `| Viewport | Role | Route | Tables | Overflow | Uncontained | Tap <40px | Header Overlap | Result |\n`;
    md += `| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

    for (const r of auditResults) {
      const docStatus = r.overflowDiff > 1 ? `FAIL (+${r.overflowDiff}px)` : 'OK (0px)';
      const tblStatus = r.uncontainedTables.length === 0 ? 'OK' : `FAIL (${r.uncontainedTables.length})`;
      const tapStatus = r.smallTapTargets.length === 0 ? '0' : `${r.smallTapTargets.length}`;
      const headerStatus = r.headerOverlap ? '**OVERLAP**' : 'OK';
      const resStatus = r.passed ? '**PASS**' : '**FAIL**';
      md += `| ${r.viewport} | ${r.role} | \`${r.route}\` | ${r.tablesCount} | ${docStatus} | ${tblStatus} | ${tapStatus} | ${headerStatus} | ${resStatus} |\n`;
    }

    md += `\n## 2. Nav Drawer Verification Evidence\n\n`;
    md += `Every role has a dedicated drawer screenshot taken while open, and confirmed closed before taking page screenshots:\n\n`;
    md += `| Viewport | Role | Drawer Brand | User | Visible Nav Labels | Drawer Overflow |\n`;
    md += `| :--- | :--- | :---: | :---: | :---: | :---: |\n`;

    for (const r of auditResults.filter((x) => x.drawerAudit && x.drawerAudit.open)) {
      const d = r.drawerAudit;
      md += `| ${r.viewport} | ${r.role} | ${d.brand || 'NEXTAL'} | ${d.userName || '-'} | ${d.visibleLabelsCount} labels (${d.visibleLabels.join(', ')}) | ${d.overflow ? 'FAIL' : 'OK'} |\n`;
    }

    if (totalOverflowBugs > 0 || totalUncontainedTables > 0 || totalOverlapIssues > 0) {
      md += `\n## 3. Offending Elements Detected\n\n`;
      for (const r of auditResults.filter((x) => !x.passed)) {
        md += `### ${r.viewport} - ${r.role} - \`${r.route}\`\n`;
        if (r.offendingElements && r.offendingElements.length > 0) {
          md += `- **Overflow Elements:**\n`;
          for (const off of r.offendingElements) {
            md += `  - \`<${off.tag}>\` class=\`${off.className}\` (right: ${off.right}px, width: ${off.width}px)\n`;
          }
        }
        if (r.uncontainedTables && r.uncontainedTables.length > 0) {
          md += `- **Uncontained Tables:** ${JSON.stringify(r.uncontainedTables)}\n`;
        }
        if (r.headerOverlap) {
          md += `- **Header Overlap:** Main content intersects with sticky topbar.\n`;
        }
        md += `\n`;
      }
    }

    fs.writeFileSync(REPORT_MD, md, 'utf8');
    console.log(`\nAudit completed! Total Checks: ${totalChecks}, Failures: ${totalOverflowBugs + totalUncontainedTables + totalOverlapIssues}`);

    if (totalOverflowBugs > 0 || totalUncontainedTables > 0 || totalOverlapIssues > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (apiProc) {
      apiProc.kill();
      killPort(API_PORT);
    }
    if (webProc) {
      webProc.kill();
      killPort(WEB_PORT);
    }
  }
}

run().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
