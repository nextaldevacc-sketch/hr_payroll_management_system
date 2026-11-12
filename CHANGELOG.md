# Changelog

All notable changes to the Nextal HR & Payroll Management Platform are documented in this file.
The project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc4] - 2026-11-11

### Release Candidate 4: Bug Sweep & Clean Install (Zero Demo Data)
- **Part 6A: Bug Sweep & Role Matrix Alignment**:
  - `scripts/audit-ui-static.mjs`: Static scan of all JSX components confirming 0 fake buttons, 0 empty handlers, and 0 dead controls.
  - `scripts/audit-role-matrix.mjs`: Static cross-check of 38 backend routes against frontend action permissions confirming 0 permission mismatches.
  - `scripts/audit-ui-crawl.mjs`: Headless browser crawl testing 404 interactive controls across all 9 roles with 0 unhandled errors.
  - Replaced fake Dashboard quick action drawer with real `BiometricImportFeature` file ingestion.
  - Wired live `BiometricImportModal` to Attendance page quick action with file upload, summary reconciliation, and role guards.
  - Enforced `canAccess('attendance', 'edit')` guard on biometric import controls across Dashboard and Attendance pages; verified restricted roles (`PAYROLL_OFFICER`, `GM`, `FINANCE`) see zero import controls.
- **Part 6B: Clean Install (No Demo Accounts, No Demo Data)**:
  - **B1 Seeding Split**: Default `npx prisma db seed` seeds exclusively system-level data (8 canonical roles with Section 5.3 permissions matrix). 0 companies, 0 users, 0 employees, 0 demo records. Demo data locked behind `SEED_MODE=demo` with guard refusing execution on production database `nextal_hr_payroll`.
  - **B2 Company Bootstrap CLI**: `npm run setup:company -- ...` provisions tenant with UAE defaults (cut-off day 25th, variance threshold 5%, absence divisor `÷30`, shift policies, penalty steps, 13 UAE public holidays, 7 leave types, 17 salary rules, and 4 approval flows) and initial Company Administrator account.
  - **B2 Forced Password Reset**: Added `must_change_password` boolean to `users` table (`20261111200000_add_must_change_password` migration). New users are forced to `/change-password` on first login.
  - **B3 User Provisioning via UI**: Company Admin invites users through Users & Roles (`/settings/users`). One-time temporary password modal displays credentials with copy actions.
  - **B4 Fresh Install End-to-End Workflow**: `scripts/steps-fresh.mjs` wired into `verify-workflows.mjs` verifying complete organization lifecycle from empty bootstrap through employee onboarding, biometric punch import, 4-eye payroll execution, WPS SIF export, employee payslip access, and under-1-year tenure gratuity calculation (0.00 AED).
  - **B5 Dev Database Reset & Storage Cleanup**: Reset `nextal_hr_payroll` with minimal system seed, bootstrapped placeholder "My Company", cleaned orphaned encrypted files under `backend/storage/documents` and `storage/`.
  - **B6 Documentation Updates**: Updated `README.md`, `docs/TESTING.md`, `docs/MANUAL-TEST-CHECKLIST.md`, role user guides, `KNOWN-LIMITATIONS.md`, and `CHANGELOG.md`.
- **Strict Salary Leak Protection**:
  - Restored strict salary-leak check in `scripts/verify-workflows.mjs` `assertPageClean` for `HR_OFFICER`, `DEPT_MANAGER`, `EMPLOYEE`, and `COMPANY_ADMIN`.
  - Enforced regex match failing on any money amount written as digits with currency marker in either language: `AED`, `د.إ`, or decimal format (`/(?:AED|د\.\s*إ)\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:AED|د\.\s*إ)/iu`).
  - Strict exception: only `/me/payslips` for an employee's own payslip is permitted to display salary figures.
  - Offboarding and settlement pages mask monetary numbers for `!seesSalary` users and display clean privacy notices.
- **Company Admin Access Isolation**:
  - Removed `COMPANY_ADMIN` from `'offboarding'` navigation area in `shared/src/constants/permissions.js`.
  - Removed `COMPANY_ADMIN` from `isHrOrGm` in `backend/src/services/separationService.js` and `updateClearanceItem` in `separationController.js`.
  - Confirmed `COMPANY_ADMIN` receives HTTP 403 on every separation and settlement endpoint with integration tests in `backend/test/integration/section-5-3-permissions.test.js`.
- **Settlement Route Canonicalization**:
  - Deduplicated settlement routes in `backend/src/routes/settlements.js` to single canonical endpoints: `POST /api/v1/settlements/calculate/:separationId` and `POST /api/v1/settlements/prepare/:separationId`.
- **Database & System Integrity (scripts/check-integrity.mjs)**:
  - Created automated read-only integrity audit script verifying:
    1. Employee code uniqueness per company.
    2. Branch belongs to one visa in same company.
    3. Employee branch matches employee visa.
    4. Payslip net equals gross earnings minus total deductions.
    5. SIF file export total equals sum of payslips net.
    6. No `user_roles` row has a null or empty `scope_type`.
    7. Zero relational orphan rows across 14 relational foreign-key pathways.
    8. 100% of stored documents encrypted at rest with `NEXTAL_ENC_V1` AES-256-GCM header.
