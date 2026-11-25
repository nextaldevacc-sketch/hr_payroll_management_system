# Nextal HR & Payroll — Release Candidate 7 (RC7) Deployment Runbook

**Target System**: Production VPS (`payroll.nextaltechnologies.com`)  
**Deployment Model**: aaPanel Host Nginx + Docker Compose (`docker-compose.prod.yml` + `docker-compose.aapanel.yml`)  
**Security Standard**: Additive schema migrations only, zero database resets, zero remote repository push.

---

## 1. Production Topology & Proxy Architecture

The production environment on the VPS uses host **aaPanel Nginx** as the public reverse proxy. Containers run in private Docker networks and bind to loopback (`127.0.0.1`) ports via `docker-compose.aapanel.yml`:

- **Web Container (`nextal-web-prod`)**: Next.js 14 App Router, listening internally on port 3100, mapped to `127.0.0.1:13100` on host.
- **API Container (`nextal-api-prod`)**: Express API, listening internally on port 5000, mapped to `127.0.0.1:15000` on host.
- **Postgres Container (`nextal-postgres-prod`)**: PostgreSQL 16 on private Docker network (port 5432 is **not** exposed to the host or internet).
- **Caddy Notice**: Do **NOT** run the Caddy container on aaPanel hosts. aaPanel Nginx manages public ports 80 and 443 with its own SSL certificates; Caddy would conflict.

```
                    ┌──────────────────────────────────────────────┐
                    │               Client Browser                 │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTPS (443)
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         aaPanel Host Nginx Reverse Proxy     │
                    │         (client_max_body_size 25M)           │
                    │                                              │
                    │   URL Proxy: /api/v1/  ──► 127.0.0.1:15000   │
                    │   URL Proxy: /         ──► 127.0.0.1:13100   │
                    └──────────────┬───────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         │ (1 Proxy Hop)                                     │ (1 Proxy Hop)
         ▼                                                   ▼
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│   nextal-api-prod (:15000)       │        │   nextal-web-prod (:13100)       │
│   Express Backend                │        │   Next.js 14 Frontend UI         │
│   TRUST_PROXY=1 (Single Hop)     │        │   React Server Components        │
└─────────────────┬────────────────┘        └──────────────────────────────────┘
                  │ Connection Pool
                  ▼
┌──────────────────────────────────┐
│   nextal-postgres-prod (:5432)   │
│   PostgreSQL 16 Private Network  │
└──────────────────────────────────┘
```

---

## 2. Security Critical: `TRUST_PROXY=1` (Preventing IP Spoofing)

### Why `TRUST_PROXY` Must Be `1`, Not `2`:
- In aaPanel Nginx, the URL proxy rule directs `/api/v1/` traffic **directly** to the API container (`127.0.0.1:15000/api/v1/`). It does **not** route through Next.js rewrites in production.
- This means there is **exactly 1 proxy hop** between the client and Express.
- When `TRUST_PROXY=1`, Express trusts the single hop (aaPanel Nginx) and takes the client IP appended by Nginx in `X-Forwarded-For`.
- **Vulnerability Warning**: If `TRUST_PROXY` were set to `2`, Express would trust two hops and look further back in the `X-Forwarded-For` chain. An attacker sending a spoofed header `X-Forwarded-For: 1.2.3.4` would have their spoofed value accepted as `req.ip`. This allows attackers to bypass brute-force rate limits and corrupt security audit logs.
- **Rule**: `TRUST_PROXY=1` is strictly mandatory.

In `/opt/nextal/.env.production`:
```env
# Proxy Trust Configuration: 1 = aaPanel Nginx
TRUST_PROXY=1

# Production Domain & Security
APP_DOMAIN="payroll.nextaltechnologies.com"
ALLOWED_ORIGIN="https://payroll.nextaltechnologies.com"
NODE_ENV=production

# Email Service (default disabled, or smtp with Brevo / Hostinger)
MAIL_MODE=disabled
# SMTP_HOST=smtp-relay.brevo.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=...
# SMTP_PASS=...
# MAIL_FROM="Al Jalil HR <noreply@nextaltechnologies.com>"
WELCOME_CREDENTIALS_MODE=link
EMAIL_RATE_LIMIT_PER_HOUR=100

# Document Encryption Key (AES-256-GCM at rest)
DOCUMENT_ENCRYPTION_KEY=${DOCUMENT_ENCRYPTION_KEY}
JWT_SECRET=${JWT_SECRET}
DATABASE_URL=${DATABASE_URL}
```

---

## 3. aaPanel Host Nginx Configuration

