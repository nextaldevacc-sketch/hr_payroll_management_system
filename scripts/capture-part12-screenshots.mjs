import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.resolve(rootDir, 'docs/screenshots/part12');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const credPath = path.resolve(rootDir, 'demo-credentials.txt');
const credContent = fs.readFileSync(credPath, 'utf8');

// Parse role credentials
const roles = [
  'COMPANY_ADMIN',
  'HR_MANAGER',
  'HR_OFFICER',
  'HR_OFFICER_V2',
  'PAYROLL_OFFICER',
  'GM',
  'FINANCE',
  'DEPT_MANAGER',
];

const credentials = {};
for (const role of roles) {
  const reg = new RegExp(`${role}\\s*:\\s*(\\S+)\\s*\\|\\s*Password:\\s*(\\S+)`);
  const match = credContent.match(reg);
  if (match) {
    credentials[role] = { email: match[1], password: match[2] };
  }
}

// Also parse an employee
const empMatch = credContent.match(/EMPLOYEE\s*\|\s*EMP-\d+\s*\|\s*[^|]+\|\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
if (empMatch) {
  credentials['EMPLOYEE'] = { email: empMatch[1], password: empMatch[2] };
}

const BASE_URL = process.env.BASE_URL || 'https://localhost';

async function capture() {
  console.log('=== Starting Part 12 Multi-Role Screenshot Matrix Capture ===');
  console.log('Target URL:', BASE_URL);
  console.log('Output Directory:', outDir);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });

  const viewports = [
    { name: '1440px', width: 1440, height: 900, isMobile: false },
    { name: '390px', width: 390, height: 844, isMobile: true },
  ];

  const themes = ['dark', 'light'];

  for (const [roleName, cred] of Object.entries(credentials)) {
    console.log(`\n--- Capturing Role: ${roleName} (${cred.email}) ---`);

    for (const vp of viewports) {
      for (const theme of themes) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile,
          hasTouch: vp.isMobile,
          ignoreHTTPSErrors: true,
        });
        const page = await context.newPage();

        try {
          // Log in
          await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('input[type="email"]', { timeout: 15000 });
          await page.fill('input[type="email"]', cred.email);
          await page.fill('input[type="password"]', cred.password);
          await page.click('button[type="submit"]');

          await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
          await page.waitForTimeout(1000); // Wait for dashboard data to load

          // Force theme
          await page.evaluate((t) => {
            document.documentElement.setAttribute('data-theme', t);
            if (t === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }, theme);
          await page.waitForTimeout(500);

          const fileName = `${roleName}_${theme}_${vp.name}.png`;
          const filePath = path.join(outDir, fileName);
          await page.screenshot({ path: filePath, fullPage: false });
          console.log(`[SAVED] ${fileName}`);
        } catch (err) {
          console.error(`[ERROR] Failed for ${roleName} ${theme} ${vp.name}:`, err.message);
        } finally {
          await context.close();
        }
      }
    }
  }

  await browser.close();
  console.log('\n=== Screenshot Capture Complete ===');
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
