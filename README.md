# Nextal HR & Payroll Platform (UAE Enterprise Edition)

Enterprise Human Resources and WPS Payroll Management Software engineered for UAE regulatory compliance (MOHRE, Federal Decree-Law No. 33 of 2021, and Central Bank SIF Wages Protection System).

---

## 1. Quick Start & Setup (< 10 Minutes)

### Prerequisites
- **Node.js**: v20.x or later (`node -v`)
- **Docker**: For PostgreSQL 16 (`docker compose up -d postgres`)
- **Git**: Clone or navigate to workspace

### Step 1: Start PostgreSQL
```bash
docker compose up -d postgres
```

### Step 2: Install Dependencies & Run Database Migrations
```bash
npm install
npx prisma migrate reset --force --schema=backend/prisma/schema.prisma
```
*(This resets the demo database `nextal_hr_payroll`, applies all Prisma migrations, and executes the seed populating Gulf Tech Logistics LLC: 45 employees, 2 visas, 3 branches, 3 separations, and realistic September/October payroll).*

### Step 3: Run the Full Test Suite
The automated test runner executes all unit, integration, and acceptance tests against an isolated test database (`nextal_hr_test`), leaving the demo database untouched:
```bash
npm test
```
**Verification Commands**:
- `npm test --prefix backend`: Executes 287 backend unit & integration tests against isolated PostgreSQL test database.
- `npm test --prefix frontend`: Executes 19 frontend Playwright route-protection, session, and i18n tests.
- `node scripts/verify-workflows.mjs`: Executes all 85 end-to-end workflow steps across spec sections 7.1 to 7.7 and VB.
- `node scripts/ui-qa-capture.mjs`: Captures 132-cell visual QA matrix (33 screens × 4 theme/locale/viewport combinations).
- `node scripts/check-integrity.mjs`: Read-only audit verifying mathematical and relational invariants.
- `node scripts/generate-traceability.js`: Regenerates FR traceability report covering 137 requirements.

### Step 4: Start Applications
```bash
# Terminal 1: Backend API (Port 5000)
npm run dev --workspace=backend

# Terminal 2: Frontend Web App (Port 3100)
npm run dev --workspace=frontend
```
- **Web Application**: `http://localhost:3100`
- **API Documentation (Swagger)**: `http://localhost:5000/api/docs`
- **API Healthcheck**: `http://localhost:5000/health`

---

## 2. Demo User Credentials

All demo accounts belong to **Gulf Tech Logistics LLC** (Primary Demo Company) with active credentials for immediate role evaluation.

> [!NOTE]
> **Demo Password for all accounts below:** `Nextal@2026!`
> (This password is for evaluation and testing purposes only.)

| Role | Name | Email | Sees Salary | Permissions & Primary Scope |
|---|---|---|:---:|---|
| **Platform Admin** | Platform Superadmin | `platform@nextal.ae` | — | **Deferred (Phase 2)**. Disabled via `FEATURE_PLATFORM_ADMIN=false`. Provisioning is handled via CLI: `node scripts/create-company.js`. |
| **Company Admin** | Tariq Al-Hashemi | `admin@gulftech.ae` | **No** | Company settings, visas, branches, departments, jobs, shift policies, user accounts. **Salary fields strictly masked.** |
| **HR Manager** | Maryam Al-Nuaimi | `hr.mgr@gulftech.ae` | **Yes** | Full HR lifecycle, contracts, attendance sign-off, leave approvals, pay run validation. |
| **HR Officer** | Saeed Al-Ketbi | `hr.officer@gulftech.ae` | **No** | Employee creation, document verification, biometric import, cancellation tasks. **Salary masked.** |
| **HR Officer (DIFC)** | Saeed Al-Ketbi (DIFC) | `hr.difc@gulftech.ae` | **No** | Scoped to Visa 02 (DIFC Freezone) only. Sees only DIFC employees and records. |
| **Payroll Officer** | Zaid Al-Marzooqi | `payroll@gulftech.ae` | **Yes** | Pay run calculation, variable inputs, variance documentation, PDF payslip generation. |
| **Dept Manager** | Mansour Al-Ketbi | `dept.mgr@gulftech.ae` | **No** | Operations team attendance, overtime review, 1st leave approval. **Salary masked.** |
| **General Manager** | Rashid Al-Falasi | `gm@gulftech.ae` | **Yes** | Final executive approval on pay runs, final settlements, and extended leaves (> 5 days). |
| **Finance** | Hassan Al-Balooshi | `finance@gulftech.ae` | **Yes** | WPS SIF export, pay run payment (`Mark as Paid`), accounting GL journal export, settlement disbursement. |
| **Employee** | Ahmed Al-Mansoori | `employee@gulftech.ae` | **No** | Self-service (`/me/*`): personal profile, bilingual payslips (own data only), punch records, leave submission. |

### Employee Self-Service Logins
In addition to the primary role personas above, all 45 employees of Gulf Tech Logistics LLC have individual self-service logins:
`<employee_code_lowercase>@gulftech.ae` (e.g. `emp-dxb-001@gulftech.ae` … `emp-dxb-045@gulftech.ae`), password `Nextal@2026!`.

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
1. **Zero Database Drift**: Schema changes occur exclusively through tracked Prisma migrations. Applied migration files are immutable.
2. **Database-Enforced Status Machine**: Pay runs transition strictly along `Draft -> Calculated -> Validated -> Approved -> Locked -> Paid`. Database triggers prevent backwards movement or tampering with locked payslips.
3. **Multi-Tenancy Isolation**: All database queries are filtered by `company_id`. Cross-tenant data leaks are mathematically prevented.
4. **Isolated Test Database**: Automated tests run strictly against `DATABASE_URL_TEST` (`nextal_hr_test`), ensuring the demo database (`nextal_hr_payroll`) maintains 100% clean data integrity.
5. **At-Rest Document Encryption**: All documents stored on disk are encrypted using AES-256-GCM with a verified `NEXTAL_ENC_V1` magic header and decrypted dynamically on authorized download.
6. **Strict Non-Salary Data Isolation**: Salary and compensation figures are accessible strictly to four statutory roles (`PAYROLL_OFFICER`, `HR_MANAGER`, `GM`, `FINANCE`). Users in `COMPANY_ADMIN`, `HR_OFFICER`, `DEPT_MANAGER`, and `EMPLOYEE` are mathematically blocked at both API serializer and frontend layers.

---

## 4. Documentation Index

- [Comprehensive Product Specification](docs/spec.md)
- [System Architecture & Invariants](docs/ARCHITECTURE.md)
- [Testing Guide & Acceptance Verification](docs/TESTING.md)
- [Manual Testing Checklist (Workflows 7.1–7.7 & VB)](docs/MANUAL-TEST-CHECKLIST.md)
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
