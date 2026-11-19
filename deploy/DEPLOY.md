# Nextal HR & Payroll — VPS Production Deployment Guide

A step-by-step beginner guide to deploying and operating Nextal HR & Payroll on a production VPS (Standalone Caddy TLS or aaPanel Nginx reverse proxy) with UAE statutory compliance (Federal Decree-Law No. 33 of 2021 and UAE PDPL Decree-Law No. 45 of 2021).

---

## 1. System Architecture & Prerequisites

### Architecture Overview
Nextal HR & Payroll runs as containerized microservices isolated inside a private Docker bridge network (`nextal-network`):
- **Web Frontend**: Next.js standalone container listening on internal port `3100`.
- **API Backend**: Express + Prisma REST API container listening on internal port `5000`.
- **Database**: PostgreSQL 16 Alpine container with private volume (`postgres_data`). No database ports are exposed to the public internet.
- **Backup Service**: Automated encrypted backup container running daily at `02:00 Asia/Dubai` (`22:00 UTC`).
- **Reverse Proxy**:
  - **Option A (Standalone VPS)**: Caddy container handling automated Let's Encrypt TLS certificates, security headers, and HTTPS reverse proxy on ports 80/443.
  - **Option B (aaPanel VPS)**: Host Nginx reverse proxy routing to localhost ports `13100` (Web) and `15000` (API) using `docker-compose.aapanel.yml`.

### Server Specifications
- **Operating System**: Ubuntu 24.04 LTS or 22.04 LTS (x86_64).
- **Compute**: 2 vCPU minimum (4 vCPU recommended for 500+ employee payroll calculations).
- **RAM**: 4 GB RAM minimum (8 GB recommended).
- **Disk**: 40 GB NVMe SSD minimum.
- **UAE Data Residency**: Under UAE PDPL (Decree-Law 45/2021), live UAE employee PII and payroll records must reside on UAE-based infrastructure (e.g., Azure UAE North, AWS me-central-1, OCI UAE, or Moro Hub).

---

## 2. DNS & Domain Configuration

1. Create a DNS **A record** in your domain registrar pointing to your VPS public IPv4 address:
   ```text
   Type: A
   Host: payroll (or @ for root domain)
   Value: 198.51.100.25 (your server IPv4)
   TTL: 300
   ```
2. Verify propagation:
   ```bash
   dig +short payroll.yourcompany.ae
   ```

---

## 3. Server Preparation & Hardening

1. SSH into the server as `root`:
   ```bash
   ssh root@198.51.100.25
   ```
2. Install Docker and Docker Compose plugin:
   ```bash
   apt-get update && apt-get install -y curl ufw git
   curl -fsSL https://get.docker.com | sh
   apt-get install -y docker-compose-plugin
   ```
3. Run the automated hardening script:
   ```bash
   bash deploy/harden-vps.sh
   ```

---

## 4. Production Secrets & Preflight Check

### Step 4.1: Generate High-Entropy Secrets
Run the secrets generator to produce cryptographically random 64-character hex keys:
```bash
node scripts/gen-secrets.mjs
```

### Step 4.2: Configure `.env.production`
Copy the template and fill in your domain, passwords, and secrets:
```bash
cp .env.production.example .env.production
nano .env.production
```
Key configuration items:
- `DOMAIN`: Your public domain (e.g., `payroll.yourcompany.ae`).
- `ALLOWED_ORIGIN`: `https://payroll.yourcompany.ae` (must match exact origin).
- `JWT_SECRET`: 64-character hex string generated above.
- `DOCUMENT_ENCRYPTION_KEY`: 64-character hex string generated above.
- `BACKUP_ENCRYPTION_PASSPHRASE`: 32+ character passphrase for AES-256 backup encryption.
- `POSTGRES_PASSWORD`: Strong password for PostgreSQL.
- `COOKIE_SECURE`: `true`
- `MAIL_MODE`: `smtp` (or `disabled` during initial staging).

### Step 4.3: Run Preflight Verification
Verify that your configuration meets all security and environment constraints:
```bash
node scripts/preflight-prod.mjs .env.production
```
Deployment must NOT proceed if preflight reports any failures.

---

## 5. Deployment Options

### Option A: Standalone VPS with Caddy (Recommended)
This uses `docker-compose.prod.yml` with Caddy handling TLS certificates automatically.

```bash
# 1. Start the containers
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 2. Wait 15 seconds for PostgreSQL healthcheck, then apply migrations
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npx prisma migrate deploy

# 3. Seed system roles catalog (idempotent)
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npm run seed:system
```

