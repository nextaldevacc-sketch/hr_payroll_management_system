# Nextal HR & Payroll — VPS Production Deployment Runbook

This guide provides end-to-end instructions for deploying Nextal HR & Payroll on a dedicated Ubuntu 24.04 LTS VPS with automated TLS, container isolation, and UAE statutory compliance.

---

## 1. Pre-Deployment Requirements & UAE Data Residency

### VPS Hardware Requirements
- **Operating System**: Ubuntu 24.04 LTS (x86_64)
- **CPU**: 2 vCPU minimum (4 vCPU recommended for 500+ employee payroll runs)
- **RAM**: 4 GB RAM minimum (8 GB recommended)
- **Storage**: 40 GB NVMe SSD minimum

### UAE Data Residency Statutory Mandate
> [!IMPORTANT]
> Under UAE Federal Decree-Law No. 45 of 2021 regarding Personal Data Protection (PDPL) and Central Bank WPS requirements, processing and storing real UAE employee personal data (Emirates ID numbers, passports, IBANs, and payroll compensation records) must be hosted within the UAE jurisdiction.
> - **Recommended UAE VPS Providers**:
>   - Microsoft Azure (UAE North - Dubai / UAE Central - Abu Dhabi)
>   - Amazon Web Services (AWS Middle East - UAE / me-central-1)
>   - Oracle Cloud Infrastructure (OCI UAE East - Dubai / Abu Dhabi)
>   - Local providers: Moro Hub, e& enterprise (Etisalat), du Cloud
> - **Non-UAE Hosting**: May ONLY be used for synthetic demo environments or staging with dummy data.

---

## 2. DNS & Reverse Proxy Configuration (aaPanel / Nginx)

1. Point your domain or subdomain's **DNS A record** to your VPS public IPv4 address:
   ```text
   Type: A
   Name: payroll (or @)
   IPv4: 198.51.100.25 (your VPS IP)
   TTL:  300 (or Auto)
   ```
2. Verify DNS resolution:
   ```bash
   dig +short payroll.yourcompany.ae
   # Expected Output:
   # 198.51.100.25
   ```

### aaPanel / Nginx Reverse Proxy Setup (MANDATORY for Large File Uploads & Real Client IP)
When terminating SSL with an external Nginx / aaPanel reverse proxy in front of Nextal:

1. **Upload Size Limit (`client_max_body_size`)**:
   Nginx default is `1m` or `2m`. Any employee passport, Emirates ID, or bulk import upload over this threshold will be dropped by Nginx with `HTTP 413 Request Entity Too Large` before ever reaching Caddy or the API.
   In your Nginx site configuration block (`server { ... }` or `location / { ... }`), add:
   ```nginx
   client_max_body_size 25M;
   ```

2. **Real Client IP & Proxy Headers**:
   To ensure rate limiting and security lockout accurately distinguish clients behind the proxy:
   ```nginx
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

3. **Trust Proxy Configuration**:
   In `/opt/nextal/.env.production`, ensure `TRUST_PROXY=1` (or your reverse proxy hop count) is set so Express properly reads `req.ip` from the `X-Forwarded-For` header.

---

## 3. Server Hardening (Run Once as Root)

Connect to your fresh VPS as `root`:
```bash
ssh root@198.51.100.25
```

Download and execute the automated VPS hardening script:
```bash
# From YOUR LAPTOP, copy the hardening script to the server:
#   scp deploy/harden-vps.sh root@<VPS_IP>:/root/harden-vps.sh
# Then on the server:
bash /root/harden-vps.sh
```

**What this configures:**
1. Dedicated `deploy` user with sudo and docker privileges.
2. System timezone set to `UTC` (application handles Asia/Dubai payroll schedules).
3. Automatic 2GB swap if RAM < 4GB.
4. UFW Firewall:
   - Port 22 (SSH rate-limited)
   - Port 80 (HTTP automated TLS challenge & redirect)
   - Port 443 (HTTPS production web traffic)
   - All other incoming ports (including 5432 and 5000) are blocked.
5. Fail2ban active for SSH brute force protection.
6. Docker Engine and Docker Compose official installation.

Log out from `root` and verify SSH login as `deploy`:
```bash
ssh deploy@198.51.100.25
```

---

## 4. Repository Setup & Secret Generation

On your VPS as the `deploy` user:

```bash
sudo mkdir -p /opt/nextal && sudo chown deploy:deploy /opt/nextal
cd /opt/nextal
# Get the code onto the server. Choose ONE option:
#
# Option A (no git remote needed) - from YOUR LAPTOP, in the project folder:
#   rsync -avz --exclude node_modules --exclude .git --exclude .next --exclude .next-build \
#     --exclude backups --exclude 'backend/storage' --exclude '.env*' \
#     ./ deploy@<VPS_IP>:/opt/nextal/
#
# Option B - private GitHub repo with a read-only deploy token:
#   git clone https://<TOKEN>@github.com/<your-account>/<your-repo>.git .
```

Install Node.js 20 on the server (the deploy, preflight, secrets and smoke-test scripts run on the host):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # expect v20.x
```

