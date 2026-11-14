# Nextal HR & Payroll — aaPanel Deployment Runbook

This guide covers deploying and managing Nextal HR & Payroll on a VPS running **aaPanel** with Nginx acting as the host reverse proxy and TLS terminator in front of Docker containers.

---

## 1. Architecture Overview

```text
[ Browser / Client ]
        │  HTTPS (443) / HTTP (80)
        ▼
[ aaPanel Host Nginx ] (Terminates SSL via Let's Encrypt)
        ├── /api/v1/*   ──────► http://127.0.0.1:15000 (Fastify API)
        └── /*          ──────► http://127.0.0.1:13100 (Next.js Web)
                                        │
                                        ▼ (Internal Docker Network)
                                [ PostgreSQL 16 ] (No exposed host ports)
```

- **Frontend (Web)**: Listens internally on `127.0.0.1:13100` (Next.js standalone).
- **Backend (API)**: Listens internally on `127.0.0.1:15000` (Node.js Fastify).
- **Database (PostgreSQL)**: Internal to Docker bridge network `nextal-network` (published ports: `NONE` for maximum security).
- **Reverse Proxy**: Host Nginx managed by aaPanel terminates SSL and routes requests.

---

## 2. Server Prerequisites in aaPanel

1. **aaPanel Installed** on Ubuntu 22.04 or 24.04 LTS.
2. In aaPanel **App Store**, install:
   - **Nginx** (1.24 or newer)
   - **Docker** (or verify Docker Engine is installed via terminal)
3. Ensure ports **80** and **443** are open in the aaPanel **Security** tab.
4. Point your domain's DNS A record (e.g. `payroll.yourcompany.ae`) to your VPS IPv4 address.

---

## 3. Image Preparation & Transfer

Because aaPanel servers often have constrained build resources, we recommend building images on your development machine and transferring them to the VPS:

### Step 3.1: Build Images Locally (on Dev Laptop)
```bash
# Build production images locally
docker build -t hr-payroll-management-api:latest -f backend/Dockerfile .
docker build -t hr-payroll-management-web:latest -f frontend/Dockerfile .

# Save images to compressed archives
mkdir -p images
docker save hr-payroll-management-api:latest | gzip > images/api.tar.gz
docker save hr-payroll-management-web:latest | gzip > images/web.tar.gz
```

### Step 3.2: Transfer to VPS
```bash
# Transfer archives to VPS
scp images/*.tar.gz deploy@<VPS_IP>:/opt/nextal/images/
```

### Step 3.3: Load Images on VPS
```bash
# On your VPS:
docker load -i /opt/nextal/images/api.tar.gz
docker load -i /opt/nextal/images/web.tar.gz
```

---

## 4. Directory & Configuration Setup on VPS

On the VPS:
```bash
sudo mkdir -p /opt/nextal/images /opt/nextal/backups
sudo chown -R $USER:$USER /opt/nextal
cd /opt/nextal

# Copy deployment files into /opt/nextal/
# docker-compose.aapanel.yml
# deploy/
# scripts/
```

### Configure `.env.production`
Copy `.env.production.example` to `.env.production` and generate cryptographically secure secrets:
```bash
cp .env.production.example .env.production
node scripts/gen-secrets.mjs
```

Verify your `.env.production` contains:
```env
POSTGRES_DB=nextal_hr_prod
POSTGRES_USER=nextal_app
POSTGRES_PASSWORD=<strong_random_password>

DOMAIN=payroll.yourcompany.ae
ALLOWED_ORIGIN=https://payroll.yourcompany.ae
COOKIE_SECURE=true
TRUST_PROXY=1

JWT_SECRET=<64_hex_chars>
DOCUMENT_ENCRYPTION_KEY=<64_hex_chars>
BACKUP_ENCRYPTION_PASSPHRASE=<64_hex_chars>

# Real SMTP is mandatory in production
MAIL_MODE=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your_smtp_key>
SMTP_SECURE=false
MAIL_FROM="Nextal Payroll <payroll@yourcompany.ae>"
ALERT_EMAIL_RECIPIENT=devops@yourcompany.ae
```

---

## 5. aaPanel Website & Nginx Reverse Proxy Setup

1. In aaPanel, navigate to **Website** > **Add Site** (or **Proxy Project**):
   - **Domain Name**: `payroll.yourcompany.ae`
   - **Target URL**: `http://127.0.0.1:13100` (Frontend)
   - **Send Host**: `$host`

2. Open the site settings > **SSL** tab:
   - Select **Let's Encrypt**, check your domain, and click **Apply**.
   - Enable **Force HTTPS**.

