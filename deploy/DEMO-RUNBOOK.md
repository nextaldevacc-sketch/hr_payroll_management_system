# Nextal HR & Payroll — VPS Demonstration Deployment Runbook

> **Target Date**: Thursday, 19 November 2026  
> **Target VPS**: `https://payroll.nextaltechnologies.com`  
> **Audited Deployment Modes**: Standalone Caddy Automated HTTPS / aaPanel Reverse Proxy

---

## ⚡ Quick VPS Command Sheet: Al Jalil 50-Employee Demonstration Showcase

For a demonstration deployment or database refresh on the VPS (`https://payroll.nextaltechnologies.com`), execute this **single copy-paste sequence in exact order**:

```bash
# 1. Navigate to deployment root and pull latest code
cd /opt/nextal && git pull origin main

# 2. Rebuild container images from scratch and launch stack
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 3. Wipe and reset application database (fresh migrations & system roles)
./deploy/reset-demo-db.sh --yes-wipe-database

# 4. Provision Al Jalil demo company shell (0 employees, 5 Dubai branches, 8 privileged roles)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api node scripts/seed-demo-company.mjs \
  --name "Al Jalil Private Limited Company" \
  --branches "Dubai City Main Branch,Jebel Ali Branch,Hatta Branch,Al Awir Branch,Al Lisaili Branch" \
  --employees 0 \
  --confirm-demo

# 5. Bulk-import 50 employees from sample CSV (dry-run preview, then atomic write)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api node scripts/import-employees.mjs \
  docs/samples/al-jalil-employees-50.csv --company "Al Jalil Private Limited Company" --dry-run

docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api node scripts/import-employees.mjs \
  docs/samples/al-jalil-employees-50.csv --company "Al Jalil Private Limited Company"

# 6. Extract credentials file and inspect generated logins
docker compose -f docker-compose.prod.yml --env-file .env.production cp api:/app/backend/demo-credentials.txt ./demo-credentials.txt
cat ./demo-credentials.txt

# 7. Run live HTTPS smoke test and full workflow verification
node scripts/smoke-live.mjs https://payroll.nextaltechnologies.com
node scripts/workflow-e2e.mjs https://payroll.nextaltechnologies.com --credentials demo-credentials.txt
```

---

## 👥 Evaluator Logins & Role Accounts Matrix

All passwords are cryptographically generated per deployment, forced to change on first login, and stored in `./demo-credentials.txt` (strictly gitignored).

| Role | Email Address | Authority & Evaluator Scope |
| :--- | :--- | :--- |
| `COMPANY_ADMIN` | `admin@aljalil-demo.test` | Full tenant governance, system settings, approval flows, entity hierarchy |
| `HR_MANAGER` | `hr.manager@aljalil-demo.test` | Complete employee lifecycle, onboarding verification, leave approvals |
| `HR_OFFICER` | `hr.officer@aljalil-demo.test` | Employee profile management, document uploads, visa renewals |
| `HR_OFFICER_V2` | `hr.officer2@aljalil-demo.test` | Visa 2 scoped officer (branch/visa isolation audit compliance) |
| `PAYROLL_OFFICER`| `payroll.officer@aljalil-demo.test`| Pay run calculation, overtime inputs, salary adjustments, payroll register |
| `GM` | `gm@aljalil-demo.test` | Executive sign-off, leave requests > 5 days, pay run locking |
| `FINANCE` | `finance@aljalil-demo.test` | Pay run payment disbursement, WPS SIF generation, bank authorization |
| `DEPT_MANAGER` | `dept.manager@aljalil-demo.test` | Departmental leave initial sign-off, shift scheduling, attendance checks |
| `EMPLOYEE` (x50) | `*@aljalil-demo.test` | Self-service portal: view payslips, submit leave requests, profile review |

