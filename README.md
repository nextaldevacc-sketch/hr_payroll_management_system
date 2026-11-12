# Nextal HR & Payroll Platform (UAE Enterprise Edition)

Enterprise Human Resources and WPS Payroll Management Software engineered for UAE regulatory compliance (MOHRE, Federal Decree-Law No. 33 of 2021, and Central Bank SIF Wages Protection System).

---

## 1. First Run & Production Initialization (< 10 Minutes)

The production release initialises cleanly with **zero demo records, zero demo companies, and zero placeholder users**. All system roles with UAE Section 5.3 permissions are pre-configured.

### Step 1: Start PostgreSQL
```bash
docker compose up -d postgres
```

### Step 2: Apply Database Migrations (Clean Minimal Seed)
```bash
npx prisma migrate reset --force --schema backend/prisma/schema.prisma
```
*(This resets the database, applies all 12 immutable migrations, and seeds the 8 canonical system roles with Section 5.3 permissions. 0 companies, 0 users, 0 employees).*

### Step 3: Bootstrap Your Organization via CLI
```bash
npm run setup:company -- \
  --name "My Company" \
  --name-ar "شركتي" \
  --trade-license "TL-100000" \
  --admin-name "Admin User" \
  --admin-email "admin@mycompany.test"
```
The command automatically provisions:
- Company tenant record with UAE statutory defaults (cut-off day 25th, variance threshold 5%, absence divisor `÷30`).
- Primary MOHRE Sponsoring Visa (`MOL-TL100000`) and Main Branch.
- Standard UAE 48h working shift, 15-minute grace period, and 4-tier unexcused absence penalty rules.
- 13 UAE Official Public Holidays, 7 statutory leave types, and 17 Section 8.1 salary calculation rules.
- Company Administrator account with a secure, one-time temporary password (e.g. `Tmp!e8c0ffe3e3f9A9`).

> [!IMPORTANT]
> The temporary password is displayed in the terminal output once and is **never stored in plaintext**.

### Step 4: Start Applications
```bash
# Terminal 1: Backend API (Port 5000)
npm run dev --workspace=backend

# Terminal 2: Frontend Web App (Port 3100)
npm run dev --workspace=frontend
```
- **Web Application**: `http://localhost:3100`
- **API Documentation (Swagger)**: `http://localhost:5000/api/docs`
- **API Healthcheck**: `http://localhost:5000/api/v1/health`

### Step 5: Administrator First Login & Password Initialization
1. Navigate to `http://localhost:3100/login`.
2. Enter the administrator email and the one-time temporary password.
3. The platform automatically intercepts the session and forces a redirect to `/change-password` (`must_change_password`).
4. Set a strong permanent password (minimum 10 characters with mixed case and digits).
5. Upon confirmation, land on the Dashboard displaying the **Company Setup & Onboarding Checklist**:
   - Step 1: Corporate Profile & Trading License
   - Step 2: Sponsoring Visas & MOHRE Establishment IDs
   - Step 3: Operating Branches & Workplace Locations
   - Step 4: Administrative Departments & Job Positions
   - Step 5: Statutory Rules, Leave Policies & Approval Workflows
   - Step 6: Invite Team & Assign Roles (`/settings/users`)

---

## 2. Automated Test Suite & Audit Scripts

All automated tests and workflow verifications execute strictly against an isolated test database (`nextal_hr_test`), leaving the primary production database untouched.

```bash
# Run full automated test suite
npm test
```

### Verification Scripts:
- `npm test --prefix backend`: Executes 287 backend unit & integration tests against isolated PostgreSQL test database.
- `npm test --prefix frontend`: Executes 19 frontend Playwright route-protection, session, and i18n tests.
- `node scripts/verify-workflows.mjs`: Executes all 100 end-to-end workflow steps across spec sections 7.1 to 7.7, VB, and the Fresh Install lifecycle (Fresh.1–Fresh.12).
- `node scripts/ui-qa-capture.mjs`: Captures 132-cell visual QA matrix (33 screens × 4 theme/locale/viewport combinations).
- `node scripts/check-integrity.mjs`: Read-only audit verifying mathematical and relational invariants (passes on clean empty company and demo test DB).
- `node scripts/generate-traceability.js`: Regenerates FR traceability report covering 137 requirements.
- `node scripts/audit-ui-static.mjs`: Scans frontend code for fake controls or dead click handlers.
- `node scripts/audit-role-matrix.mjs`: Verifies zero permission mismatches between frontend navigation and backend routes.
- `node scripts/audit-ui-crawl.mjs`: End-to-end crawler validating interactive controls across all 9 roles.

