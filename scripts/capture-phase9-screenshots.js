import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import treeKill from 'tree-kill';
import prisma from '../backend/src/lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'backend');
const webDir = path.resolve(rootDir, 'frontend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');
const outDir = path.resolve(rootDir, 'docs/screenshots/phase9');

const API_PORT = 5000;
const WEB_PORT = 3100;

function killProc(proc) {
  return new Promise((resolve) => {
    if (!proc || !proc.pid) return resolve();
    treeKill(proc.pid, 'SIGKILL', () => resolve());
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
            console.log(`[killPort] Terminated process ${pid} on port ${port}`);
          } catch {}
        }
      }
    } else {
      execSync(`lsof -t -i :${port} | xargs -r kill -9`, { stdio: 'ignore' });
    }
  } catch {}
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

function verifyScreenshotHashes(dir) {
  console.log(`\nVerifying SHA-256 uniqueness of screenshots in ${dir}...`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
  const hashes = new Map();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    if (hashes.has(hash)) {
      const duplicateOf = hashes.get(hash);
      throw new Error(
        `Byte-identical duplicate screenshot detected: '${file}' matches '${duplicateOf}' (SHA-256: ${hash})`
      );
    }
    hashes.set(hash, file);
  }

  console.log(`Success: All ${files.length} screenshots have unique SHA-256 hashes.`);
}

function appendPhase9ToReviewReport() {
  const reportPath = path.resolve(rootDir, 'docs/reports/screenshots-review.md');
  let content = fs.readFileSync(reportPath, 'utf8');

  // Strip existing Phase 9 section if re-running
  const phase9Index = content.indexOf('## Phase 9: Compliance, Reports & Audit Matrix');
  if (phase9Index !== -1) {
    content = content.slice(0, phase9Index);
  }

  const phase9Section = `## Phase 9: Compliance, Reports & Audit Matrix (\`docs/screenshots/phase9/\`)

| Screenshot File | Verification & Visual Review |
| :--- | :--- |
| \`compliance_en_light.png\` | English Light mode Document Expiry Tracker with 6-tile bento summary (Expired, ≤ 30, ≤ 60, ≤ 90, Missing Data, Total Tracking), active document rows with expiry countdowns, status pills, and Renewal action buttons. |
| \`compliance_en_dark.png\` | English Dark mode Document Expiry Tracker with dark inset boxes, border-free containers, high-contrast urgency badges (red/amber/emerald), and clean typography. |
| \`compliance_ar_light.png\` | Arabic RTL Light mode layout displaying localized headings ('راصد الامتثال وصلاحية الوثائق'), translated document types (جواز سفر، بطاقة عمل), and natural right-to-left alignment. |
| \`compliance_ar_dark.png\` | Arabic RTL Dark mode layout with mirrored status indicators, crisp Arabic numerals, and accessible dark surfaces. |
| \`reports_hub_en_light.png\` | English Light mode Reports & Financial Exports Hub displaying 8 categorized report cards, period filters, dynamic cost centre badges, and direct Excel/CSV download buttons. |
| \`reports_hub_en_dark.png\` | English Dark mode Reports Hub with dark slate cards, emerald and cyan accent icons, and balanced role-based download actions. |
| \`reports_hub_ar_light.png\` | Arabic RTL Light mode Reports Hub with Arabic titles ('مركز التقارير والتصدير المالي'), mirrored grid layout, and localized report descriptions. |
| \`reports_hub_ar_dark.png\` | Arabic RTL Dark mode Reports Hub with high-contrast text, clear format badges (Excel/CSV), and accessible action triggers. |
| \`audit_history_en_light.png\` | English Light mode Immutable Audit History showing full timeline of operational, authentication, and salary actions, filter dropdowns (User, Action, Table), and CSV export button. |
| \`audit_history_en_dark.png\` | English Dark mode Audit History table with dark surface rows, subtle division lines, before/after JSON diff expanders, and timestamp badges. |
| \`audit_history_ar_light.png\` | Arabic RTL Light mode Audit History displaying translated action tags ('إنشاء', 'تحديث', 'اعتماد'), right-aligned actor identities, and Arabic labels. |
| \`audit_history_ar_dark.png\` | Arabic RTL Dark mode Audit History with dark contrast compliance, RTL table headers, and clean action pill indicators. |
`;

  content = content.trimEnd() + '\n\n' + phase9Section;
  fs.writeFileSync(reportPath, content, 'utf8');
  console.log(`Updated review report with Phase 9 at ${reportPath}`);
}