3. In the site settings > **Config** tab (Nginx configuration), add the API proxy location block and security headers:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name payroll.yourcompany.ae;

    # SSL certificates managed by aaPanel Let's Encrypt
    # ... aaPanel ssl_certificate directives ...

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Max upload size for UAE statutory employee documents (Passport, Visa, Emirates ID)
    client_max_body_size 15M;

    # 1. API Reverse Proxy to Fastify Container (Port 15000)
    location /api/v1/ {
        proxy_pass http://127.0.0.1:15000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    # 2. Web Frontend Reverse Proxy to Next.js Container (Port 13100)
    location / {
        proxy_pass http://127.0.0.1:13100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Click **Save** and reload Nginx in aaPanel.

---

## 6. Initial Stack Launch & Bootstrapping

On the VPS in `/opt/nextal`:

### Step 6.1: Start the Containers
```bash
docker compose --env-file .env.production -f docker-compose.aapanel.yml up -d
```

### Step 6.2: Run Additive Database Migrations
```bash
docker compose --env-file .env.production -f docker-compose.aapanel.yml exec -T api npx prisma migrate deploy
```

### Step 6.3: Initialize Canonical System Roles
```bash
docker compose --env-file .env.production -f docker-compose.aapanel.yml exec -T api npm run seed:system
```

### Step 6.4: Provision Your Initial Organization Admin
```bash
docker compose --env-file .env.production -f docker-compose.aapanel.yml exec -T api npm run setup:company -- \
  --company="Gulf Technology Solutions LLC" \
  --company-ar="حلول التكنولوجيا الخليجية ذ.م.م" \
  --admin="admin@gulftech.ae" \
  --password="YourStrongPassword!2026" \
  --visa-name="Main Dubai Office" \
  --visa-name-ar="المكتب الرئيسي - دبي" \
  --emirate="Dubai"
```

---

## 7. Zero-Downtime Server Updates

When rolling out updates or fixes to production:

```bash
# Run the automated, safe rolling update script:
./deploy/update-server.sh docker-compose.aapanel.yml .env.production
```

**Safety Guarantees of `update-server.sh`:**
- Refuses to execute any destructive flags (`--force-reset`, `reset`, `truncate`, `drop`).
- Creates a safety pre-update database backup before touching any service.
- Tags currently active containers as `:rollback-prev`.
- Applies pending database migrations (`prisma migrate deploy`).
- Restarts API first and verifies health (`/api/v1/health`).
- Restarts Web and verifies health (`/login`).
- Automatically rolls back to the previous images if any health check fails.

---

## 8. Backups & Disaster Recovery

### Automated Backups
The `nextal-backup-prod` container runs on schedule, producing AES-256-CBC encrypted backups in `/opt/nextal/backups/`.

### Manual Snapshot
```bash
docker exec nextal-backup-prod sh /deploy/backup.sh
```

### Restore Drill to a Fresh aaPanel Host
Follow this exact sequence to restore the complete system from an encrypted backup archive to a brand new aaPanel VPS:

1. **Setup aaPanel on the New Host**:
   - Install aaPanel, Nginx, and Docker as documented in Section 2.
   - Recreate the Proxy Project in aaPanel and enable Let's Encrypt SSL as in Section 5.

2. **Restore Secrets & Environment Configuration**:
   - Restore the original `.env.production` file into `/opt/nextal/.env.production`.
   - **Crucial**: Ensure `BACKUP_ENCRYPTION_PASSPHRASE`, `DOCUMENT_ENCRYPTION_KEY`, and `JWT_SECRET` match the original host.

3. **Transfer Encrypted Backup Archive**:
   ```bash
   mkdir -p /opt/nextal/backups/daily
   scp user@offsite-backup-host:/srv/backups/nextal/nextal_backup_YYYYMMDD_HHMMSS.enc /opt/nextal/backups/daily/
   ```

4. **Launch Database and Backup Containers**:
   ```bash
   cd /opt/nextal
   docker compose --env-file .env.production -f docker-compose.aapanel.yml up -d postgres backup
   ```

5. **Wait for PostgreSQL Health Check**:
   ```bash
   docker compose --env-file .env.production -f docker-compose.aapanel.yml ps postgres
   ```

6. **Execute Restore Inside Backup Container**:
   ```bash
   docker exec nextal-backup-prod sh /deploy/restore.sh /backups/daily/nextal_backup_YYYYMMDD_HHMMSS.enc
   ```

7. **Start Application Containers**:
   ```bash
   docker compose --env-file .env.production -f docker-compose.aapanel.yml up -d
   ```

8. **Verify System Health**:
   ```bash
   curl -k http://127.0.0.1:15000/api/v1/health
   curl -k http://127.0.0.1:13100/login
   ```

### Offsite Backup Transfer
Automated transfer of encrypted archives to a secondary storage host:
```bash
export OFFSITE_BACKUP_HOST="backup-uae.secondary.ae"
export OFFSITE_BACKUP_USER="nextal-backup"
export OFFSITE_BACKUP_DIR="/srv/backups/nextal"
export OFFSITE_BACKUP_SSH_KEY="/home/deploy/.ssh/id_ed25519"

sh deploy/offsite-backup.sh
```
