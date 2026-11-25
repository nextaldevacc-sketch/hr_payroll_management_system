#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://localhost';

// Read demo credentials
let HR_EMAIL = process.env.DEMO_HR_EMAIL;
let TEST_PASS = process.env.DEMO_HR_PASSWORD;

try {
  let credPath = path.resolve(process.cwd(), 'demo-credentials.txt');
  if (!fs.existsSync(credPath)) {
    credPath = path.resolve(process.cwd(), '..', 'demo-credentials.txt');
  }
  if (fs.existsSync(credPath)) {
    const content = fs.readFileSync(credPath, 'utf8');
    const hrMatch = content.match(/HR_MANAGER\s*:\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
    if (hrMatch) {
      HR_EMAIL = hrMatch[1];
      TEST_PASS = hrMatch[2];
    }
  }
} catch (err) {}

if (!HR_EMAIL || !TEST_PASS) {
  console.error('Failed to load HR_MANAGER credentials');
  process.exit(1);
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function apiRequest(urlPath, token = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, BASE_URL);
    const options = {
      method: 'GET',
      agent: httpsAgent,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Cookie': `token=${token}; access_token=${token}` } : {})
      }
    };
    const start = performance.now();
    const req = https.request(fullUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = performance.now() - start;
        resolve({ status: res.statusCode, duration, data });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function loginApi(email, password) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL('/api/v1/auth/login', BASE_URL);
    const body = JSON.stringify({ email, password });
    const options = {
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Origin': BASE_URL,
      }
    };
    const req = https.request(fullUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const setCookies = res.headers['set-cookie'] || [];
        let token = null;
        for (const c of setCookies) {
          const match = c.match(/(?:token|access_token)=([^;]+)/);
          if (match) {
            token = match[1];
            break;
          }
        }
        if (!token) {
          try {
            const parsed = JSON.parse(data);
            token = parsed.token || parsed.access_token || parsed.data?.token;
          } catch {}
        }
        resolve({ status: res.statusCode, token, rawCookies: setCookies });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function benchmarkApi(token) {
  console.log('\n--- 1. API Latency Benchmark (50 iterations per endpoint) ---');
  const endpoints = [
    { name: 'GET /api/v1/auth/me', path: '/api/v1/auth/me' },
    { name: 'GET /api/v1/dashboard/overview', path: '/api/v1/dashboard/overview' },
    { name: 'GET /api/v1/employees', path: '/api/v1/employees?limit=20' },
    { name: 'GET /api/v1/payroll/runs', path: '/api/v1/payroll/runs' },
    { name: 'GET /api/v1/approvals/pending', path: '/api/v1/approvals/pending' }
  ];

  const results = [];

  for (const ep of endpoints) {
    // Warmup
    await apiRequest(ep.path, token);

    const latencies = [];
    for (let i = 0; i < 50; i++) {
      const res = await apiRequest(ep.path, token);
      latencies.push(res.duration);
    }
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const avg = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;

    results.push({
      endpoint: ep.name,
      p50: p50.toFixed(2),
      p95: p95.toFixed(2),
      p99: p99.toFixed(2),
      avg: avg.toFixed(2)
    });
  }

  console.table(results);
  return results;
}

async function measurePagePerformance(page, urlPath) {
  await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0;
    
    // Calculate LCP using PerformanceObserver if available
    let lcp = 0;
    try {
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        lcp = lcpEntries[lcpEntries.length - 1].startTime;
      }
    } catch {}

    const domNodes = document.querySelectorAll('*').length;

    return {
      fcp: Math.round(fcp),
      lcp: Math.round(lcp || nav.domContentLoadedEventEnd || 0),
      domInteractive: Math.round(nav.domInteractive || 0),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadTime: Math.round(nav.loadEventEnd || 0),
      domNodes,
    };
  });

  return metrics;
}

async function benchmarkFrontend() {
  console.log('\n--- 2. Frontend Core Web Vitals & Performance Benchmark ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });

  const routes = ['/login', '/', '/employees', '/payroll', '/me'];
  const viewports = [
    { name: 'Desktop 1440x900', width: 1440, height: 900, isMobile: false },
    { name: 'Mobile 390x844', width: 390, height: 844, isMobile: true }
  ];

  const pageResults = [];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // First measure /login unauthenticated
    const loginMetrics = await measurePagePerformance(page, '/login');
    pageResults.push({
      viewport: vp.name,
      route: '/login',
      fcp: `${loginMetrics.fcp}ms`,
      lcp: `${loginMetrics.lcp}ms`,
      domReady: `${loginMetrics.domContentLoaded}ms`,
      loadTime: `${loginMetrics.loadTime}ms`,
      domNodes: loginMetrics.domNodes,
    });

    // Now log in as HR Manager
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', HR_EMAIL);
    await page.fill('input[type="password"]', TEST_PASS);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Measure authenticated routes
    for (const r of ['/', '/employees', '/payroll', '/me']) {
      const m = await measurePagePerformance(page, r);
      pageResults.push({
        viewport: vp.name,
        route: r,
        fcp: `${m.fcp}ms`,
        lcp: `${m.lcp}ms`,
        domReady: `${m.domContentLoaded}ms`,
        loadTime: `${m.loadTime}ms`,
        domNodes: m.domNodes,
      });
    }

    await context.close();
  }

  await browser.close();
  console.table(pageResults);
  return pageResults;
}

async function main() {
  console.log(`Starting Performance Benchmark against ${BASE_URL}...`);
  const loginRes = await loginApi(HR_EMAIL, TEST_PASS);
  if (!loginRes.token) {
    console.error('Failed to log in for API benchmark. Response:', loginRes);
    process.exit(1);
  }

  const apiMetrics = await benchmarkApi(loginRes.token);
  const feMetrics = await benchmarkFrontend();

  console.log('\n[PASS] Performance & Speed Metrics benchmark completed successfully.');
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