- **Demo Data Cleanliness**:
  - Seeded realistic multicultural UAE employee names for all 55 employees across Gulf Tech Logistics LLC and Emirates Horizon Trading LLC.
  - Zero test-like placeholder names in database.
  - Verified scheduled jobs (expiry, deactivation, accrual) run idempotently against demo DB with zero duplicate alerts or tasks.
- **Test Suite Pass Rates**:
  - Shared tests: 44 tests (100% passed).
  - Backend tests: 292 tests (80 suites, 291 passed, 1 skipped, 0 failed).
  - Frontend tests: 19 tests (5 suites, 100% passed).
  - Workflow step runner: 100 steps across 7.1–7.7, VB, and FRESH.1–12 (100 / 100 passed, 0 failed).
  - UI visual QA matrix: 132 cells (33 screens × 4 themes/locales/viewports, 132 / 132 passed, 0 failed).
  - Static UI scan: 59 items evaluated (0 FAKE, 59 INTENTIONAL, 100% passed).
  - Role matrix audit: 38 endpoints analyzed (0 discrepancies, 100% passed).
  - UI Crawler audit: 539 controls tested across 9 roles (0 bugs, 100% passed).
  - FR Traceability: 133 PASS / 4 DEFERRED (Phase 2 Platform Admin) / 0 MISSING.
  - System Integrity audit: 8 checks (0 violations on clean dev DB and demo test DB).

---

## [1.0.0-rc1] - 2026-10-31

### Phase 10: Hardening & Handover
- **Security & Posture Review**:
  - Implemented production Helmet HTTP security headers (CSP, HSTS, X-Content-Type-Options, Frameguard).
  - Configured CORS with strict origin validation and regex origin matching.
  - Implemented API rate limiting (global 120 req/min, sensitive authentication endpoints 15 req/15min).
  - Added startup environment validation (`backend/src/lib/envValidation.js`) with high-entropy JWT secret checks (> 32 chars) and database connection validation.
  - Hardened file uploads (`backend/src/middleware/fileUpload.js`) with MIME type whitelist, 25MB size restriction, double-extension filter, and path sanitization.
  - Documented complete 29-endpoint RBAC permissions matrix in `docs/reports/security-review.md`.
- **Performance & Scalability**:
  - Validated NFR-7: 500-employee bulk payroll calculation executes in **2.44s** (threshold < 30s).
  - Validated NFR-8: 10,000-punch biometric timecard import and reconciliation executes in **3.82s** (threshold < 30s).
  - Validated NFR-9: API p95 response time across all core endpoints is under **67ms** (threshold < 2000ms).
  - Addressed N+1 query patterns using Prisma batching (`findMany` with `include` / `in` clauses).
- **Production Deployment Readiness**:
  - Created `docker-compose.prod.yml` with healthchecks, resource limits, and log rotation.
  - Created `.env.production.example` template with security and UAE region presets.
  - Created automated database backup scripts (`scripts/backup-db.sh`, `scripts/backup-db.ps1`) with 30-day retention pruning.
  - Created automated disaster recovery restore scripts (`scripts/restore-db.sh`, `scripts/restore-db.ps1`).
  - Authored comprehensive cloud deployment guide (`docs/DEPLOYMENT.md`) targeting AWS `me-central-1` (UAE) and Azure `UAE North`.
- **Handover Package & User Guides**:
  - Authored 8 role-specific guides in `docs/guides/`: Platform Admin, Company Admin, HR Manager, Payroll Officer, Finance, General Manager, Department Manager, Employee Self-Service.
  - Documented end-to-end flows in `docs/demo/` for Company Setup, Payroll Month, and Final Settlement.
  - Updated `README.md`, `CHANGELOG.md`, `KNOWN-LIMITATIONS.md`, and `docs/OPEN-QUESTIONS.md`.

---

## [0.9.0] - 2026-10-31

### Phase 9: Compliance, Reports & Audit
- **Reports Suite**:
  - Headcount report with department breakdown, nationality distribution, and turnover/leavers tracking.
  - Attendance summary report with total scheduled hours, worked hours, OT breakdown, and absence rates.
  - Payroll register export in XLSX format with comprehensive earnings, allowances, and statutory deductions.
  - Double-entry General Ledger accounting export in CSV format grouped by cost centre (`CC-OPS`, `CC-ENG`, etc.).
- **Compliance & Expiry Monitoring**:
  - Real-time document expiry tracking for Passports, Visas, Emirates IDs, and Labour Cards.
  - Dynamic status calculation on read (Asia/Dubai midnight): documents past expiry automatically reflect `Expired`.
  - Configurable alert thresholds (30, 60, 90 days) with email notifications and dashboard badges.
- **Audit Logging**:
  - Immutable audit trail capturing user, role, IP address, timestamp, action, entity, and diff metadata.
  - Exportable audit logs with date-range filtering and entity scoping.
- **Test Database Isolation**:
  - Configured `DATABASE_URL_TEST` (`nextal_hr_test`) across all automated test suites to ensure zero pollution of the demo database (`nextal_hr_payroll`).

