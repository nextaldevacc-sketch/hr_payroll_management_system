# Nextal HR & Payroll — VPS Demonstration Deployment Runbook

> **Target Date**: Thursday, 19 November 2026  
> **Target Audience**: Systems Engineers, Solution Architects, DevOps Evaluators  
> **Audited Deployment Modes**: Standalone Caddy Automated HTTPS / aaPanel Reverse Proxy

This runbook contains **exact, copy-pasteable commands** and **expected outputs** to provision, deploy, and verify the complete Nextal HR & Payroll showcase stack on a clean Ubuntu 24.04/22.04 LTS VPS in under 10 minutes.

---

## 1. Server Prerequisites & Docker Engine

Run on the target VPS as `root` (or user with `sudo` privileges):

```bash
# Update APT index and install essential tools
apt-get update && apt-get install -y curl git ufw fail2ban jq

# Install official Docker Engine and Docker Compose Plugin (if not already installed)
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Verify Docker version
docker --version
docker compose version
```

### Expected Output:
```text
Docker version 27.x.x, build ...
Docker Compose version v2.x.x
```

---

## 2. Clone Repository & Prepare Directory

```bash
# Clone the repository
git clone https://github.com/imrancodeworks/hr-payroll-management.git /opt/nextal
cd /opt/nextal

# Check out main branch
git checkout main
git status
```

### Expected Output:
```text
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

## 3. Generate Secure Environment Configuration

```bash
# Copy the production template
cp .env.production.example .env.production

# Generate cryptographically strong keys for JWT, Document AES-256, and Backups
node scripts/gen-secrets.mjs
```

Edit `.env.production` to set your target domain and database credentials:
```bash
nano .env.production
```
*Note: For a demo walkthrough on a public VPS, set `DOMAIN=payroll.nextaltechnologies.com` and `ALLOWED_ORIGIN=https://payroll.nextaltechnologies.com`. If no corporate SMTP server is configured yet for the demo showcase, enable the loud demo email override:*
```bash
MAIL_MODE=disabled
ALLOW_DEMO_MAIL_DISABLED=true
```
*Preflight will output an explicit `[EMAIL WARNING]` notice while allowing the showcase stack to proceed.*

---

## 4. Launch Production Container Stack

```bash
# Start all 5 production containers in detached mode
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Verify all containers are running and healthy
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

### Expected Output:
```text
NAME                   IMAGE                         COMMAND                  SERVICE    STATUS
nextal-api-prod        hr-payroll-management-api     "docker-entrypoint.s…"   api        running (healthy)
nextal-backup-prod     postgres:16-alpine            "/deploy/backup-cron…"   backup     running
nextal-caddy-prod      caddy:2.8-alpine              "caddy run --config …"   caddy      running
nextal-postgres-prod   postgres:16-alpine            "docker-entrypoint.s…"   postgres   running (healthy)
nextal-web-prod        hr-payroll-management-web     "docker-entrypoint.s…"   web        running (healthy)
```

---

## 5. Initialize Database Migrations & System Roles

Execute inside the running API container:

```bash
# 1. Apply all 15 Prisma migrations
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api npx prisma migrate deploy

# 2. Seed canonical system roles catalog (idempotent, 0 data truncated)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api npm run seed:system
```

### Expected Output:
```text
15 migrations found in prisma/migrations
All migrations have been successfully applied.

Nextal HR & Payroll — Clean System Seed (Production & Staging)
Seeding 8 canonical roles with Section 5.3 permissions matrix...
System seed completed successfully (8 canonical roles upserted, 0 tables truncated).
✅ System seed completed successfully:
  Roles verified: EMPLOYEE, DEPT_MANAGER, HR_OFFICER, PAYROLL_OFFICER, HR_MANAGER, GM, FINANCE, COMPANY_ADMIN
```

---

## 6. Seed Additive Demo Showcase Company

Provisions an isolated showcase company with 25 employees across 2 company visas and 2 branches, 1 paid pay run, and sample workflows without touching any existing tenants:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api node scripts/seed-demo-company.mjs \
  --name "Demo Co (Nextal Showcase)" --employees 25 --confirm-demo
```

### Expected Output:
```text
--- Provisioning Additive Demo Company: "Demo Co (Nextal Showcase)" ---
Seeding one past month of attendance punches and overtime requests...
Calculating and finalizing one PAID pay run for October 2026...
Pay Run <UUID> successfully locked and marked PAID.
✅ Demo company "Demo Co (Nextal Showcase)" provisioned successfully.
  - 2 Visas & 2 Branches created
  - 4 Departments, Shifts, Leave Types, Salary Rules, and Approval Flows created
  - 8 Privileged Role Accounts created (TOTP bypassed)
  - 25 Employees provisioned with mod-97 valid IBANs and valid Emirates IDs
  - 1 Paid Pay Run, 2 Overtime records, 2 Leave Requests, 1 Loan Adjustment seeded
  - Credentials written ONCE to demo-credentials.txt (strictly gitignored).
```

