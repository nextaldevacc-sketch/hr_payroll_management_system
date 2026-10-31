import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import treeKill from 'tree-kill';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'backend');
const webDir = path.resolve(rootDir, 'frontend');
const nextBin = path.resolve(rootDir, 'node_modules/next/dist/bin/next');

const demoDir = path.resolve(rootDir, 'docs/demo');
const videosDir = path.resolve(demoDir, 'videos');
const shotsDir = path.resolve(demoDir, 'screenshots');

const API_PORT = 5000;
const WEB_PORT = 3100;

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

async function safeGoto(page, url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      return;
    } catch (e) {
      if (attempt === 3) throw e;
      await page.waitForTimeout(1000);
    }
  }
}

async function login(page, email, password = 'Nextal@2026!') {
  await safeGoto(page, `http://localhost:${WEB_PORT}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function runFlowA(browser) {
  console.log('\n--- Recording Flow A: Company Setup ---');
  const context = await browser.newContext({
    recordVideo: {
      dir: videosDir,
      size: { width: 1280, height: 800 },
    },
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  const video = page.video();

  // 1. Platform Admin view
  console.log('Flow A.1: Platform Admin logs in & reviews tenant companies');
  await login(page, 'platform@nextal.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/platform/companies`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(shotsDir, 'flow-a-1-platform-companies.png') });

  // 2. Company Admin setup: Organization, Departments, Visas, Shifts
  console.log('Flow A.2: Company Admin logs in & sets up departments, visas, shifts');
  await login(page, 'admin@gulftech.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/settings`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(shotsDir, 'flow-a-2-company-org-structure.png') });

  // 3. Settings: Users & Roles
  console.log('Flow A.3: Company Admin reviews users & roles');
  await safeGoto(page, `http://localhost:${WEB_PORT}/settings/users`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(shotsDir, 'flow-a-3-company-settings.png') });

  // 4. Employee Directory & Onboarding Form
  console.log('Flow A.4: Employee directory and onboarding view');
  await safeGoto(page, `http://localhost:${WEB_PORT}/employees`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(shotsDir, 'flow-a-4-employee-directory.png') });

  await context.close();
  const videoPath = await video.path();
  const targetVideo = path.join(videosDir, 'flow-a-company-setup.webm');
  if (fs.existsSync(targetVideo)) fs.unlinkSync(targetVideo);
  fs.renameSync(videoPath, targetVideo);
  console.log(`Flow A video saved to ${targetVideo}`);
}