Generate secure production cryptographic keys:
```bash
node scripts/gen-secrets.mjs
```
*Expected Output:*
```text
================================================================
 Nextal HR & Payroll — Production Secrets Generated
================================================================
# Copy and paste the following into your .env.production file:

JWT_SECRET=81b1648a5f3a277f196e70f505f0432c9c6838c45321307349a48e48f2a9e871
DOCUMENT_ENCRYPTION_KEY=1e2b466375d1e650296955d67eacf05960d0eac68db6fda39a65efb0cfaf1b76
POSTGRES_PASSWORD=5bb645180df4d328ef0d37a394ad7ec37430ed1cfa435218
BACKUP_ENCRYPTION_PASSPHRASE=3912d43de3b0cfba498ca8f6fb533472a90fda6ba508310d0f1f43496707d590
================================================================
```

Create your `.env.production` file:
```bash
cp .env.production.example .env.production
nano .env.production
```

Paste your generated keys and set your domain:
```env
NODE_ENV=production
DOMAIN=payroll.yourcompany.ae
POSTGRES_USER=nextal_app
POSTGRES_PASSWORD=<generated_db_password>
POSTGRES_DB=nextal_hr_prod
DATABASE_URL=postgresql://nextal_app:<generated_db_password>@postgres:5432/nextal_hr_prod?schema=public
JWT_SECRET=<generated_jwt_secret>
DOCUMENT_ENCRYPTION_KEY=<generated_doc_key>
ALLOWED_ORIGIN=https://payroll.yourcompany.ae
COOKIE_SECURE=true
TRUST_PROXY=1
ENABLE_JOBS=true
ENABLE_API_DOCS=false
ENABLE_JOB_TRIGGER_API=false
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=/app/backend/storage
BACKUP_ENCRYPTION_PASSPHRASE=<generated_backup_passphrase>
```

> [!CAUTION]
> Store `DOCUMENT_ENCRYPTION_KEY` and `BACKUP_ENCRYPTION_PASSPHRASE` in your organization's secure password manager (e.g. 1Password / Bitwarden).
> If `DOCUMENT_ENCRYPTION_KEY` is lost, stored encrypted employee documents (passports, contracts) CANNOT be recovered.

---

## 4.1. Email Delivery Configuration (SPF, DKIM, DMARC & Sub-processor Compliance)

Nextal uses real SMTP email transport for user invitations, password resets, document expiry alerts, and payslip release notifications. For reliable delivery and security, configure your sending domain with SPF, DKIM, and DMARC before enabling transactional emails.

