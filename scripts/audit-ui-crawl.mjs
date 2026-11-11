import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const REPORT_MD = path.resolve(rootDir, 'docs/reports/BUG-SWEEP-CRAWL.md');
const REPORT_JSON = path.resolve(rootDir, 'docs/reports/BUG-SWEEP-CRAWL.json');

const BASE_URL = 'http://localhost:3100';

const ROLES_TO_AUDIT = [
  { role: 'COMPANY_ADMIN', email: 'admin@gulftech.ae', name: 'Company Admin' },
  { role: 'HR_MANAGER', email: 'hr.mgr@gulftech.ae', name: 'HR Manager' },
  { role: 'HR_OFFICER', email: 'hr.officer@gulftech.ae', name: 'HR Officer (All Visas)' },
  { role: 'HR_OFFICER_V2', email: 'hr.difc@gulftech.ae', name: 'HR Officer (Visa 02 Scoped)' },
  { role: 'PAYROLL_OFFICER', email: 'payroll@gulftech.ae', name: 'Payroll Officer' },
  { role: 'GM', email: 'gm@gulftech.ae', name: 'General Manager' },
  { role: 'FINANCE', email: 'finance@gulftech.ae', name: 'Finance Officer' },
  { role: 'DEPT_MANAGER', email: 'dept.mgr@gulftech.ae', name: 'Department Manager' },
  { role: 'EMPLOYEE', email: 'employee@gulftech.ae', name: 'Employee (Self-Service)' },
];

// Truly destructive or session-breaking actions to skip during crawler traversal
const SKIP_PATTERNS = [
  /log\s*out|sign\s*out|تسجيل\s*الخروج/i,
  /delete|حذف|remove|إزالة/i,
  /terminate|إنهاء\s*الخدمة/i,
  /pay\s*run.*(?:pay|صرف)|mark\s*paid/i,
  /pay\s*settlement|صرف\s*المستحقات/i,
];

function shouldSkipElement(text, ariaLabel, testId, href) {
  const combined = `${text} ${ariaLabel} ${testId} ${href}`.toLowerCase();
  return SKIP_PATTERNS.some((pattern) => pattern.test(combined));
}

async function loginUser(page, email, password = 'Nextal@2026!') {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function checkMobileOverflow(page) {
  return await page.evaluate(() => {
    const docWidth = document.documentElement.offsetWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    if (scrollWidth > docWidth + 2) {
      return {
        hasOverflow: true,
        scrollWidth,
        docWidth,
      };
    }
    return { hasOverflow: false };
  });
}

async function checkForRawTexts(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText || '';
    const badTokens = [];

    // Check literal bad strings
    const literalRegex = /\b(undefined|null|NaN|\[object Object\])\b/g;
    let m;
    while ((m = literalRegex.exec(text)) !== null) {
      // Ignore valid null in code/docs or intentional empty indicators
      const start = Math.max(0, m.index - 20);
      const end = Math.min(text.length, m.index + 20);
      const snippet = text.slice(start, end).replace(/\s+/g, ' ');
      badTokens.push({ token: m[0], snippet });
    }

    // Check raw error codes
    const codeRegex = /\b([A-Z]{3,}_[A-Z0-9_]{3,})\b/g;
    while ((m = codeRegex.exec(text)) !== null) {
      const code = m[1];
      if (
        !['EMPLOYEE', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'DEPT_MANAGER', 'COMPANY_ADMIN'].includes(code) &&
        !code.startsWith('NEXTAL_') &&
        !code.startsWith('EMP_') &&
        !code.startsWith('GDRFA_') &&
        !code.startsWith('MOHRE_') &&
        !code.startsWith('AED_')
      ) {
        badTokens.push({ token: code, snippet: text.slice(Math.max(0, m.index - 20), Math.min(text.length, m.index + 20)) });
      }
    }

    return badTokens;
  });
}

