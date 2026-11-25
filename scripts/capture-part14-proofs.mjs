import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://localhost';
const outDir = path.resolve(process.cwd(), 'docs', 'reports', 'part14');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Read credentials from demo-credentials.txt
const credPath = path.resolve(process.cwd(), 'demo-credentials.txt');
const credContent = fs.readFileSync(credPath, 'utf8');

function getCred(role) {
  const re = new RegExp(`${role}\\s*:\\s*(\\S+)\\s*\\|\\s*Password:\\s*(\\S+)`);
  const match = credContent.match(re);
  if (!match) throw new Error(`Role ${role} not found in credentials`);
  return { email: match[1], password: match[2] };
}

const hrCred = getCred('HR_MANAGER');
const adminCred = getCred('COMPANY_ADMIN');
const employeeCred = {
  email: 'arjun.sharma.01@aljalil-demo.test',
  password: hrCred.password,
};

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--disable-gpu'],
  });

  try {
    // 1. Compliance Bulk Upload Modal
    console.log('[1/3] Capturing Compliance Bulk Upload Modal...');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
      const page = await context.newPage();
      await login(page, hrCred.email, hrCred.password);
      await page.goto(`${BASE_URL}/compliance`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Click bulk upload button
      const bulkBtn = await page.waitForSelector('#btn-open-bulk-upload', { timeout: 10000 });
      await bulkBtn.click();
      await page.waitForSelector('div[role="dialog"] h2:has-text("Bulk Upload")', { timeout: 5000 });
      await page.waitForTimeout(600);

      const filePath = path.join(outDir, '01-compliance-bulk-modal.png');
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved: ${filePath}`);
      await context.close();
    }

    // 2. Me Documents Multi-PDF Upload
    console.log('[2/3] Capturing Me Documents Multi-PDF Tab...');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
      const page = await context.newPage();
      await login(page, employeeCred.email, employeeCred.password);
      await page.goto(`${BASE_URL}/me/documents`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Click open upload modal button
      const openUploadBtn = await page.waitForSelector('#btn-open-upload-modal', { timeout: 10000 });
      await openUploadBtn.click();

      // Click multi upload tab
      const tabMulti = await page.waitForSelector('button:has-text("Multiple PDFs"), button:has-text("رفع متعدد")', { timeout: 5000 });
      await tabMulti.click();
      await page.waitForSelector('#my-doc-bulk-input', { timeout: 5000 });
      await page.waitForTimeout(600);

      const filePath = path.join(outDir, '02-me-documents-multi-pdf.png');
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved: ${filePath}`);
      await context.close();
    }

    // 3. Settings Email Delivery Drawer
    console.log('[3/3] Capturing Settings Email Delivery Drawer...');
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
      const page = await context.newPage();
      await login(page, adminCred.email, adminCred.password);
      await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Click Email Delivery card
      const emailTile = await page.waitForSelector('#tile-email_delivery, #settings-tile-email_delivery', { timeout: 10000 });
      await emailTile.click();
      await page.waitForSelector('#drawer-panel', { timeout: 5000 });
      await page.waitForTimeout(600);

      const filePath = path.join(outDir, '03-settings-smtp-drawer.png');
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved: ${filePath}`);
      await context.close();
    }

    console.log('All 3 proof screenshots captured successfully.');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