### 1. SMTP Environment Configuration
Add your transactional mail provider settings to `.env.production`:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@payroll.yourcompany.ae
SMTP_PASS=your-strong-smtp-password
MAIL_FROM="Nextal HR & Payroll" <noreply@payroll.yourcompany.ae>
ALERT_EMAIL_RECIPIENT=ops@yourcompany.ae
```
*(Note: If you do not wish to enable email in production immediately, set `MAIL_MODE=disabled`. Otherwise, startup validation halts if SMTP variables are missing).*

### 2. DNS Records for Domain Authentication (SPF, DKIM, DMARC)
Configure the following TXT DNS records at your domain registrar:

1. **SPF Record (Sender Policy Framework)**:
   Authorizes the mail server to send emails on behalf of your domain.
   - **Type**: `TXT`
   - **Name**: `@` (or `payroll.yourcompany.ae` if sending from subdomain)
   - **Value**: `v=spf1 include:_spf.mailgun.org ~all`
   - *(Replace `_spf.mailgun.org` with your SMTP provider's SPF include)*

2. **DKIM Record (DomainKeys Identified Mail)**:
   Cryptographically signs outbound messages to prove they were not forged or altered in transit.
   - **Type**: `TXT`
   - **Name**: `k1._domainkey.payroll.yourcompany.ae`
   - **Value**: `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3Q...`
   - *(Obtain selector and public key `p=...` from your mail provider's domain management console)*

3. **DMARC Record (Domain-based Message Authentication, Reporting & Conformance)**:
   Instructs receiving mail servers how to treat messages that fail SPF/DKIM and sends aggregate reports.
   - **Type**: `TXT`
   - **Name**: `_dmarc.payroll.yourcompany.ae`
   - **Value**: `v=DMARC1; p=reject; pct=100; aspf=r; adkim=r; rua=mailto:dmarc-reports@yourcompany.ae; ruf=mailto:dmarc-forensics@yourcompany.ae`
   - *(Enforces `reject` on unaligned emails, protecting your domain from phishing and spoofing)*

### 3. Verification Test (Owner Runs This Step)
To verify your email configuration, send a test invitation or password reset from the UI, or trigger a test email via node:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api node -e '
  import("./src/lib/mailer.js").then(async ({ sendPasswordResetEmail }) => {
    const res = await sendPasswordResetEmail({
      to: "ops@yourcompany.ae",
      employeeName: "System Administrator",
      resetUrl: "https://payroll.yourcompany.ae/reset-password?token=test-verification",
      companyId: "your-company-uuid"
    });
    console.log("Email result:", res);
  });
'
```
Inspect the raw headers of the received email in your mail client (e.g., in Gmail: **More > Show original**; in Outlook: **View message details**). Confirm:
```text
Authentication-Results: ...
  spf=pass (sender IP is ...) smtp.mailfrom=noreply@payroll.yourcompany.ae;
  dkim=pass header.i=@payroll.yourcompany.ae header.s=k1;
  dmarc=pass (p=REJECT sp=REJECT) header.from=payroll.yourcompany.ae
```

### 4. UAE Data Residency & Sub-Processor Compliance (PDPL Mandate)
> [!IMPORTANT]
> - **Sub-Processor Listing**: Transactional email services process personal data, including employee names, work email addresses, and company association. Under UAE Federal Decree-Law No. 45 of 2021 (PDPL), your email delivery vendor is a **Data Sub-Processor** and MUST be formally listed in your organization's Data Processing Agreement (DPA) and Employee Privacy Notice.
> - **UAE / Regional Residency**: Whenever possible for real client employee data, select an email service provider with data processing and storage facilities located in the UAE or GCC region, or ensure appropriate Standard Contractual Clauses (SCCs) / adequacy safeguards are executed for cross-border transmission.
> - **Zero Sensitive Data in Email**: Nextal enforces by design that no salary amounts, bank IBANs, or government identity numbers are ever transmitted in outbound email notifications.

---

## 5. Preflight Verification & Deployment

Execute the preflight configuration check:
```bash
node scripts/preflight-prod.mjs .env.production
```
*Expected Output:*
```text
================================================================
 Nextal HR & Payroll — Production Preflight Verification
 Target File: .env.production
================================================================
--- Checks Executed ---
  PASS: [CORE VALIDATION] Passed all 6 startup criteria
  PASS: [SECRETS] JWT_SECRET is present and entropy-verified
  PASS: [SECRETS] DOCUMENT_ENCRYPTION_KEY is present and entropy-verified
  PASS: [SECRETS] POSTGRES_PASSWORD is present and entropy-verified
  PASS: [SECRETS] BACKUP_ENCRYPTION_PASSPHRASE is present and entropy-verified
  PASS: [DOMAIN] DOMAIN configured as 'payroll.yourcompany.ae'
  PASS: [BACKUP] BACKUP_ENCRYPTION_PASSPHRASE is present and strong

================================================================
 PREFLIGHT PASSED: Environment configuration is 100% production-ready.
================================================================
```