---

## 7. Retrieve Demo Credentials & Accounts

```bash
# Copy credentials from container to host
docker compose -f docker-compose.prod.yml cp api:/app/backend/demo-credentials.txt ./demo-credentials.txt

# View credentials for all 8 evaluation roles
cat demo-credentials.txt
```

### Evaluation Roles Available:
1. `COMPANY_ADMIN`: Complete company governance and settings
2. `HR_MANAGER`: Employee lifecycle, onboarding verification, statutory leave approval
3. `HR_OFFICER`: Employee profile entry and document upload
4. `HR_OFFICER_V2`: Scoped exclusively to Visa 2 (DIFC entity)
5. `PAYROLL_OFFICER`: Pay run calculation and salary adjustment entry
6. `GM` (General Manager): Executive sign-off for leaves > 5 days and pay run lock
7. `FINANCE`: Pay run disbursement sign-off and payment execution
8. `DEPT_MANAGER`: Departmental leave requests review

---

## 8. Run Automated Live Verification Probes

### A. 16-Scenario End-to-End Workflow Suite:
```bash
node scripts/workflow-e2e.mjs https://localhost --credentials demo-credentials.txt
```
### Expected Output:
```text
[Scenario 01] New Employee Onboarding & Verification ... PASS
[Scenario 02] Leave Approval Chain, Self-Approval Block & Admin Override ... PASS
[Scenario 03] Leave Rejection Rules & Rejection Log Role-Based Isolation ... PASS
[Scenario 04] Statutory Sick & Unpaid Leave Rules and Public Holiday Skipping ... PASS
[Scenario 05] Attendance, Biometric Punches & Overtime Flow into Payroll ... PASS
[Scenario 06] Branch Transfer with Asia/Dubai Effective Date and Contract Bump ... PASS
[Scenario 07] Mid-Period Bank Account Update with Dual Approval Guard ... PASS
[Scenario 08] Pay Run Complete Lifecycle and WPS SIF File Generation ... PASS
[Scenario 09] Salary Adjustments and Recurring Loan Deductions ... PASS
[Scenario 10] Separation & Gratuity Calculation (UAE Decree-Law 33/2021 Art 51) ... PASS
[Scenario 11] Document Magic-Bytes Guard, AES-256 Storage & Reveal Audit ... PASS
[Scenario 12] Scope Isolation: HR Officer Visa 2 Cannot Access Visa 1 ... PASS
[Scenario 13] Multi-Tenant Isolation and Header Spoofing Rejection ... PASS
[Scenario 14] Audit Log Protection: Append-Only DB Trigger Prevents Tampering ... PASS
[Scenario 15] Authentication Lockout, Password Policy & Token Revocation ... PASS
[Scenario 16] Employee Bulk Import (Dry-Run Preview & Atomic Execution) ... PASS
================================================================================
 WORKFLOW E2E EXECUTION COMPLETE: 16/16 PASSED, 0 FAILED
================================================================================
```

### B. Live HTTPS Smoke Test:
```bash
node scripts/smoke-live.mjs https://localhost -k
```
### Expected Output:
```text
  ✅ PASS: API Healthcheck (status=ok, db=connected)
  ✅ PASS: Web Login Page (HTTP 200)
  ✅ PASS: Header: X-Content-Type-Options (nosniff)
  ✅ PASS: Header: X-Frame-Options (DENY)
  ✅ PASS: Header: Strict-Transport-Security (max-age=31536000; includeSubDomains; preload)
  ✅ PASS: Unauthenticated Access Guard (HTTP 401)
  ✅ PASS: CORS Origin Restriction
  Verification Summary: 7/7 checks passed (0 failed)
```

### C. Cluster Health Probe (External Monitor Ready):
```bash
./deploy/healthcheck.sh https://localhost -k
```
### Expected Output:
```text
OK: Nextal HR & Payroll cluster healthy at https://localhost (API: 200/ok, Web: 200)
```

---

## 9. Backup & Disaster Recovery Verification

```bash
# 1. Trigger manual encrypted database dump
docker exec nextal-backup-prod sh /deploy/backup.sh

# 2. Inspect generated AES-256 encrypted archive
ls -lh ./backups/daily/

# 3. Verify backup archive integrity
docker exec nextal-backup-prod sh -c "openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_PASSPHRASE -in \$(ls -t /backups/daily/*.enc | head -n 1) | tar -tzf -"
```

---

## 10. Operational Teardown (Clean Removal)

To remove only the demo company after the demonstration without affecting system tables or other companies:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api node scripts/seed-demo-company.mjs \
  --name "Demo Co (Nextal Showcase)" --remove --confirm-demo
```

### Expected Output:
```text
--- Safe Demo Company Removal: "Demo Co (Nextal Showcase)" ---
Found target company ID: <UUID>. Initiating FK-safe cascade removal...
[PURGE] Company record completely deleted.
✅ Demo company "Demo Co (Nextal Showcase)" cleanly removed without touching other companies.
```