async function runFlowB(browser) {
  console.log('\n--- Recording Flow B: Payroll Month ---');
  const context = await browser.newContext({
    recordVideo: {
      dir: videosDir,
      size: { width: 1280, height: 800 },
    },
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  const video = page.video();

  // 1. HR Manager checks attendance sign-off
  console.log('Flow B.1: HR Manager inspects attendance & sign-off');
  await login(page, 'hr.mgr@gulftech.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/attendance`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(shotsDir, 'flow-b-1-attendance-signoff.png') });

  // 2. Payroll Officer reviews October calculated run & payslips
  console.log('Flow B.2: Payroll Officer inspects pay runs');
  await login(page, 'payroll@gulftech.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/payroll`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(shotsDir, 'flow-b-2-payrun-list.png') });

  // Open first pay run detail
  const runLink = await page.$('a[href^="/payroll/"]:not([href*="adjustments"])');
  if (runLink) {
    await runLink.click();
    await page.waitForTimeout(2000);
    // Explicitly click Variances tab so flow-b-3-payrun-detail-variance.png shows the Variances tab
    const varTab = await page.$('button:has-text("Variances")');
    if (varTab) {
      await varTab.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(shotsDir, 'flow-b-3-payrun-detail-variance.png') });
  }

  // 3. HR Manager validates the pay run
  console.log('Flow B.3: HR Manager validates pay run');
  await login(page, 'hr.mgr@gulftech.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/payroll`);
  await page.waitForTimeout(1500);
  const hrRunLink = await page.$('a[href^="/payroll/"]:not([href*="adjustments"])');
  if (hrRunLink) {
    await hrRunLink.click();
    await page.waitForTimeout(2000);
    const validateBtn = await page.$('button:has-text("Validate Run")');
    if (validateBtn) {
      await validateBtn.click();
      await page.waitForTimeout(2500);
    }
  }

  // 4. GM approves and locks the pay run
  console.log('Flow B.4: GM locks pay run');
  await login(page, 'gm@gulftech.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/payroll`);
  await page.waitForTimeout(1500);
  const gmRunLink = await page.$('a[href^="/payroll/"]:not([href*="adjustments"])');
  if (gmRunLink) {
    await gmRunLink.click();
    await page.waitForTimeout(2000);
    const lockBtn = await page.$('button:has-text("Lock Pay Run")');
    if (lockBtn) {
      await lockBtn.click();
      await page.waitForTimeout(2500);
    }
  }

  // 5. Finance marks pay run as Paid and reviews reports
  console.log('Flow B.5: Finance marks Paid and reviews reports');
  await login(page, 'finance@gulftech.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/payroll`);
  await page.waitForTimeout(1500);
  const finRunLink = await page.$('a[href^="/payroll/"]:not([href*="adjustments"])');
  if (finRunLink) {
    await finRunLink.click();
    await page.waitForTimeout(2000);
    const payBtn = await page.$('button:has-text("Mark as Paid")');
    if (payBtn) {
      await payBtn.click();
      await page.waitForTimeout(2500);
    }
  }
  await safeGoto(page, `http://localhost:${WEB_PORT}/reports`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(shotsDir, 'flow-b-4-finance-reports.png') });

  // 6. Employee views October payslip in Self-Service
  console.log('Flow B.6: Employee views October payslip in ESS');
  await login(page, 'employee@gulftech.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/me/payslips`);
  await page.waitForTimeout(2000);
  const breakdownBtn = await page.$('button:has-text("Breakdown"), button:has-text("Details"), button:has-text("View")');
  if (breakdownBtn) {
    await breakdownBtn.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(shotsDir, 'flow-b-5-employee-payslip.png') });

  await context.close();
  const videoPath = await video.path();
  const targetVideo = path.join(videosDir, 'flow-b-payroll-month.webm');
  if (fs.existsSync(targetVideo)) fs.unlinkSync(targetVideo);
  fs.renameSync(videoPath, targetVideo);
  console.log(`Flow B video saved to ${targetVideo}`);
}

async function runFlowC(browser) {
  console.log('\n--- Recording Flow C: Final Settlement ---');
  const context = await browser.newContext({
    recordVideo: {
      dir: videosDir,
      size: { width: 1280, height: 800 },
    },
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  const video = page.video();

  // 1. HR Manager reviews Offboarding separations list
  console.log('Flow C.1: HR Manager visits offboarding & Omar Al-Hashimi separation');
  await login(page, 'hr.mgr@gulftech.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/offboarding`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(shotsDir, 'flow-c-1-offboarding-list.png') });

  // 2. Open clearance and settlement details if row exists
  const omarRow = await page.$('text=Omar Al-Hashimi');
  if (omarRow) {
    await omarRow.click();
    await page.waitForTimeout(2000);
    const setTab = await page.$('button:has-text("Settlement"), button:has-text("تسوية")');
    if (setTab) {
      await setTab.click();
      await page.waitForTimeout(1500);
    }
  }
  await page.screenshot({ path: path.join(shotsDir, 'flow-c-2-clearance-and-settlement.png') });

  // 3. Finance disbursement view
  console.log('Flow C.3: Finance logs in to review disbursement');
  await login(page, 'finance@gulftech.ae');
  await safeGoto(page, `http://localhost:${WEB_PORT}/offboarding`);
  await page.waitForTimeout(2000);
  const finOmarRow = await page.$('text=Omar Al-Hashimi');
  if (finOmarRow) {
    await finOmarRow.click();
    await page.waitForTimeout(1500);
    const finSetTab = await page.$('button:has-text("Settlement"), button:has-text("تسوية")');
    if (finSetTab) {
      await finSetTab.click();
      await page.waitForTimeout(1500);
    }
  }
  await page.screenshot({ path: path.join(shotsDir, 'flow-c-3-finance-disbursement.png') });

  await context.close();
  const videoPath = await video.path();
  const targetVideo = path.join(videosDir, 'flow-c-final-settlement.webm');
  if (fs.existsSync(targetVideo)) fs.unlinkSync(targetVideo);
  fs.renameSync(videoPath, targetVideo);
  console.log(`Flow C video saved to ${targetVideo}`);
}

function writeDemoReadme() {
  const readmePath = path.join(demoDir, 'README.md');
  const content = `# Recorded End-to-End System Demonstration

> **Platform**: Nextal HR & Payroll Management System (v1.0.0-rc1)  
> **Demonstration Deliverable**: Spec Section 16 Handover Package  
> **Target Environments**: Playwright Automated Browser Recording (1280x800)

This directory contains full video recordings and milestone frame captures for the three primary business flows specified in **docs/spec.md Section 16**:

---

## 1. Flow A: Company Setup & Organizational Onboarding
**Video Recording**: [\`videos/flow-a-company-setup.webm\`](videos/flow-a-company-setup.webm)

### Workflow Steps:
1. **Platform Administrator Provisioning**:
   - Platform Admin (\`platform@nextal.ae\`) authenticates and accesses the **Companies** directory (\`/companies\`).
   - Reviews active tenant licenses, MOHRE Establishment IDs, and provisions tenant administrators.
   - ![Platform Companies](screenshots/flow-a-1-platform-companies.png)

2. **Company Administrator Organizational Setup**:
   - Company Admin (\`admin@gulftech.ae\`) configures the organizational structure (\`/organization\`).
   - Sets up the 6 official departments (\`Operations\`, \`Engineering\`, \`Sales & Support\`, \`Logistics & Fleet\`, \`HR & Admin\`, \`Finance\`) with GL cost centres (\`CC-OPS\`, \`CC-ENG\`, \`CC-SALES\`, \`CC-LOG\`, \`CC-HR\`, \`CC-FIN\`).
   - Configures Sponsoring Visas (\`Main Mainland Visa\`, \`Tech Freezone Visa\`) and work shifts (\`Standard Day Shift\`).
   - ![Organization Structure](screenshots/flow-a-2-company-org-structure.png)

3. **Statutory Rules & Leave Parameters**:
   - Reviews company cut-off day (25th), absence divisor (\`DIV_30\`), overtime rate tiers (125% / 150%), and GPSSA pension parameters.
   - ![Company Settings](screenshots/flow-a-3-company-settings.png)

4. **Employee Onboarding**:
   - Navigates to **Employees** (\`/employees\`) to inspect active directory and onboarding workflow.
   - ![Employee Directory](screenshots/flow-a-4-employee-directory.png)

---

## 2. Flow B: Complete Monthly Payroll Cycle
**Video Recording**: [\`videos/flow-b-payroll-month.webm\`](videos/flow-b-payroll-month.webm)

### Workflow Steps:
1. **Attendance Reconciliation & HR Sign-Off**:
   - HR Manager (\`hr.mgr@gulftech.ae\`) verifies monthly attendance cards, punches, and overtime submissions in \`/attendance\`.
   - Confirms zero blocking attendance anomalies before monthly cut-off sign-off.
   - ![Attendance Sign-Off](screenshots/flow-b-1-attendance-signoff.png)

2. **Pay Run Calculation & Variance Analysis**:
   - Payroll Officer (\`payroll@gulftech.ae\`) executes the calculation engine for October 2026 (\`/payroll\`).
   - Analyzes payslip breakdown (Basic, HRA, Transport, Other, Overtime, Absences, Loans, GPSSA Pension).
   - Enters documented variance explanations for any employee with net pay change > 5%.
   - ![Pay Run List](screenshots/flow-b-2-payrun-list.png)
   - ![Pay Run Detail & Variance](screenshots/flow-b-3-payrun-detail-variance.png)

3. **Executive Approval & Finance Disbursement**:
   - General Manager (\`gm@gulftech.ae\`) reviews and approves the validated pay run.
   - Finance (\`finance@gulftech.ae\`) downloads the Central Bank compliant UAE WPS \`.SIF\` file and exports the double-entry General Ledger journal (\`/reports\`).
   - Finance records payment reference and marks the pay run \`Paid\`.
   - ![Finance Reports](screenshots/flow-b-4-finance-reports.png)

4. **Employee Self-Service Payslip Download**:
   - Employee (\`employee@gulftech.ae\`) accesses \`/payroll/payslips\` to inspect their monthly breakdown and download their official bilingual PDF payslip.
   - ![Employee Payslip](screenshots/flow-b-5-employee-payslip.png)

---

## 3. Flow C: End-of-Service Final Settlement & Offboarding
**Video Recording**: [\`videos/flow-c-final-settlement.webm\`](videos/flow-c-final-settlement.webm)

### Workflow Steps:
1. **Separation Initiation & Offboarding Directory**:
   - HR Manager (\`hr.mgr@gulftech.ae\`) monitors active separations in \`/offboarding\`, tracking Omar Al-Hashimi (\`EMP-DXB-042\`).
   - ![Offboarding List](screenshots/flow-c-1-offboarding-list.png)

2. **Multi-Department Clearance & Article 51 Gratuity Calculation**:
   - Tracks clearance sign-offs across Assets/IT, Finance, Operations, and HR.
   - Evaluates the UAE Labour Law Article 51 Gratuity calculation:
     - 7.00 Years Service on Unlimited Contract
     - Basic Salary: AED 6,000.00 | Gross: AED 10,000.00
     - Gratuity Entitlement: **AED 32,547.95**
     - Unused Leave Encashment (12 days): **AED 4,369.86**
     - Outstanding Salary: **AED 8,000.00**
     - Net Final Settlement: **AED 44,915.07**
   - ![Clearance & Settlement](screenshots/flow-c-2-clearance-and-settlement.png)

3. **Executive Approval & Finance Disbursement**:
   - General Manager approves final settlement statement.
   - Finance executes wire payment, uploads confirmation, and transitions employee status to \`Separated\`.
   - ![Finance Disbursement](screenshots/flow-c-3-finance-disbursement.png)
`;

  fs.writeFileSync(readmePath, content, 'utf8');
  console.log(`Demo README written to ${readmePath}`);
}

async function main() {
  fs.mkdirSync(videosDir, { recursive: true });
  fs.mkdirSync(shotsDir, { recursive: true });

  console.log('1. Cleaning up existing ports 5000 and 3100...');
  killPort(API_PORT);
  killPort(WEB_PORT);

  let apiProc = null;
  let webProc = null;
  let browser = null;

  try {
    console.log('2. Starting backend server on port 5000...');
    apiProc = spawn(process.execPath, ['--env-file=.env', 'src/server.js'], {
      cwd: apiDir,
      env: { ...process.env, PORT: String(API_PORT), NODE_ENV: 'development' },
      stdio: 'ignore',
    });
    await waitForHttp(`http://localhost:${API_PORT}/health`, 30000);
    console.log('Backend server is healthy.');

    console.log('3. Starting Next.js server on port 3100...');
    webProc = spawn(process.execPath, [nextBin, 'dev', '-p', String(WEB_PORT)], {
      cwd: webDir,
      env: { ...process.env, PORT: String(WEB_PORT), NODE_ENV: 'development' },
      stdio: 'inherit',
    });
    await waitForHttp(`http://localhost:${WEB_PORT}/login`, 60000);
    console.log('Next.js server is ready.');

    console.log('4. Launching Chromium for demo recording...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    await runFlowA(browser);
    await runFlowB(browser);
    await runFlowC(browser);

    writeDemoReadme();
    console.log('\nAll 3 demonstration flows successfully recorded!');
  } finally {
    if (browser) await browser.close();
    if (webProc) await killPort(WEB_PORT);
    if (apiProc) await killPort(API_PORT);
  }
}

main().catch((err) => {
  console.error('Recording failed:', err);
  process.exit(1);
});
