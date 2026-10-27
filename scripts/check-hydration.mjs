import { chromium } from 'playwright';

async function testThemeAndLang(browser, url, theme, lang) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const warnings = [];

  page.on('console', (msg) => {
    const text = msg.text();
    // Catch all React warnings and errors
    if (msg.type() === 'error' || msg.type() === 'warning' || text.includes('Hydration') || text.includes('did not match') || text.includes('Warning:')) {
      warnings.push(`[${msg.type()}] ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  // Pre-seed localStorage
  await page.addInitScript(({ theme, lang }) => {
    if (theme) localStorage.setItem('theme', theme);
    if (lang) localStorage.setItem('nextal_language', lang);
  }, { theme, lang });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  console.log(`[URL: ${url} | Theme: ${theme} | Lang: ${lang}] -> ${errors.length} errors, ${warnings.length} warnings`);
  for (const w of warnings) {
    console.log('   ->', w);
  }
  for (const e of errors) {
    console.log('   ERR->', e);
  }

  await context.close();
  return { errors, warnings };
}

async function main() {
  const browser = await chromium.launch();
  
  for (const url of ['http://localhost:3000/', 'http://localhost:3000/styleguide']) {
    for (const theme of ['dark', 'light']) {
      for (const lang of ['en', 'ar']) {
        await testThemeAndLang(browser, url, theme, lang);
      }
    }
  }

  await browser.close();
}

main().catch(console.error);