### 50 Employees Branch Distribution:
- **Dubai City Main Branch**: 20 employees (Headquarters / Core Operations)
- **Jebel Ali Branch**: 10 employees (Logistics & Industrial Operations)
- **Hatta Branch**: 6 employees (Regional Logistics & Field Operations)
- **Al Awir Branch**: 7 employees (Supply Chain & Warehousing)
- **Al Lisaili Branch**: 7 employees (Transport & Fleet Maintenance)
*(Total: 50 employees across Operations, HR & Administration, Finance & Accounts, and IT & Engineering departments)*

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
# 1. Apply all Prisma migrations
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

Provisions an isolated showcase company with 5 custom branches across 2 company visas without touching any existing tenants:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api node scripts/seed-demo-company.mjs \
  --name "Al Jalil Private Limited Company" \
  --branches "Dubai City Main Branch,Jebel Ali Branch,Hatta Branch,Al Awir Branch,Al Lisaili Branch" \
  --employees 0 \
  --confirm-demo
```

### Expected Output:
```text
--- Provisioning Additive Demo Company: "Al Jalil Private Limited Company" ---
Custom branches specified (5): Dubai City Main Branch, Jebel Ali Branch, Hatta Branch, Al Awir Branch, Al Lisaili Branch
Created branches:
  - Dubai City Main Branch (main, visa: Dubai Main Entity)
  - Jebel Ali Branch (visa: DIFC Entity)
  - Hatta Branch (visa: Dubai Main Entity)
  - Al Awir Branch (visa: Dubai Main Entity)
  - Al Lisaili Branch (visa: Dubai Main Entity)
Created 8 privileged demo users with TOTP bypassed:
  - COMPANY_ADMIN    : admin@aljalil-demo.test
  - HR_MANAGER       : hr.manager@aljalil-demo.test
  - HR_OFFICER       : hr.officer@aljalil-demo.test
  - HR_OFFICER_V2    : hr.officer2@aljalil-demo.test (scoped to DIFC Entity)
  - PAYROLL_OFFICER  : payroll.officer@aljalil-demo.test
  - GM               : gm@aljalil-demo.test
  - FINANCE          : finance@aljalil-demo.test
  - DEPT_MANAGER     : dept.manager@aljalil-demo.test
Employees requested: 0. Skipping synthetic employee creation and past pay runs.
✅ Demo company "Al Jalil Private Limited Company" provisioned successfully.
```

---

## 7. Bulk Import Employees from Sample CSV

The CSV `docs/samples/al-jalil-employees-50.csv` is baked directly into the production container image.

```bash
# 1. Dry-run validation (non-destructive)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api node scripts/import-employees.mjs \
  docs/samples/al-jalil-employees-50.csv --company "Al Jalil Private Limited Company" --dry-run

# 2. Real import (transactional write)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api node scripts/import-employees.mjs \
  docs/samples/al-jalil-employees-50.csv --company "Al Jalil Private Limited Company"
```

### Expected Output:
```text
--- Starting Employee Bulk Import ---
  File       : al-jalil-employees-50.csv (13.1 KB)
  Target Path: /app/docs/samples/al-jalil-employees-50.csv
  Company ID : <UUID>
  Mode       : REAL (Transactional write)

✅ REAL IMPORT SUCCESSFUL:
  Imported Employees : 50
  Created IDs        : ...
  Credentials saved to: demo-credentials.txt (strictly gitignored)
```

---

## 8. Run Automated Live Verification Probes

### A. 16-Scenario End-to-End Workflow Suite:
```bash
node scripts/workflow-e2e.mjs https://payroll.nextaltechnologies.com --credentials demo-credentials.txt
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
node scripts/smoke-live.mjs https://payroll.nextaltechnologies.com
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
  --name "Al Jalil Private Limited Company" --remove --confirm-demo
```

### Expected Output:
```text
--- Safe Demo Company Removal: "Al Jalil Private Limited Company" ---
Found target company ID: <UUID>. Initiating FK-safe cascade removal...
[PURGE] Company record completely deleted.
✅ Demo company "Al Jalil Private Limited Company" cleanly removed without touching other companies.
```
