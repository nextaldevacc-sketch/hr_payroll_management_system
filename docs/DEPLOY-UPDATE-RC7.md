# Nextal HR & Payroll — Release Candidate 7 (RC7) Deployment Runbook

**Target System**: Production VPS (`payroll.nextaltechnologies.com`)  
**Deployment Model**: aaPanel Host Nginx + Docker Compose  
**Security & Migration Standard**: Additive schema migrations only, zero database resets, zero data truncation.

---

## 1. Overview & Architecture

Release Candidate 7 (RC7) introduces:
- **Universal Portal Popover System**: Multi-instance coordinator, responsive mobile bottom-drawer sheet, positioning with auto-flip collision handling, and portal root directly at `document.body`.
- **Jet Black + Orchid Modern Dark Theme**: Base `#1D1D1D`, surface `#222222`, raised `#2A2A2A`, borders `rgba(255,255,255,0.10)`, text `#F5F5F5`, Orchid accent `#E5BDDF`. Zero un-themed blue/sky or decorative gold leftovers.
- **Glassmorphism & Speed Optimization**: Restricting `backdrop-filter: blur(...)` strictly to outermost shell containers (`GlassSidebar`, `GlassTopBar`, `Modal`, `Drawer`, `Popover`), replacing nested card blurs with solid translucent colors. API p95 response time is < 8ms on all core endpoints (well within SLA < 60ms).
- **Session Architecture & Distributed Rate Limiting**: Multi-device session tracking in `sessions` table (device-scoped revocation; logout on one device does not kick others), distributed PostgreSQL `rate_limits` store surviving container restarts, and configurable proxy hop extraction (`TRUST_PROXY`).

```
                    ┌──────────────────────────────────────────────┐
                    │               Client Browser                 │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTPS (443)
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         aaPanel Host Nginx Reverse Proxy     │
                    │         (client_max_body_size 25M)           │
                    └──────────────────────┬───────────────────────┘
                                           │ proxy_pass (3100)
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │       nextal-web-prod (Next.js 14)           │
                    │       Portals, SSR, Theme & UI Layer         │
                    └──────────────────────┬───────────────────────┘
                                           │ API Rewrites (/api/*)
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │       nextal-api-prod (Express API)          │
                    │       TRUST_PROXY=2 (Extracts real IP)       │
                    └──────────────┬───────────────────────────────┘
                                   │ Connection Pool
                                   ▼
                    ┌──────────────────────────────────────────────┐
                    │     nextal-postgres-prod (PostgreSQL 16)     │
                    │     sessions, rate_limits, audit, indexes    │
                    └──────────────────────────────────────────────┘
```

---

## 2. Server Configuration

### A. aaPanel Host Nginx Configuration
In your aaPanel Nginx site configuration for `payroll.nextaltechnologies.com`, verify and apply:

```nginx
# /www/server/panel/vhost/nginx/payroll.nextaltechnologies.com.conf

# 1. Enforce 25MB upload limit for passports, Emirates IDs, and documents
client_max_body_size 25M;

# 2. Proxy to Next.js Web Container
location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300;
    proxy_connect_timeout 60;
}
```

Reload Nginx:
```bash
nginx -t && nginx -s reload
```

---

### B. Environment & `TRUST_PROXY` Settings
In `/opt/nextal/.env.production`:

```env
# Proxy Trust Configuration
# Chain: Client -> aaPanel Nginx (Hop 1) -> Next.js web (Hop 2) -> Express API
# Setting TRUST_PROXY=2 allows Express to inspect the 2nd hop from the right in X-Forwarded-For,
# extracting the real client IP rather than the internal Docker bridge IP (172.x.x.x).
TRUST_PROXY=2

# Database Connection Pool
DATABASE_URL="postgresql://nextal_user:${POSTGRES_PASSWORD}@nextal-postgres-prod:5432/nextal_db?schema=public&connection_limit=25&pool_timeout=20"

# Application Secrets
JWT_SECRET=${JWT_SECRET}
DOCUMENT_ENCRYPTION_KEY=${DOCUMENT_ENCRYPTION_KEY}
ALLOWED_ORIGIN="https://payroll.nextaltechnologies.com"
```

---

## 3. Database Migration Runbook (Strictly Additive)

RC7 includes two strictly additive migrations. They do NOT alter existing table signatures or truncate records:
1. `20261124100000_sessions_and_rate_limits`: Creates `sessions` (multi-device tokens) and `rate_limits` (distributed brute-force protection).
2. `20261125100000_approvals_and_attendance_indexes`: Adds composite indexes `approval_requests(company_id, status)` and `attendance_days(company_id, work_date)` for sub-10ms query execution.

Apply migrations inside the running API container:
```bash
docker exec nextal-api-prod npx prisma migrate deploy
```

Verify migration status:
```bash
docker exec nextal-api-prod npx prisma migrate status
```
Expected output:
```
Database schema is up to date!
```

---

## 4. Image Export & Import (Air-Gapped / Artifact Deployment)

### Step 1: Export Images on Build Machine
```bash
docker save hr-payroll-management-web:latest | gzip > web-rc7.tar.gz
docker save hr-payroll-management-api:latest | gzip > api-rc7.tar.gz
```

### Step 2: Transfer to Production VPS
```bash
scp web-rc7.tar.gz api-rc7.tar.gz root@payroll.nextaltechnologies.com:/opt/nextal/
```

### Step 3: Load Images on Production VPS
```bash
cd /opt/nextal
docker load < web-rc7.tar.gz
docker load < api-rc7.tar.gz
```

### Step 4: Restart Stack with Environment File
Always pass `--env-file .env.production` so secrets and database credentials resolve correctly:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

---

## 5. Post-Deployment Verification

### A. Health & Container Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
All containers (`nextal-postgres-prod`, `nextal-api-prod`, `nextal-web-prod`, `nextal-backup-prod`) must be in `Up ... (healthy)` state.

### B. Automated Production Smoke Test
Execute the comprehensive smoke suite against the live production endpoint:
```bash
SMOKE_ALLOW_WRITE=yes node scripts/smoke-test-prod.mjs https://payroll.nextaltechnologies.com
```
Verification criteria:
- [x] All 27 tests pass (0 skipped)
- [x] Status 200 on `/api/v1/health` with `status: "ok"` and `database: "connected"`
- [x] HSTS, CSP, and `HttpOnly; Secure; SameSite=Lax` cookies verified
- [x] Real throwaway user lockout triggers HTTP 423 on 5 failed attempts
- [x] Port 5432 is not exposed externally

### C. Popover & Session Verification
```bash
node --test frontend/test/popover-portal.test.js
node --test frontend/test/two-context-login.test.js
```
- [x] Popovers portal directly into `document.body`
- [x] Simultaneous logins on two devices remain active; logging out on one device does not kick the second

---

## 6. Rollback Procedures

If any unexpected regression occurs, execute the following rollback:

### Pre-Deployment Backup Tagging
Before loading RC7, tag existing working images:
```bash
docker tag hr-payroll-management-web:latest hr-payroll-management-web:rc6-rollback
docker tag hr-payroll-management-api:latest hr-payroll-management-api:rc6-rollback
```

### Executing Rollback
```bash
docker tag hr-payroll-management-web:rc6-rollback hr-payroll-management-web:latest
docker tag hr-payroll-management-api:rc6-rollback hr-payroll-management-api:latest
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

> **Database Safety Notice**: Because all RC7 migrations are strictly additive (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`), older API and Web code can safely run against the current database without rolling back migrations. No tables or columns need to be dropped.