*(For automated testing personas and test database credentials, refer to [docs/TESTING.md](docs/TESTING.md)).*

---

## 3. Platform Architecture & Invariants

```
                               ┌─────────────────────────────────┐
                               │   Next.js 14 Web Frontend       │
                               │   (Tailwind, Glass UI, RTL/LTR) │
                               │   Port 3100                     │
                               └────────────────┬────────────────┘
                                                │ REST / Cookies
                               ┌────────────────▼────────────────┐
                               │   Node.js / Express Backend     │
                               │  (Helmet, RateLimit, RBAC, Zod) │
                               │   Port 5000                     │
                               └────────┬──────────────┬─────────┘
                                        │              │
                   ┌────────────────────┴───┐      ┌───┴────────────────┐
                   │  PostgreSQL 16 Engine  │      │  Encrypted Storage │
                   │  (43 Prisma Tables,    │      │  (AES-256-GCM,     │
                   │   Immutable Triggers)  │      │   WPS SIF, Excel)  │
                   └────────────────────────┘      └────────────────────┘
```

### Architectural Guarantees:
1. **Clean Installation Baseline**: Production setup operates strictly with system metadata only. No synthetic or demo records exist in the production database.
2. **Zero Database Drift**: Schema changes occur exclusively through tracked Prisma migrations. Applied migration files are immutable.
3. **Database-Enforced Status Machine**: Pay runs transition strictly along `Draft -> Calculated -> Validated -> Approved -> Locked -> Paid`. Database triggers prevent backwards movement or tampering with locked payslips.
4. **Multi-Tenancy Isolation**: All database queries are filtered by `company_id`. Cross-tenant data leaks are mathematically prevented.
5. **Isolated Test Database**: Automated tests run strictly against `DATABASE_URL_TEST` (`nextal_hr_test`), ensuring the production database maintains 100% data integrity.
6. **At-Rest Document Encryption**: All documents stored on disk are encrypted using AES-256-GCM with a verified `NEXTAL_ENC_V1` magic header and decrypted dynamically on authorized download.
7. **Strict Non-Salary Data Isolation**: Salary and compensation figures are accessible strictly to four statutory roles (`PAYROLL_OFFICER`, `HR_MANAGER`, `GM`, `FINANCE`). Users in `COMPANY_ADMIN`, `HR_OFFICER`, `DEPT_MANAGER`, and `EMPLOYEE` are mathematically blocked at both API serializer and frontend layers.

---

## 4. Documentation Index

- [Comprehensive Product Specification](docs/spec.md)
- [System Architecture & Invariants](docs/ARCHITECTURE.md)
- [Testing Guide & Acceptance Verification](docs/TESTING.md)
- [Manual Testing Checklist (Clean Install & Role Verification)](docs/MANUAL-TEST-CHECKLIST.md)
- [Role-Based User Guides (8 Roles)](docs/guides/)
- [Known Limitations & Architecture Notes](KNOWN-LIMITATIONS.md)
- [Changelog & Version Progression](CHANGELOG.md)
- [Full Acceptance Test Suite (T1–T37)](docs/reports/acceptance-table.md)
- [FR Traceability Matrix (137 Requirements)](docs/reports/FR-TRACEABILITY.md)
- [Workflow Step-by-Step Verification Report](docs/reports/workflow-verification.md)
- [UI Visual QA Sweep Report (132 Cells)](docs/reports/ui-qa-sweep.md)

---

## 5. Automated Backup & Disaster Recovery

```bash
# Automated database backup (30-day retention pruning)
bash scripts/backup-db.sh
# On Windows PowerShell:
.\scripts\backup-db.ps1

# Disaster recovery restoration
bash scripts/restore-db.sh backups/db_backup_latest.sql nextal_hr_payroll
# On Windows PowerShell:
.\scripts\restore-db.ps1 backups/db_backup_latest.sql nextal_hr_payroll
```

---

## 6. Production Deployment

Production orchestration is configured with Docker Compose, resource caps, and security middleware:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Refer to [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full instructions on setting up AWS ECS/RDS in `me-central-1` or Azure App Service/PostgreSQL in `UAE North`.
