# Changelog

All notable changes to the Nextal HR & Payroll Management Platform are documented in this file.
The project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