Run the automated deployment script:
```bash
bash deploy/deploy.sh .env.production
```
*Expected Output:*
```text
================================================================
 Nextal HR & Payroll — Starting Idempotent Production Deployment
 Environment File: .env.production
================================================================
[Step 1/6] Running preflight configuration verification...
[Step 2/6] Tagging current running containers for rollback...
[Step 3/6] Building and launching production containers with Docker Compose...
[Step 4/6] Applying pending database migrations (prisma migrate deploy)...
[Step 5/6] Waiting for services to become healthy...
All production services are healthy!
[Step 6/6] Executing production smoke test...
...
================================================================
 DEPLOYMENT SUCCESSFUL!
 Nextal HR & Payroll production stack is operational.
================================================================
```

---

## 6. System Roles & Company Initialization (First Company & Admin Creation)

On a fresh deployment, first initialize the canonical system roles and Section 5.3 permissions matrix:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api npm run seed:system
```

Then initialize your company profile and generate your initial Company Admin login:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api npm run setup:company -- -n "Gulf Tech Logistics LLC" -t "TL-882910" -e "admin@gulftech.ae"
```

*Expected Output:*
```text
================================================================
 Nextal HR & Payroll — Fresh Company Setup
================================================================
Company Created: Gulf Tech Logistics LLC
Company Visa Created: Gulf Tech LLC - Dubai (MOHRE: 882910)
Company Admin Account Created:
  Email:             admin@gulftech.ae
  One-Time Password: Kx9#mP$2vL8!zQ4w
================================================================
IMPORTANT: This one-time password will NOT be displayed again.
Log in immediately at https://payroll.yourcompany.ae to set a permanent password.
================================================================
```

---

## 7. Backups, Verification & Disaster Recovery

### Automated Nightly Backups
Backups run automatically once every 24 hours inside the `nextal-backup-prod` container.
- Bundles: PostgreSQL database dump (`pg_dump -Fc`) + document storage files.
- Encrypted with AES-256-CBC using `BACKUP_ENCRYPTION_PASSPHRASE`.
- Retention Policy:
  - 14 Daily archives in `/opt/nextal/backups/daily/`
  - 8 Weekly archives in `/opt/nextal/backups/weekly/`
  - 6 Monthly archives in `/opt/nextal/backups/monthly/`

### Manual Backup On Demand
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backup sh /deploy/backup.sh
```

### Automated Backup Verification
To verify that backups are integral and restorable:
```bash
node scripts/verify-backup.mjs
```

### Full Disaster Recovery / Database Restore Drill (Fresh Host)
Follow this exact verified runbook to restore Nextal HR & Payroll to a brand new, empty VPS:

1. **Provision Fresh VPS & Hardening**:
   - Complete Steps 1–4 on the new host (Ubuntu 24.04, Docker, Node 20, deploy user).

2. **Restore Environment Secrets**:
   - Restore your original `.env.production` (especially `BACKUP_ENCRYPTION_PASSPHRASE`, `DOCUMENT_ENCRYPTION_KEY`, and `JWT_SECRET`). Without the matching encryption keys, encrypted backups and stored UAE statutory documents cannot be decrypted!

3. **Transfer Encrypted Backup Archive**:
   - Transfer your latest encrypted archive to the new VPS:
     ```bash
     mkdir -p /opt/nextal/backups/daily
     scp deploy@secondary-backup-host:/srv/backups/nextal/nextal_backup_YYYYMMDD_HHMMSS.enc /opt/nextal/backups/daily/
     ```

4. **Launch Database & Backup Services**:
   ```bash
   cd /opt/nextal
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres backup
   ```

5. **Wait for PostgreSQL Health**:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml ps postgres
   ```