In aaPanel Web Site Management for `payroll.nextaltechnologies.com`:

### A. Set Request Body Limit (25MB)
Under **Site Settings** > **Configuration File**:
```nginx
client_max_body_size 25M;
```

### B. Configure URL Proxy Rules
Under **Site Settings** > **URL rewrite / Reverse Proxy**:
1. **API Direct Proxy Rule**:
   - Proxy Name: `api_v1`
   - Proxy Path: `/api/v1/`
   - Target URL: `http://127.0.0.1:15000/api/v1/`
   - Sent Domain: `$host`
2. **Web Frontend Proxy Rule**:
   - Proxy Name: `next_web`
   - Proxy Path: `/`
   - Target URL: `http://127.0.0.1:13100/`
   - Sent Domain: `$host`

Verify and reload Nginx:
```bash
nginx -t && nginx -s reload
```

---

## 4. Compose Command Alias & Safety Standard

On the production VPS, **always** load both the production compose file and the aaPanel port override file with `.env.production`. Define this alias before running any command:

```bash
cd /opt/nextal
D="docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.aapanel.yml"
```

---

## 5. Deployment Step-by-Step Runbook

### Step 1: Pre-Deployment Backup Tagging (Rollback Safety)
Before pulling or loading new images, preserve current working images:
```bash
docker tag hr-payroll-management-api:latest hr-payroll-management-api:rollback-rc6
docker tag hr-payroll-management-web:latest hr-payroll-management-web:rollback-rc6
```

### Step 2: Load New Artifact Images
```bash
cd /opt/nextal
docker load < api-rc7.tar.gz
docker load < web-rc7.tar.gz
```

### Step 3: Run Database Migrations (Zero Downtime, Additive Only)
Run migrations using the **new API image** in an isolated container before starting the app service. This avoids executing inside a running container that might be mid-restart:

```bash
$D run --rm --no-deps api npx prisma migrate deploy
```

Verify migration status:
```bash
$D run --rm --no-deps api npx prisma migrate status
```
Expected output:
```
Database schema is up to date!
```

### Step 4: Restart Services with Zero Downtime
```bash
$D up -d --remove-orphans api web
```

Check container health:
```bash
$D ps
```
All containers (`nextal-postgres-prod`, `nextal-api-prod`, `nextal-web-prod`, `nextal-backup-prod`) must report `healthy`.

---

## 6. Post-Deployment Verification (Read-Only Checks)

### A. Health & Diagnostics Check (Real Client IP Verification)
Query the health diagnostics endpoint from your workstation (outside the VPS):

```bash
curl -s https://payroll.nextaltechnologies.com/api/v1/health | jq .
```

Verify that:
1. `status` is `"ready"`.
2. `database` is `"connected"`.
3. `diagnostics.client_ip` matches your **actual external public IP address** (not `127.0.0.1`, not `172.x.x.x`).
4. `diagnostics.trust_proxy` is `1`.
5. `diagnostics.max_upload_size_mb` is `25`.

### B. Upload Size Limit Check (413 Payload Too Large)
Verify that aaPanel Nginx and Express reject payloads exceeding 25MB:

```bash
# Generate a 26MB zero payload and send to bulk upload preview
head -c 27262976 /dev/zero | curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST https://payroll.nextaltechnologies.com/api/v1/employees/documents/bulk-upload/preview \
  -H "Authorization: Bearer <VALID_ADMIN_TOKEN>" \
  -H "Content-Type: multipart/form-data" \
  --data-binary @-
```
Expected output:
```
HTTP Status: 413
```

### C. Run Production Smoke Test Suite
```bash
SMOKE_ALLOW_WRITE=yes node scripts/smoke-test-prod.mjs https://payroll.nextaltechnologies.com
```

### D. Verify Multi-Device Sessions
```bash
node --test frontend/test/two-context-login.test.js
```
Expected output: `pass 1 / fail 0`.

---

## 7. Emergency Rollback Procedure

If any regression occurs in production:

```bash
cd /opt/nextal
D="docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.aapanel.yml"

# 1. Restore rollback tags
docker tag hr-payroll-management-api:rollback-rc6 hr-payroll-management-api:latest
docker tag hr-payroll-management-web:rollback-rc6 hr-payroll-management-web:latest

# 2. Re-create containers from restored images
$D up -d --force-recreate api web

# 3. Verify health
$D ps
```

> **Database Safety Notice**: All RC7 schema changes are strictly additive (`welcome_email_sent_at DateTime?`, `sessions` table, `rate_limits` table, document types enum). Older RC6 images run seamlessly against the upgraded database without dropping columns or tables.