---

## [0.8.0] - 2026-10-30

### Phase 8: Offboarding & End-of-Service Gratuity
- **UAE Labour Law Article 51 Gratuity Engine**:
  - Accurate calculation based on service duration (< 1 year: 0; 1–5 years: 21 days basic/year; > 5 years: 30 days basic/year).
  - Pro-rata calculation down to the exact day.
  - Maximum statutory cap enforcement (default: 2 years basic salary).
  - Full support for both Limited (Fixed-term) and Unlimited contracts under Federal Decree-Law No. 33 of 2021.
- **Offboarding & Separation Workflow**:
  - Multi-department clearance tracking (Assets/IT, Finance, Operations, HR).
  - Unused annual leave encashment calculation (`(Gross * 12 / 365) * unused_days`).
  - Final settlement PDF statement generation with bilingual layout and breakdown.
  - Employee status update to `Separated` upon finance disbursement.

---

## [0.7.0] - 2026-10-29

### Phase 7: WPS SIF Generator & Corporate Banking
- **UAE Central Bank WPS Standard**:
  - SCR (Summary Record) and EDR (Employee Detail Record) generation according to official MOHRE specifications.
  - Exact file naming convention: `EmployerID_CreationDate_Sequence.SIF`.
  - Comprehensive field validation: 13-digit Employer MOL ID, 14-digit Labour Card ID, 9-digit Routing Code, 23-character mod-97 UAE IBAN.
  - Strict mathematical invariant: `Σ(Fixed + Variable Income) == Payslip Net Pay == SCR Total Salaries`.

---

## [0.6.0] - 2026-10-28

### Phase 6: Payroll Engine & Variance Analysis
- **Payroll Rule Engine**:
  - Configurable formula engine supporting standard UAE salary structures (Basic, Housing, Transport, Other).
  - GPSSA / ADPF statutory pension calculations for UAE Nationals (tier-based employee 11% / employer 15% with government subsidy support).
  - Unapproved absence deduction (`DIV_30` or `DAYS_365`) and active loan repayment recovery.
- **Pay Run Lifecycle**:
  - Strict database-enforced state machine: `Draft -> Calculated -> Validated -> Approved -> Locked -> Paid`.
  - Trigger guards preventing backwards transitions or modifications to locked payslips.
  - Variance analysis comparing current run against previous month with threshold alerts (> 5% variance requires documented reason).
- **Bilingual Payslip Generation**:
  - Server-side PDF payslip generation with UAE standard layout, dual-currency formatting, and verified Arabic typography.

---

## [0.5.0] - 2026-10-27

### Phase 5: Attendance & Timecard Reconciliation
- **Punch Processing**:
  - Biometric punch import from CSV/Excel and simulated terminal events.
  - Shift matching, grace period calculation, tardiness tracking, and early departure detection.
- **Overtime Calculation**:
  - Standard weekday overtime (125% of hourly basic wage).
  - Night / Weekend / Rest-day overtime (150% of hourly basic wage).
- **Attendance Sign-off**:
  - Two-tier workflow: Department Manager review followed by HR Manager final confirmation.

---

## [0.4.0] - 2026-10-26

### Phase 4: Leave Management
- **Leave Types & Balances**:
  - Statutory leave allowances: Annual (30 calendar days), Sick (15 full / 30 half / 45 unpaid), Maternity (45 full / 15 half), Parental (5 working days), Bereavement, Hajj.
  - Accrual engine with automated monthly prorating and leave balance ledgers.
- **Approval Workflows**:
  - Manager approval for standard leaves; General Manager co-approval for extended leaves (> 5 days).

---

## [0.3.0] - 2026-10-25

### Phase 3: Employee Management & Document Vault
- **Employee Directory**:
  - Comprehensive profile management: personal details, emergency contacts, visa allocations, department & designation assignments.
  - Multi-visa entity management (Gulf Technologies LLC: Main Mainland Visa & Tech Freezone Visa).
- **Document Management**:
  - Secure document upload and metadata tracking for Passports, Visas, Emirates IDs, and Labour Cards.

---

## [0.2.0] - 2026-10-24

### Phase 2: Multi-Tenancy, RBAC & Core UI System
- **Role-Based Access Control**:
  - Implementation of 8 distinct system roles with granular permissions.
  - Multi-tenant tenant scoping ensuring strict company data isolation.
- **Design System & UI**:
  - Modern glassmorphism UI built with Tailwind CSS, Next.js, and Lucide icons.
  - Full bilingual English / Arabic support with seamless RTL direction switching.
  - Complete Dark / Light mode theming complying with the no-outlines design standard and gold accent tokens.

---

## [0.1.0] - 2026-10-23

### Phase 1: Architecture, Foundations & Database Schema
- **Database Schema**:
  - 43 tables structured in PostgreSQL with Prisma ORM.
  - Foreign key constraints, unique indexes, and audit timestamps.
- **Core Platform Architecture**:
  - Node.js / Express backend with modular controllers, services, and route middleware.
  - Next.js frontend with React Server and Client Components.