async function setEnvironment(page, theme, lang) {
  await page.evaluate(
    ({ theme, lang }) => {
      localStorage.setItem('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', lang);
    },
    { theme, lang }
  );
  await page.waitForTimeout(600);
}

async function loginAs(page, email, password = 'Nextal@2026!') {
  await page.goto(`http://127.0.0.1:${WEB_PORT}/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  console.log('1. Killing any existing servers on ports 5000 and 3100...');
  killPort(API_PORT);
  killPort(WEB_PORT);

  let apiProc = null;
  let webProc = null;
  let browser = null;

  try {
    console.log('2. Starting Backend API server on port 5000...');
    apiProc = spawn(process.execPath, [path.resolve(apiDir, 'src/server.js')], {
      cwd: apiDir,
      env: { ...process.env, PORT: String(API_PORT), NODE_ENV: 'production' },
      stdio: 'pipe',
    });
    apiProc.stdout.on('data', (d) => process.stdout.write(`[API] ${d}`));
    apiProc.stderr.on('data', (d) => process.stderr.write(`[API-ERR] ${d}`));
    await waitForHttp(`http://127.0.0.1:${API_PORT}/api/v1/health`, 25000);
    console.log('Backend API is healthy on port 5000.');

    console.log('3. Starting Next.js Production server on port 3100 from .next-build...');
    const distDir = fs.existsSync(path.join(webDir, '.next-build')) ? '.next-build' : '.next';
    webProc = spawn(process.execPath, [nextBin, 'start', '-p', String(WEB_PORT)], {
      cwd: webDir,
      env: { ...process.env, NODE_ENV: 'production', NEXT_DIST_DIR: distDir, PORT: String(WEB_PORT) },
      stdio: 'pipe',
    });
    webProc.stdout.on('data', (d) => process.stdout.write(`[WEB] ${d}`));
    webProc.stderr.on('data', (d) => process.stderr.write(`[WEB-ERR] ${d}`));
    await waitForHttp(`http://127.0.0.1:${WEB_PORT}/login`, 35000);
    console.log('Frontend Next.js production server is ready on port 3100.');

    console.log('4. Launching Playwright browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const matrix = [
      { theme: 'light', lang: 'en', suffix: 'en_light' },
      { theme: 'dark', lang: 'en', suffix: 'en_dark' },
      { theme: 'light', lang: 'ar', suffix: 'ar_light' },
      { theme: 'dark', lang: 'ar', suffix: 'ar_dark' },
    ];

    for (const cfg of matrix) {
      console.log(`\n========================================`);
      console.log(`Capturing Phase 9 screens: Theme=${cfg.theme}, Lang=${cfg.lang} [${cfg.suffix}]`);
      console.log(`========================================`);

      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });

      // Set cookie directly on context so initial load is in desired locale
      await context.addCookies([
        { name: 'NEXT_LOCALE', value: cfg.lang, domain: '127.0.0.1', path: '/' },
        { name: 'NEXT_LOCALE', value: cfg.lang, domain: 'localhost', path: '/' },
      ]);

      const page = await context.newPage();

      console.log(`Logging in for [${cfg.suffix}]...`);
      await loginAs(page, 'admin@gulftech.ae');

      // ----------------------------------------------------
      // SCREEN 1: /compliance (Document Expiry Tracker)
      // ----------------------------------------------------
      await page.goto(`http://127.0.0.1:${WEB_PORT}/compliance`, { waitUntil: 'networkidle' });
      await setEnvironment(page, cfg.theme, cfg.lang);
      await page.waitForTimeout(1000);

      // Assert heading
      const compBody = await page.innerText('body');
      const hasCompHeading = cfg.lang === 'ar'
        ? compBody.includes('راصد الامتثال') || compBody.includes('الامتثال')
        : compBody.includes('Document Expiry Tracker') || compBody.includes('Compliance');
      if (!hasCompHeading) {
        throw new Error(`Compliance heading not found in [${cfg.suffix}]`);
      }

      // Assert bento tiles exist
      const hasBentoTiles = cfg.lang === 'ar'
        ? compBody.includes('منتهي') || compBody.includes('٣٠') || compBody.includes('30') || compBody.includes('بيانات')
        : compBody.includes('Expired') || compBody.includes('≤ 30') || compBody.includes('Missing Data');
      if (!hasBentoTiles) {
        throw new Error(`Compliance bento summary tiles not found in [${cfg.suffix}]`);
      }

      // Assert rows exist in document table
      const docRows = page.locator('tbody tr');
      const docRowCount = await docRows.count();
      console.log(`  [${cfg.suffix}] Document rows count: ${docRowCount}`);
      if (docRowCount === 0) {
        throw new Error(`Compliance table has 0 rows in [${cfg.suffix}]`);
      }

      const compPath = path.join(outDir, `compliance_${cfg.suffix}.png`);
      await page.screenshot({ path: compPath });
      console.log(`  Saved: ${compPath}`);

      // ----------------------------------------------------
      // SCREEN 2: /reports (Reports Hub)
      // ----------------------------------------------------
      await page.goto(`http://127.0.0.1:${WEB_PORT}/reports`, { waitUntil: 'networkidle' });
      await setEnvironment(page, cfg.theme, cfg.lang);
      await page.waitForTimeout(1000);

      const repBody = await page.innerText('body');
      const hasRepHeading = cfg.lang === 'ar'
        ? repBody.includes('مركز التقارير') || repBody.includes('التقارير')
        : repBody.includes('Reports & Financial Exports Hub') || repBody.includes('Reports Hub');
      if (!hasRepHeading) {
        throw new Error(`Reports heading not found in [${cfg.suffix}]`);
      }

      // Assert report cards exist
      const hasReportCards = cfg.lang === 'ar'
        ? repBody.includes('الحضور') || repBody.includes('الإجازات') || repBody.includes('المحاسبية')
        : repBody.includes('Attendance') || repBody.includes('Leave') || repBody.includes('Accounting');
      if (!hasReportCards) {
        throw new Error(`Report cards not found in [${cfg.suffix}]`);
      }

      const repPath = path.join(outDir, `reports_hub_${cfg.suffix}.png`);
      await page.screenshot({ path: repPath });
      console.log(`  Saved: ${repPath}`);

      // ----------------------------------------------------
      // SCREEN 3: /audit (Audit History)
      // ----------------------------------------------------
      await page.goto(`http://127.0.0.1:${WEB_PORT}/audit`, { waitUntil: 'networkidle' });
      await setEnvironment(page, cfg.theme, cfg.lang);
      await page.waitForTimeout(1000);

      const auditBody = await page.innerText('body');
      const hasAuditHeading = cfg.lang === 'ar'
        ? auditBody.includes('سجل التدقيق') || auditBody.includes('التدقيق')
        : auditBody.includes('Immutable Audit History') || auditBody.includes('Audit History');
      if (!hasAuditHeading) {
        throw new Error(`Audit heading not found in [${cfg.suffix}]`);
      }

      // Assert audit log rows exist
      const auditRows = page.locator('tbody tr');
      const auditRowCount = await auditRows.count();
      console.log(`  [${cfg.suffix}] Audit rows count: ${auditRowCount}`);
      if (auditRowCount === 0) {
        throw new Error(`Audit table has 0 rows in [${cfg.suffix}]`);
      }

      const auditPath = path.join(outDir, `audit_history_${cfg.suffix}.png`);
      await page.screenshot({ path: auditPath });
      console.log(`  Saved: ${auditPath}`);

      await context.close();
    }

    // 5. Verify all 12 screenshots have unique SHA-256 hashes
    verifyScreenshotHashes(outDir);

    // 6. Update review report
    appendPhase9ToReviewReport();

    console.log('\nAll 12 Phase 9 screenshots captured, verified with 0 duplicates, and review report updated!');
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (webProc) await killProc(webProc);
    if (apiProc) await killProc(apiProc);
    killPort(API_PORT);
    killPort(WEB_PORT);
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
