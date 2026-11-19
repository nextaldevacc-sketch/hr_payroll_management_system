# Performance Baseline Report (BEFORE Optimizations)

**Date**: 2026-11-19  
**Target Environment**: Production Stack (Docker Compose, Caddy TLS, Next.js 14 Standalone, Postgres 16)  
**Host**: `https://localhost`  

---

## 1. Web Vitals & Frontend Performance (Lighthouse / Playwright CDP Audit)

| Route | Device Viewport | FCP (ms) | LCP (ms) | CLS | TBT (ms) | Speed Index (ms) | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/login` | Desktop (1440x900) | 200 | 200 | 0.0001 | 0 | 200 | ✅ PASS |
| `/login` | Mobile (390x844) | 88 | 88 | 0.0000 | 0 | 88 | ✅ PASS |
| `/` (Dashboard) | Desktop (1440x900) | 132 | 132 | 0.0001 | 0 | 132 | ✅ PASS |
| `/` (Dashboard) | Mobile (390x844) | 88 | 88 | 0.0000 | 0 | 88 | ✅ PASS |
| `/employees` | Desktop (1440x900) | 112 | 112 | 0.0001 | 0 | 112 | ✅ PASS |
| `/employees` | Mobile (390x844) | 100 | 100 | 0.0000 | 0 | 100 | ✅ PASS |
| `/payroll` | Desktop (1440x900) | 100 | 100 | 0.0001 | 0 | 100 | ✅ PASS |
| `/payroll` | Mobile (390x844) | 108 | 108 | 0.0000 | 0 | 108 | ✅ PASS |

*Key Observations*:
- Zero layout shift (`CLS < 0.001`) across all routes and devices.
- Desktop LCP is well below the target SLA (< 1.2s), hovering at ~100–200ms on warm local stack.
- Mobile LCP is under 110ms (target SLA < 2.0s).
- Total Blocking Time is 0ms across all audited views.

---

## 2. API List Query Latencies (`scripts/benchmark-p95.js`, 100 requests each)

| Endpoint | Requests | Min (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) | Avg (ms) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET /api/v1/employees?limit=25` | 100 | 17.51 | 20.08 | 22.33 | 23.06 | 23.06 | 20.21 | ✅ PASS (< 60ms) |
| `GET /api/v1/payroll/runs` | 100 | 7.49 | 8.39 | 9.72 | 10.26 | 10.26 | 8.49 | ✅ PASS (< 60ms) |
| `GET /api/v1/approvals/pending` | 100 | 13.91 | 16.95 | 18.91 | 19.63 | 19.63 | 16.70 | ✅ PASS (< 60ms) |
| `GET /api/v1/me/rejections` | 100 | 4.85 | 5.59 | 6.31 | 6.76 | 6.76 | 5.61 | ✅ PASS (< 60ms) |

*Key Observations*:
- All 4 core list queries complete with p95 < 23ms, exceeding the warm cache SLA of < 60ms.
- Rejection log (`/api/v1/me/rejections`) averages ~5.6ms.

---

## 3. Initial Bundle Sizes

| Route Segment | Direct JS Chunk Size |
| :--- | :---: |
| `/(auth)/login/page` | 7.1 MB (dev build) |
| `/(app)/page` (Dashboard) | 12.5 MB (dev build) |
| `/(app)/employees/page` | 7.8 MB (dev build) |
| `/(app)/payroll/page` | 7.9 MB (dev build) |

---

## 4. Planned Optimizations in Step 4
1. React Query configuration: `staleTime: 60000` (1 min), `gcTime: 600000` (10 min), `refetchOnWindowFocus: false`.
2. Dynamic code splitting: lazy-load Recharts in Dashboard and heavy report components via `next/dynamic` (`{ ssr: false }`).
3. Caddy and Next.js compression: verify `compress: true` in `next.config.js` and gzip/zstd in Caddy.
4. Static caching headers in `deploy/Caddyfile`: `Cache-Control: public, max-age=31536000, immutable` on `/_next/static/*` and `public, max-age=604800` on `/media/*`.
5. Content Security Policy: explicitly permit `media-src 'self'`.