6. **Execute Restore Drill Inside Backup Container**:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml exec backup \
     sh /deploy/restore.sh /backups/daily/nextal_backup_YYYYMMDD_HHMMSS.enc
   ```

7. **Start Full Stack**:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d
   ```

8. **Verify System Integrity & Data**:
   ```bash
   node scripts/smoke-test-prod.mjs https://payroll.yourcompany.ae
   ```

### Offsite Backup Replication
To transfer encrypted backups to a secondary offsite server automatically:
```bash
# Set offsite credentials in environment or cron:
export OFFSITE_BACKUP_HOST="backup-uae-east.secondary.ae"
export OFFSITE_BACKUP_USER="nextal-backup"
export OFFSITE_BACKUP_DIR="/srv/backups/nextal"
export OFFSITE_BACKUP_SSH_KEY="/home/deploy/.ssh/id_ed25519"

# Run offsite sync (refuses unencrypted dumps):
sh deploy/offsite-backup.sh
```

---

## 8. Application Updates & Rollback

### Deploying a New Release
```bash
cd /opt/nextal
git pull origin master
bash deploy/deploy.sh .env.production
```

### Immediate Rollback
If an issue occurs after deployment, revert to the previous container image tags instantly:
```bash
bash deploy/rollback.sh .env.production
```

---

## 9. Secret Rotation Procedures

### Rotating JWT_SECRET
1. Generate a new secret: `node scripts/gen-secrets.mjs`
2. Update `JWT_SECRET` in `.env.production`.
3. Restart API: `docker compose --env-file .env.production -f docker-compose.prod.yml up -d api`
*Effect: Invalidates all existing active user sessions and requires re-login.*

### Rotating Database Password
1. Connect to PostgreSQL and update password:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres psql -U nextal_app -d nextal_hr_prod -c "ALTER USER nextal_app WITH PASSWORD 'NEW_PASSWORD';"
   ```
2. Update `POSTGRES_PASSWORD` and `DATABASE_URL` in `.env.production`.
3. Restart containers: `docker compose --env-file .env.production -f docker-compose.prod.yml up -d`

---

## 10. Incident Response & Compromise Checklist

If unauthorized access or server compromise is suspected:

1. **Isolate Server Immediately**:
   ```bash
   sudo ufw deny 80/tcp
   sudo ufw deny 443/tcp
   sudo ufw reload
   ```
2. **Preserve System & Audit Logs**:
   ```bash
   mkdir -p /opt/nextal/incident_logs
   docker logs nextal-api-prod > /opt/nextal/incident_logs/api.log 2>&1
   docker logs nextal-caddy-prod > /opt/nextal/incident_logs/caddy.log 2>&1
   cp /var/log/auth.log /opt/nextal/incident_logs/auth.log
   ```
3. **Rotate All Secrets**:
   - Change VPS SSH keys.
   - Rotate `JWT_SECRET`, database password, and `BACKUP_ENCRYPTION_PASSPHRASE`.
4. **Inspect Immutable Audit Log**:
   - Query `audit_logs` table for all read and reveal events on sensitive employee records.
5. **UAE Statutory Data Breach Notification**:
   - Under UAE PDPL Art. 9, notify the UAE Data Office and affected data subjects without undue delay if a high risk to rights and privacy is detected.

---

## 11. Monitoring & Healthchecks

| Service / Metric | Target URL / Command | Healthy Threshold |
| :--- | :--- | :--- |
| **API Healthcheck** | `https://payroll.yourcompany.ae/api/v1/health` | HTTP 200 `{ "status": "ok", "database": "connected" }` |
| **Frontend Healthcheck** | `https://payroll.yourcompany.ae/login` | HTTP 200 |
| **Docker Status** | `docker compose -f docker-compose.prod.yml ps` | All containers `Up (healthy)` |
| **Disk Space Usage** | `df -h /` | Usage < 85% |
| **Memory Usage** | `free -m` | Available > 500 MB |
| **Latest Backup** | `ls -lt /opt/nextal/backups/daily/ \| head -n 2` | Archive timestamp < 26 hours old |