### Option B: aaPanel VPS with Nginx Reverse Proxy
In aaPanel, Nginx runs on the host. We use `docker-compose.aapanel.yml` as an override to publish ports `127.0.0.1:13100` and `127.0.0.1:15000` to the host:

```bash
# 1. Start the stack with the aaPanel override
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.aapanel.yml up -d

# 2. Apply migrations
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.aapanel.yml exec api npx prisma migrate deploy

# 3. Seed system roles
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.aapanel.yml exec api npm run seed:system
```

#### aaPanel Nginx Website Configuration
In aaPanel -> Website -> Add Site -> Reverse Proxy:
1. Route `/api/v1` -> `http://127.0.0.1:15000`
2. Route `/` -> `http://127.0.0.1:13100`
3. In SSL tab, apply for Let's Encrypt certificate and enable "Force HTTPS".
4. Ensure the proxy headers include:
   ```nginx
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

---

## 6. First Administrator Bootstrap

Nextal enforces strict role separation and zero default credentials. Create your first administrator using the standalone CLI script:

### Create Company Admin (Inside Container):
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api node scripts/create-first-admin.mjs --email admin@yourcompany.ae --company "Your Company LLC"
```

### Create Platform Admin (Optional):
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api node scripts/create-first-admin.mjs --role PLATFORM_ADMIN --email superadmin@nextal.ae --name "Platform Admin"
```
The script generates a secure, policy-compliant 16-character password and outputs it to the console once. Store this password securely in a password manager. On first login, the admin is required to configure TOTP MFA if privileged.

---

## 7. Zero-Downtime Server Updates

To update an existing installation safely without database resets or downtime:
```bash
./deploy/update-server.sh .env.production
```

### How `update-server.sh` Works:
1. **Safety Backup**: Executes a pre-update snapshot via `nextal-backup-prod`.
2. **Rollback Tagging**: Tags running images as `rollback-prev`.
3. **Additive Migrations**: Executes `prisma migrate deploy` (refuses destructive commands).
4. **Idempotent Seed**: Ensures system role catalog consistency.
5. **Rolling Restart**: Restarts the API service first and polls its `/healthz` endpoint. If healthy, updates the Web service. If health checks fail within 60 seconds, it automatically triggers an instant rollback to previous images.
6. **Compose Override**: Automatically uses `-f docker-compose.prod.yml -f docker-compose.aapanel.yml` if `docker-compose.aapanel.yml` is present.

---

## 8. Backup & Disaster Recovery

### Automated Backup Schedule
- Implemented in `deploy/backup-cron.sh`.
- Runs daily at **02:00 Asia/Dubai (GST, UTC+4)**, which corresponds to `22:00 UTC` (`0 22 * * *`).
- Dumps PostgreSQL schema & data and packages encrypted documents.
- Encrypts archive with AES-256 using `BACKUP_ENCRYPTION_PASSPHRASE`.
- Stored in `./backups/` directory on the host.

### Manual Backup:
```bash
docker exec nextal-backup-prod sh /deploy/backup.sh
```

### Disaster Recovery / Restore:
```bash
# 1. Stop web and api to prevent write conflicts
docker compose -f docker-compose.prod.yml stop web api

# 2. Run restore script pointing to the encrypted backup archive
./deploy/restore.sh ./backups/nextal_backup_20261119_020000.tar.gz.enc

# 3. Restart services
docker compose -f docker-compose.prod.yml start api web
```

---

## 9. Monitoring, Logs & Health Checks

- **API Health**: `curl http://127.0.0.1:5000/api/v1/health`
- **Frontend Health**: `curl http://127.0.0.1:3100/login`
- **Structured JSON Logs**:
  ```bash
  docker logs -f nextal-api-prod
  ```
  Every request includes `requestId`, `method`, `path`, `status`, `duration_ms`, `userId`, and `companyId`.

---

## 10. Live Post-Deployment Smoke Verification

After deployment, run the automated live smoke verification against your public HTTPS domain to validate end-to-end operational health, strict security headers, unauthenticated route guards, cookie flags, and CORS isolation:

```bash
# Basic live smoke test (health, login page, headers, 401 unauth guard, CORS)
node scripts/smoke-live.mjs https://payroll.yourcompany.ae

# Full live smoke test including authenticated login and cookie inspection:
SMOKE_EMAIL=admin@yourcompany.ae SMOKE_PASSWORD="YourPasswordHere" node scripts/smoke-live.mjs https://payroll.yourcompany.ae
```
The script exits with code `0` on 100% success or non-zero on any failure. Ensure all checks pass before opening access to employees.