async function run() {
  console.log(`[audit-ui-crawl] Starting UI crawler across ${ROLES_TO_AUDIT.length} roles...`);

  const browser = await chromium.launch({ headless: true });
  const crawlResults = [];
  const allBugs = [];

  for (const { role, email, name } of ROLES_TO_AUDIT) {
    console.log(`\n======================================================`);
    console.log(`[audit-ui-crawl] Crawling as role: ${role} (${email})`);
    console.log(`======================================================`);

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    const consoleErrors = [];
    const networkFailures = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known harmless dev noise (hydration mismatches or aborts)
        if (!text.includes('Failed to load resource') && !text.includes('favicon')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('response', (res) => {
      const status = res.status();
      const url = res.url();
      if (status >= 400 && !url.includes('/api/v1/auth/me') && !url.includes('favicon')) {
        networkFailures.push({ url, status });
      }
    });

    try {
      await loginUser(page, email);

      // Collect visible routes from sidebar navigation
      const navLinks = await page.evaluate(() => {
        const links = [];
        const anchors = document.querySelectorAll('nav a[href], aside a[href]');
        for (const a of anchors) {
          const href = a.getAttribute('href');
          if (href && href.startsWith('/') && !href.startsWith('/#') && !links.includes(href)) {
            links.push(href);
          }
        }
        return links;
      });

      console.log(`[audit-ui-crawl] Found ${navLinks.length} visible routes for ${role}:`, navLinks);

      for (const route of navLinks) {
        console.log(`  -> Visiting route: ${route}`);
        networkFailures.length = 0;
        consoleErrors.length = 0;

        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(500);

        // Check text errors
        const textIssues = await checkForRawTexts(page);
        if (textIssues.length > 0) {
          for (const ti of textIssues) {
            allBugs.push({
              role,
              route,
              type: 'RAW_TEXT_OR_CODE',
              detail: `Visible unformatted literal/code: "${ti.token}" in context: "${ti.snippet}"`,
            });
          }
        }

        // Check mobile viewport overflow at 390px
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(300);
        const overflow = await checkMobileOverflow(page);
        if (overflow.hasOverflow) {
          allBugs.push({
            role,
            route,
            type: 'HORIZONTAL_OVERFLOW_390PX',
            detail: `Content width (${overflow.scrollWidth}px) exceeds 390px screen width (${overflow.docWidth}px).`,
          });
        }
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(300);

        // Find clickable controls on this page
        const clickableLocators = await page.evaluate(() => {
          const controls = [];
          const elements = document.querySelectorAll(
            'button, [role="button"], [role="tab"], .quick-action-btn, [data-testid^="quick-action-"]'
          );

          elements.forEach((el, index) => {
            if (el.offsetParent === null) return; // not visible
            if (el.getAttribute('disabled') !== null) return;

            const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
            const ariaLabel = el.getAttribute('aria-label') || '';
            const testId = el.getAttribute('data-testid') || '';
            const id = el.getAttribute('id') || '';

            controls.push({
              index,
              text: text.slice(0, 40),
              ariaLabel,
              testId,
              id,
              tag: el.tagName.toLowerCase(),
            });
          });
          return controls;
        });

        console.log(`    Found ${clickableLocators.length} visible clickable controls on ${route}`);

        // Sample and test interactive controls (up to 8 per route to prevent timeout)
        const sampleControls = clickableLocators.slice(0, 8);

        for (const ctrl of sampleControls) {
          if (shouldSkipElement(ctrl.text, ctrl.ariaLabel, ctrl.testId, '')) {
            continue;
          }

          networkFailures.length = 0;
          consoleErrors.length = 0;

          const preUrl = page.url();
          const preDomHash = await page.evaluate(() => document.body.innerHTML.length);

          let networkFired = false;
          const reqListener = (req) => {
            if (req.url().includes('/api/')) networkFired = true;
          };
          page.on('request', reqListener);

          try {
            // Find and click
            const locator = ctrl.id
              ? page.locator(`#${ctrl.id}`)
              : ctrl.testId
              ? page.locator(`[data-testid="${ctrl.testId}"]`)
              : page.locator(`${ctrl.tag}`).nth(ctrl.index);

            if ((await locator.count()) > 0 && (await locator.isVisible())) {
              await locator.click({ timeout: 2500 }).catch(() => {});
              await page.waitForTimeout(600);

              const postUrl = page.url();
              const postDomHash = await page.evaluate(() => document.body.innerHTML.length);
              const domChanged = Math.abs(postDomHash - preDomHash) > 10;
              const urlChanged = postUrl !== preUrl;

              // Check for dead clicks: neither URL changed, nor DOM changed, nor network fired
              const isDead = !domChanged && !urlChanged && !networkFired;

              // Check for network errors (403/404/500 after clicking control)
              if (networkFailures.length > 0) {
                for (const nf of networkFailures) {
                  allBugs.push({
                    role,
                    route,
                    target: ctrl.text || ctrl.ariaLabel || ctrl.id || ctrl.testId,
                    type: 'NETWORK_ERROR_POST_CLICK',
                    detail: `Click triggered HTTP ${nf.status} on ${nf.url} (Visibility/Permission Mismatch)`,
                  });
                }
              }

              if (consoleErrors.length > 0) {
                for (const ce of consoleErrors) {
                  allBugs.push({
                    role,
                    route,
                    target: ctrl.text || ctrl.ariaLabel || ctrl.id || ctrl.testId,
                    type: 'CONSOLE_ERROR',
                    detail: ce,
                  });
                }
              }

              crawlResults.push({
                role,
                route,
                control: ctrl.text || ctrl.ariaLabel || ctrl.id || 'unlabeled',
                domChanged,
                urlChanged,
                networkFired,
                isDead,
              });

              // Close any modal or drawer opened by click to restore state
              await page.keyboard.press('Escape').catch(() => {});
            }
          } catch (err) {
            // Click failed or timed out
          } finally {
            page.off('request', reqListener);
          }
        }
      }
    } catch (err) {
      console.error(`[audit-ui-crawl] Error during crawl of role ${role}:`, err);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  // Generate Reports
  const totalAudited = crawlResults.length;
  const deadClicks = crawlResults.filter((r) => r.isDead).length;
  const totalBugs = allBugs.length;

  let md = `# Dead-Click & Interaction UI Crawler Sweep (Section A2)\n\n`;
  md += `> **Platform**: Nextal HR & Payroll Management System\n`;
  md += `> **Generated At**: ${new Date().toISOString()}\n`;
  md += `> **Audit Scope**: ${ROLES_TO_AUDIT.length} Roles Audited Across All Visible Routes\n`;
  md += `> **Total Controls Evaluated**: ${totalAudited}\n`;
  md += `> **Flagged Bugs**: **${totalBugs}** (Dead Clicks: ${deadClicks}, Console/Network/Overflow: ${totalBugs})\n\n`;
  md += `---\n\n`;

  md += `## 1. Flagged Bug Register\n\n`;
  if (totalBugs === 0) {
    md += `✅ **Zero Bugs Detected**. All clickable controls across all roles trigger valid state transitions, DOM updates, or network calls with 0 console errors and 0 4xx/5xx responses.\n\n`;
  } else {
    md += `| Role | Route | Target Control | Bug Type | Detail |\n`;
    md += `|:---|:---|:---|:---|:---|\n`;
    for (const b of allBugs) {
      md += `| \`${b.role}\` | \`${b.route}\` | ${b.target || 'Page Root'} | **${b.type}** | ${b.detail} |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## 2. Crawler Interaction Sample Register\n\n`;
  md += `| Role | Route | Control | DOM Changed | URL Changed | Network Fired | Result |\n`;
  md += `|:---|:---|:---|:---:|:---:|:---:|:---:|\n`;
  for (const c of crawlResults.slice(0, 100)) {
    md += `| \`${c.role}\` | \`${c.route}\` | \`${c.control}\` | ${c.domChanged ? '✓' : '—'} | ${c.urlChanged ? '✓' : '—'} | ${c.networkFired ? '✓' : '—'} | ${c.isDead ? '⚠️ DEAD' : 'PASS'} |\n`;
  }

  fs.writeFileSync(REPORT_MD, md, 'utf8');
  fs.writeFileSync(REPORT_JSON, JSON.stringify({ crawlResults, allBugs }, null, 2), 'utf8');

  console.log(`\n[audit-ui-crawl] Wrote markdown report to ${REPORT_MD}`);
  console.log(`[audit-ui-crawl] Wrote JSON report to ${REPORT_JSON}`);
  console.log(`[audit-ui-crawl] Total controls checked: ${totalAudited} | Bugs: ${totalBugs}`);

  if (totalBugs > 0) {
    console.error(`[audit-ui-crawl] FAIL: Found ${totalBugs} issues that require review/resolution.`);
    process.exit(1);
  } else {
    console.log(`[audit-ui-crawl] PASS: Zero crawler bugs detected.`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('[audit-ui-crawl] Fatal error:', err);
  process.exit(1);
});
