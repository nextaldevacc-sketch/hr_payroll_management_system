import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://localhost';
const IS_HTTPS = BASE_URL.startsWith('https');

async function measurePage(browser, url, isMobile = false, authToken = null) {
  const context = await browser.newContext({
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile,
    hasTouch: isMobile,
    userAgent: isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // If authToken is provided, set cookie / localStorage before navigation
  if (authToken) {
    await page.addInitScript((token) => {
      localStorage.setItem('nextal_token', token);
      localStorage.setItem('nextal_user', JSON.stringify({
        id: 'bench-admin-id',
        email: 'admin@gulftech.ae',
        name: 'Benchmark Admin',
        role: 'COMPANY_ADMIN',
        roles: ['COMPANY_ADMIN'],
        company_id: 'bench-comp',
      }));
      document.cookie = `nextal_token=${token}; path=/`;
    }, authToken);
  }

  // Inject performance observer setup before page loads
  await page.addInitScript(() => {
    window.__perfMetrics = {
      fcp: 0,
      lcp: 0,
      cls: 0,
      tbt: 0,
      longTasks: 0,
    };

    // Performance Observer for Paint (FCP)
    try {
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            window.__perfMetrics.fcp = entry.startTime;
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch {}

    // Performance Observer for LCP
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          window.__perfMetrics.lcp = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    // Performance Observer for Layout Shifts (CLS)
    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__perfMetrics.cls += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {}

    // Performance Observer for Long Tasks (TBT proxy)
    try {
      const taskObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.duration > 50) {
            window.__perfMetrics.tbt += entry.duration - 50;
            window.__perfMetrics.longTasks++;
          }
        }
      });
      taskObserver.observe({ type: 'longtask', buffered: true });
    } catch {}
  });

  const startNav = performance.now();
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 30000 });
  const navDuration = performance.now() - startNav;

  // Wait a short moment for final layout shifts or paints to settle
  await page.waitForTimeout(1000);

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const perf = window.__perfMetrics || {};
    return {
      fcp: Math.round(perf.fcp || nav.responseEnd || 0),
      lcp: Math.round(perf.lcp || perf.fcp || nav.domContentLoadedEventEnd || 0),
      cls: Number((perf.cls || 0).toFixed(4)),
      tbt: Math.round(perf.tbt || 0),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      load: Math.round(nav.loadEventEnd || 0),
    };
  });

  metrics.speedIndex = Math.round(metrics.fcp * 0.6 + metrics.lcp * 0.4);

  await context.close();
  return {
    url,
    device: isMobile ? 'Mobile (390x844)' : 'Desktop (1440x900)',
    fcp: metrics.fcp,
    lcp: metrics.lcp,
    cls: metrics.cls,
    tbt: metrics.tbt,
    speedIndex: metrics.speedIndex,
  };
}

export async function runPerfAudit() {
  console.log(`Starting performance audit against ${BASE_URL}...`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });

  // Get auth token first by calling API login
  let authToken = null;
  try {
    const loginContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const apiRes = await loginContext.request.post(`${BASE_URL}/api/v1/auth/login`, {
      data: { email: 'admin@gulftech.ae', password: 'Nextal@2026!' },
    });
    if (apiRes.ok()) {
      const data = await apiRes.json();
      authToken = data.token;
      console.log('Obtained admin auth token for authenticated pages.');
    }
    await loginContext.close();
  } catch (err) {
    console.warn('Could not obtain auth token directly from API:', err.message);
  }

  const routes = ['/login', '/', '/employees', '/payroll'];
  const results = [];

  for (const route of routes) {
    const token = route === '/login' ? null : authToken;

    console.log(`Auditing ${route} on Desktop...`);
    const desktopMetrics = await measurePage(browser, route, false, token);
    results.push(desktopMetrics);

    console.log(`Auditing ${route} on Mobile...`);
    const mobileMetrics = await measurePage(browser, route, true, token);
    results.push(mobileMetrics);
  }

  await browser.close();
  console.table(results);
  return results;
}

if (process.argv[1]?.endsWith('measure-perf.mjs')) {
  runPerfAudit().catch(console.error);
}
