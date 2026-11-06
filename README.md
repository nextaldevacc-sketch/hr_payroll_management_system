# Nextal HR & Payroll Platform (UAE Enterprise Edition)

Enterprise Human Resources and WPS Payroll Management Software engineered for UAE regulatory compliance (MOHRE, Federal Decree-Law No. 33 of 2021, and Central Bank SIF Wages Protection System).

---

## 1. Quick Start & Verification (< 15 Minutes)

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
*(This applies all migrations and populates the clean demo database `nextal_hr_payroll` with Gulf Tech Logistics LLC: 42 employees, 2 separations, and realistic October/September payroll).*

### Step 3: Run the Full Test Suite
The automated test runner executes all unit, integration, and acceptance tests against an isolated test database (`nextal_hr_test`), leaving the demo database untouched:
```bash
npm test
```
**Verification Checks**:
- **Shared Package**: 44 passed (UAE IBAN mod-97, Article 51 gratuity, WPS validators)
- **Backend Package**: 215 passed (58 suites across auth, permissions, attendance, payroll, offboarding, compliance, audit)
- **Acceptance Tests**: 37 passed (100% of Spec Section 15 acceptance criteria T1–T37)
- **Frontend Package**: Arabic i18n & token assertions passed

### Step 4: Start Applications
```bash
# Terminal 1: Backend API (Port 5000)
npm run dev --workspace=backend

# Terminal 2: Frontend Web App (Port 3000)
npm run dev --workspace=frontend
```
- Web Application: `http://localhost:3000`
- API Documentation (Swagger): `http://localhost:5000/api-docs`
- Healthcheck Endpoint: `http://localhost:5000/health`

---

## 2. Demo User Credentials

All demo accounts belong to **Gulf Technologies LLC** (Primary Demo Company) with active credentials for immediate role evaluation.

> [!NOTE]
> **Demo Password for all accounts below:** `Nextal@2026!`

| Role | Name | Email | Sees Salary | Permissions & Primary Scope |
|---|---|---|:---:|---|
| **Platform Admin** | Super Administrator | `superadmin@nextal.ae` | Yes* | Multi-tenant management, company provisioning, global security. *Tenant data isolated without support grant. |
| **Company Admin** | Tariq Al-Hashemi | `admin@gulftech.ae` | **Yes** | Full company setup: users & roles, departments, shifts, company visas, salary rules. |
| **HR Manager** | Maryam Al-Nuaimi | `hr.mgr@gulftech.ae` | **Yes** | Full HR lifecycle, contracts, attendance sign-off, leave approvals, pay run validation. |
| **HR Officer** | Saeed Al-Ketbi | `hr.officer@gulftech.ae` | **No** | Employee documents & attendance. **Salary fields strictly masked from API & UI.** |
| **HR Officer (DIFC Scoped)** | Saeed Al-Ketbi (DIFC) | `hr.difc@gulftech.ae` | **No** | Scoped to Visa 02 (DIFC Freezone) only. Sees only DIFC employees and records. |
| **Payroll Officer** | Zaid Al-Marzooqi | `payroll@gulftech.ae` | **Yes** | Pay run calculation, variable inputs, variance documentation, PDF payslip generation. |
| **Dept Manager** | Fatima Al-Zaabi | `dept.mgr@gulftech.ae` | **No** | Engineering team attendance, overtime review, 1st leave approval. **Salary numbers hidden.** |
| **General Manager** | Rashid Al-Falasi | `gm@gulftech.ae` | **Yes** | Final executive approval on pay runs, final settlements, and extended leaves (> 5 days). |
| **Finance** | Hassan Al-Balooshi | `finance@gulftech.ae` | **Yes** | WPS SIF export, pay run payment (`Mark as Paid`), accounting GL journal export, settlement disbursement. |
| **Employee** | Ahmed Al-Mansoori | `employee@gulftech.ae` | **No** | Self-service (`/me/*`): personal profile, bilingual payslips, punch records, leave submission. |

---

## 3. Platform Architecture & Invariants

```
                               ┌─────────────────────────────────┐
                               │   Next.js 14 Web Frontend       │
                               │   (Tailwind, Glass UI, RTL/LTR) │
                               └────────────────┬────────────────┘
                                                │ REST / Cookies
                               ┌────────────────▼────────────────┐
                               │   Node.js / Express Backend     │
                               │  (Helmet, RateLimit, RBAC, Zod) │
                               └────────┬──────────────┬─────────┘
                                        │              │
                   ┌────────────────────┴───┐      ┌───┴────────────────┐
                   │  PostgreSQL 16 Engine  │      │  Storage & Assets  │
                   │  (43 Prisma Tables,    │      │  (Bilingual PDFs,  │
                   │   Immutable Triggers)  │      │   WPS SIF, Excel)  │
                   └────────────────────────┘      └────────────────────┘
```

### Architectural Guarantees:
1. **Zero Database Drift**: Schema changes occur exclusively through tracked Prisma migrations. Applied migration files are immutable.
2. **Database-Enforced Status Machine**: Pay runs transition strictly along `Draft -> Calculated -> Validated -> Approved -> Locked -> Paid`. Database triggers prevent backwards movement or tampering with locked payslips.
3. **Multi-Tenancy Isolation**: All database queries are filtered by `company_id`. Cross-tenant data leaks are mathematically prevented.
4. **Isolated Test Database**: Automated tests run strictly against `DATABASE_URL_TEST` (`nextal_hr_test`), ensuring the demo database (`nextal_hr_payroll`) maintains 100% clean data integrity.
5. **No-Outlines Glass Design System**: UI strictly follows modern design tokens (`InsetBox`, background glass fills, gold/amber financial accents, zero harsh 1px white borders in dark mode).

---

## 4. Documentation Index

- [Comprehensive Product Specification](docs/spec.md)
- [System Architecture & Invariants](docs/ARCHITECTURE.md)
- [Testing Guide & Acceptance Verification](docs/TESTING.md)
- [Cloud Deployment Guide (AWS & Azure UAE Sovereign Regions)](docs/DEPLOYMENT.md)
- [Security Review & RBAC Permissions Matrix](docs/reports/security-review.md)
- [Performance & Scalability Benchmark Report](docs/reports/performance.md)
- [Acceptance Test Suite Report (T1–T37)](docs/reports/acceptance-table.md)
- [Role-Based User Guides (8 Roles)](docs/guides/)
- [Open Questions & Client Policy Confirmations](docs/OPEN-QUESTIONS.md)
- [Known Limitations & Architecture Notes](KNOWN-LIMITATIONS.md)
- [Changelog & Version Progression](CHANGELOG.md)

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
# Build and launch production stack
docker compose -f docker-compose.prod.yml up -d --build
```
Refer to [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full instructions on setting up AWS ECS/RDS in `me-central-1` or Azure App Service/PostgreSQL in `UAE North`.
