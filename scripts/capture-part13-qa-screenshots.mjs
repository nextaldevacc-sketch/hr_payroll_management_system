import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://localhost';
const OUT_DIR = path.resolve(process.cwd(), 'docs', 'screenshots', 'part13');

// Ensure output dir exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Read credentials
const credsPath = path.resolve(process.cwd(), 'demo-credentials.txt');
const credsText = fs.readFileSync(credsPath, 'utf8');

function getRoleCreds(roleCode) {
  if (roleCode === 'EMPLOYEE') {
    const match = credsText.match(/EMPLOYEE\s*\|\s*EMP-001\s*\|\s*[^|]+\|\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
    if (!match) throw new Error('EMPLOYEE creds not found');
    return { email: match[1], password: match[2] };
  }
  const regex = new RegExp(`${roleCode}\\s*:\\s*(\\S+)\\s*\\|\\s*Password:\\s*(\\S+)`);
  const match = credsText.match(regex);
  if (!match) throw new Error(`Role ${roleCode} not found in demo-credentials.txt`);
  return { email: match[1], password: match[2] };
}

const ROLES = [
  {
    role: 'COMPANY_ADMIN',
    dashboard: '/',
    secondary: ['/employees', '/payroll', '/settings']
  },
  {
    role: 'HR_MANAGER',
    dashboard: '/',
    secondary: ['/employees', '/attendance', '/leave']
  },
  {
    role: 'HR_OFFICER',
    dashboard: '/',
    secondary: ['/employees', '/attendance', '/leave']
  },
  {
    role: 'HR_OFFICER_V2',
    dashboard: '/',
    secondary: ['/employees', '/attendance', '/leave']
  },
  {
    role: 'PAYROLL_OFFICER',
    dashboard: '/',
    secondary: ['/payroll', '/payroll/runs', '/compliance']
  },
  {
    role: 'GM',
    dashboard: '/',
    secondary: ['/reports', '/payroll', '/employees']
  },
  {
    role: 'FINANCE',
    dashboard: '/',
    secondary: ['/payroll', '/reports', '/audit']
  },
  {
    role: 'DEPT_MANAGER',
    dashboard: '/',
    secondary: ['/employees', '/attendance', '/leave']
  },
  {
    role: 'EMPLOYEE',
    dashboard: '/me',
    secondary: ['/me/attendance', '/me/payslips', '/me/leave']
  }
];

const rolePasswordCache = new Map();

async function loginRole(page, roleDef) {
  const { email, password: defaultPass } = getRoleCreds(roleDef.role);
  const password = rolePasswordCache.get(roleDef.role) || defaultPass;
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(500);

  // Check if forced password change
  if (page.url().includes('/change-password')) {
    console.log(`[${roleDef.role}] Forced password change detected. Completing change password flow...`);
    const newPass = `Tmp!${Date.now()}PassA1`;
    await page.waitForSelector('#new-password', { timeout: 10000 });
    await page.fill('#new-password', newPass);
    await page.fill('#confirm-password', newPass);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes('/change-password'), { timeout: 15000 });
    rolePasswordCache.set(roleDef.role, newPass);
    console.log(`[${roleDef.role}] Landed at ${page.url()} after password change.`);
  }

  // If EMPLOYEE landed on '/', redirect to '/me'
  if (roleDef.role === 'EMPLOYEE' && !page.url().includes('/me')) {
    await page.goto(`${BASE_URL}/me`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  }
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
  }, theme);
  await page.waitForTimeout(100);
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  console.log(`Starting Part 13 Screenshot QA to ${OUT_DIR}...`);

  for (const roleDef of ROLES) {
    console.log(`\n=== Capturing role: ${roleDef.role} ===`);

    for (const vp of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 }
    ]) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        ignoreHTTPSErrors: true
      });
      const page = await context.newPage();

      try {
        await loginRole(page, roleDef);

        const pagesToCapture = [roleDef.dashboard, ...roleDef.secondary];

        for (const targetPath of pagesToCapture) {
          const pageUrl = `${BASE_URL}${targetPath}`;
          await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(600);

          for (const theme of ['dark', 'light']) {
            await setTheme(page, theme);
            const pathSlug = targetPath === '/' ? 'dashboard' : targetPath.replace(/\//g, '_').replace(/^_/, '');
            const filename = `${roleDef.role}_${pathSlug}_${vp.name}_${theme}.png`;
            await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
            console.log(`  Saved: ${filename}`);
          }
        }

        // Additional interaction captures for HR_MANAGER
        if (roleDef.role === 'HR_MANAGER') {
          await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(500);

          if (vp.name === 'desktop') {
            for (const theme of ['dark', 'light']) {
              await setTheme(page, theme);

              // 1. Company Switcher Popover
              const switcher = await page.$('#btn-company-visa-switcher');
              if (switcher) {
                await switcher.click();
                await page.waitForSelector('#company-visa-dropdown-panel', { timeout: 3000 });
                await page.waitForTimeout(200);
                await page.screenshot({ path: path.join(OUT_DIR, `popover_company_switcher_desktop_${theme}.png`) });
                console.log(`  Saved: popover_company_switcher_desktop_${theme}.png`);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(200);
              }

              // 2. Notifications Bell Popover
              const notifBell = await page.$('#btn-notifications-bell');
              if (notifBell) {
                await notifBell.click();
                await page.waitForSelector('#notifications-dropdown-panel', { timeout: 3000 });
                await page.waitForTimeout(200);
                await page.screenshot({ path: path.join(OUT_DIR, `popover_notifications_desktop_${theme}.png`) });
                console.log(`  Saved: popover_notifications_desktop_${theme}.png`);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(200);
              }

              // 3. User Menu Popover
              const userMenu = await page.$('#btn-user-menu');
              if (userMenu) {
                await userMenu.click();
                await page.waitForSelector('#user-menu-dropdown-panel', { timeout: 3000 });
                await page.waitForTimeout(200);
                await page.screenshot({ path: path.join(OUT_DIR, `popover_user_menu_desktop_${theme}.png`) });
                console.log(`  Saved: popover_user_menu_desktop_${theme}.png`);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(200);
              }
            }

            // 4. Select Component Portaled Listbox
            await page.goto(`${BASE_URL}/payroll/runs`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(800);
            for (const theme of ['dark', 'light']) {
              await setTheme(page, theme);
              const selectTrigger = await page.$('button[role="combobox"]');
              if (selectTrigger) {
                await selectTrigger.click();
                await page.waitForSelector('[role="listbox"]', { timeout: 3000 });
                await page.waitForTimeout(200);
                await page.screenshot({ path: path.join(OUT_DIR, `popover_select_listbox_desktop_${theme}.png`) });
                console.log(`  Saved: popover_select_listbox_desktop_${theme}.png`);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(200);
              }
            }
          }

          if (vp.name === 'mobile') {
            for (const theme of ['dark', 'light']) {
              await setTheme(page, theme);
              await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
              await page.waitForTimeout(500);

              // Open Mobile Nav Drawer
              const navToggle = await page.$('button[aria-label="Toggle navigation"]');
              if (navToggle) {
                await navToggle.click();
                await page.waitForTimeout(400);
                await page.screenshot({ path: path.join(OUT_DIR, `mobile_nav_drawer_open_${theme}.png`) });
                console.log(`  Saved: mobile_nav_drawer_open_${theme}.png`);
              }

              // Company popover on mobile (bottom sheet)
              const mobileSwitcher = await page.$('#btn-company-visa-switcher');
              if (mobileSwitcher) {
                await mobileSwitcher.click();
                await page.waitForTimeout(400);
                await page.screenshot({ path: path.join(OUT_DIR, `popover_company_mobile_sheet_${theme}.png`) });
                console.log(`  Saved: popover_company_mobile_sheet_${theme}.png`);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(200);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error capturing ${roleDef.role} on ${vp.name}:`, err.message);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  console.log('\nAll QA screenshots successfully generated!');
}

run().catch(console.error);
