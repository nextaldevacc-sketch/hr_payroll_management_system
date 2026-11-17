# Changelog

All notable changes to the Nextal HR & Payroll Management Platform are documented in this file.
The project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc7] - 2026-11-17

### Security Review Audit Fixes & Rejection Log Release
- **Security Finding C2 (Authentication Hardening)** [`c80b4bc`]:
  - Removed all hardcoded JWT secret fallbacks (`nextal_super_secret_jwt_key_2026_uae`) from middleware and services.
  - Enforced strict startup validation in `validateEnv.js`: refuses start in production if `JWT_SECRET` is missing, shorter than 32 characters, or uses known defaults.
  - Verified via test suite `backend/test/security/jwt-secret.test.js`.
- **Security Finding C4 (Multi-Tenancy Isolation)** [`c3feb67`]:
  - Stopped trusting client-supplied headers (`x-company-id`, `x-platform-admin`) on unauthenticated and regular user requests.
  - Tenant context and platform admin status are resolved exclusively from cryptographically verified JWT tokens.
  - Allowed `x-company-id` tenant switching strictly for verified Platform Administrators, auditing each context switch in `audit_logs`.
  - Verified via test suite `backend/test/security/client-headers.test.js`.
- **Security Finding C3 (Authorization Backdoor Removal)** [`6ff9661`]:
  - Removed mock actor fallback (`admin-id`) in approval engine and arbitrary `findFirst` fallback users in compliance and separation workflows.
  - Enforced valid active user UUIDs within caller company context for all workflow operations.
  - Verified via test suite `backend/test/security/mock-actor-removal.test.js`.
- **Security Findings C1 + H1 + H2 (Approval Engine Order & Role Enforcement)** [`fec0654`]:
  - Enforced strict pipeline order: Request validation -> Company scope check -> Status check -> Self-approval blocking -> Exact step role authorization -> Multi-step duplication blocking -> Rejection reason validation -> Atomic transaction (`prisma.$transaction`) -> Audit log -> Notification dispatch.
  - Disallowed automatic role conflation (`HR_OFFICER` vs `HR_MANAGER`).
  - Added explicit admin override path requiring `override: true` and justification reason (min 10 characters) with `override=true` audit logging.
  - Protected all approval routes with granular `requireRole` middleware.
  - Verified via test suite `backend/test/security/approval-engine.test.js`.
- **Security Finding H4 (Sensitive-Field Reveal Access Control & Auditing)** [`26ccc76`]:
  - Implemented strict RBAC and data scope enforcement on `POST /api/v1/employees/:id/reveal-sensitive`.
  - Enforced field allowlist (`emirates_id`, `passport_number`, `iban`, `basic`, `housing`, `transport`, `other_allowances`, `gross`) and per-user rate limiting (10 requests per 15 minutes).
  - Recorded detailed immutable audit entries in `audit_logs` capturing field name, purpose, and timestamp.
  - Verified via test suite `backend/test/security/sensitive-reveal.test.js`.
- **Security Finding H5 (Bank-Account IDOR Protection & Dual Approval)** [`d4294dc`]:
  - Scoped all bank account queries and updates by `{ id, company_id, employee_id }` preventing IDOR attacks.
  - Enforced dual approval (`HR_MANAGER` or `FINANCE`) for IBAN updates or additions during active pay runs.
  - Verified WPS SIF generator strictly utilizes active approved bank accounts.
  - Verified via test suite `backend/test/security/bank-account-security.test.js`.
- **Security Finding M2 (Settlements & Separations Granular Route Guards)** [`b72d7fb`]:
  - Enforced strict segregation of duties for final settlements (Preparer: `PAYROLL_OFFICER` -> Validator: `HR_MANAGER` -> Approver: `GM` -> Payer: `FINANCE`).
  - Prevented the same user from validating, approving, or marking paid a settlement they prepared or previously acted on.
  - Verified via test suite `backend/test/security/settlement-guards.test.js` and role matrix audit.
- **Security Finding STEP 8 (Rejection Log Feature & Shared Rejection Engine)** [`f6adbc2`]:
  - Created dedicated PostgreSQL table `approval_rejections` with database-level immutability trigger blocking all `UPDATE` and `DELETE` queries.
  - Built Repository, Service, Controller, and Routes for rejection listing, detail retrieval, and CSV export under `/api/v1/approvals/rejections`.
  - Added shared `approvalService.reject(...)` engine enforcing mandatory reasons (minimum 10 characters).
  - Built frontend Rejections tab, full-detail slide-over drawer, CSV export, and `RejectDialog` component with live character counter.
  - Verified via test suite `backend/test/security/rejection-log.test.js`.
- **Security Finding M1 (Dubai Timezone Standardization)** [`708c476`]:
  - Standardized business date formatting and comparisons across all payroll, leave, attendance, and separation services to Asia/Dubai (UTC+4) via `toDubaiDateString()`.
  - Verified via test suite `backend/test/security/m1-dubai-date.test.js`.
- **Security Hardening & Preflight Checks** [`e47010a`]:
  - Configured 100kb body parser limit (`BODY_LIMIT=100kb`).
  - Added strict rate limiting on authentication and MFA routes.
  - Added CSRF Origin/Referer check middleware for state-changing HTTP requests.
  - Created production preflight verification CLI (`scripts/preflight-prod.mjs`).
  - Verified via test suite `backend/test/security/hardening.test.js`.

### Breaking Changes
- `JWT_SECRET` is now mandatory in production and development environments. Server boot fails if missing, shorter than 32 characters, or using known defaults.
- Client-supplied `x-company-id` and `x-platform-admin` headers are completely ignored for unauthenticated and non-platform-admin users; tenant context is strictly derived from JWT claims.
- Rejection of approval requests, leave, overtime, separations, and employee verification now strictly requires a justification reason of at least 10 characters.
- Company Admin approval on custom approval flows without an exact matching role now requires explicit `override: true` and justification reason (>= 10 characters).

---

## [1.0.0-rc6] - 2026-11-16

### Release Candidate 6: Security Hardening, TOTP MFA, aaPanel Kit & Bug Fixes
- **Part 8.1: TOTP MFA (SEC-2) for Privileged Roles**:
  - Implemented RFC 6238 TOTP (30s time step, 6 digits, ±1 step window) for privileged roles (`COMPANY_ADMIN`, `HR_MANAGER`, `PAYROLL_OFFICER`, `GM`, `FINANCE`).
  - Added self-contained SVG QR code generator (`backend/src/lib/qrcode.js`) and manual base32 secret key enrollment modal.
  - Implemented 10 single-use emergency recovery codes per enrolled user, hashed with bcrypt (cost factor 12).
  - Extended login authentication pipeline with secondary TOTP challenge step; enforced per-route rate limits and account lockout defenses against failed MFA attempts.
  - Added company setting `require_privileged_mfa` (default ON) controlling mandatory MFA enforcement per organization.
  - Implemented Company Admin MFA reset action for locked-out staff with mandatory audit logging and immediate session revocation (`token_version` increment). Users cannot reset their own MFA without a valid code.
  - Enforced AES-256-GCM encryption at rest for all MFA secrets using HKDF keys derived from `DOCUMENT_ENCRYPTION_KEY` with distinct info string. Zero MFA secrets or plaintext recovery codes logged.
- **Part 8.2: No-Role User Experience & Access Guard**:
  - Added dedicated `/no-role` page and route guard for users provisioned without an active role.
  - Replaced empty sidebar/blank fallback with clear bilingual Arabic and English guidance directing the user to contact their Company Administrator.
  - Added audit logging (`UNASSIGNED_ROLE_ACCESS_BLOCKED`) on access attempts by role-less accounts.
- **Part 8.3: Next.js Standalone Web Security Headers & Strict CSP**:
  - Configured comprehensive security headers in `frontend/next.config.js` for standalone deployment behind reverse proxies (aaPanel Nginx / Caddy).
  - Implemented strict Content Security Policy (`Content-Security-Policy`): self-hosted fonts, zero external origins, zero `unsafe-eval` in production mode, and `frame-ancestors 'none'`.
  - Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
  - Added automated test suite (`frontend/test/web-security-headers.test.js`) and header verification script (`scripts/check-web-headers.mjs`).
- **Part 8.4: Strengthen Production Smoke Test Assertions**:
  - Enhanced `scripts/smoke-test-prod.mjs` to probe 24 distinct verification checks against live production instances.
  - Verified real `Set-Cookie` flags (`HttpOnly`, `Secure`, `SameSite=Lax`) directly on live login HTTP responses instead of relying on configuration inspection.
  - Added live account lockout verification with temporary throwaway user when `SMOKE_ALLOW_WRITE=yes` (guarded against default production execution).
  - Added live CSP and HSTS header verification on Next.js root responses.
- **Part 8.5: Tolerant Startup Job Initialization & Swagger Cleanup**:
  - Made the `email_outbox` scheduler job resilient against cold starts before database migrations run (logs warning once, retries next tick without unhandled crash).
  - Suppressed Swagger UI initialization notices in production mode when API docs are disabled.
- **Part 8.6: Mobile & Responsive Viewport Audit**:
  - Conducted full mobile responsive audit across key screens down to 390px (iPhone 12/13/14 viewport).
  - Added responsive table wrappers with horizontal scrolling indicators, sticky first column, and compact touch targets.
  - Optimized drawer sheets, modal dialogs, and navigation drawers for small screen touch interactions.
  - Added automated viewport test suite (`frontend/test/responsive-390px.test.js`) and mobile crawler (`scripts/audit-mobile.mjs`).
- **Part 8.7: aaPanel Deployment Kit & Server Update Automation**:
  - Created complete aaPanel deployment kit in `deploy/aapanel/` (Nginx reverse proxy template, Node.js PM2 process manager configuration, and deployment runbook `deploy/aapanel/README.md`).
  - Authored `deploy/update-server.sh`: automated one-command server update script supporting git pull, migration deployment, build, service restart, and automatic health verification with rollback.
- **Part 8.8: Offsite Backup Transfer, Backup Validation & Health Tracking**:
  - Hardened `deploy/backup.sh` with pre-commit dump size (> 10KB) and table catalog validation (`pg_restore -l` >= 5 tables) before updating `last_success.txt`.
  - Authored `deploy/offsite-backup.sh` supporting automated offsite backup sync via SFTP / rsync or S3-compatible cloud storage.
  - Authored `deploy/backup-cron.sh` managing automated daily backup execution, retention rotation, offsite transfer, and emergency alerting on failure.
  - Created backup freshness monitoring probe in `scripts/smoke-test-prod.mjs` alerting if last successful backup exceeds 26 hours.

---

## [1.0.0-rc5] - 2026-11-13

### Release Candidate 5: Manual-Test Fixes, True Crawler & VPS Production Readiness
- **Part 7A: Owner Manual-Test Fixes & True Crawler**:
  - **A1 Contrast & Tokens**: Eliminated all hard-coded neutral, slate, black, and white CSS classes across `UsersAndRolesFeature.jsx`, `Drawer.jsx`, role cards, and modals. Fully migrated to semantic design tokens (`var(--bg-surface)`, `text-text`, `text-text-muted`, `border-border`, `bg-well`). Guaranteed WCAG AA contrast (minimum 4.5:1 normal text, 3:1 large text) across light-en, dark-en, light-ar, dark-ar, and 390px mobile viewports.
  - **A2 Automated Contrast Check**: Created `scripts/check-contrast.mjs` measuring computed foreground and background colors of 220 UI nodes across 4 theme/locale permutations; 0 violations found.
  - **A3 Self-Hosted Fonts**: Completely self-hosted `Manrope` and `IBM Plex Sans Arabic` using `@fontsource-variable`. Eradicated all runtime external Google Fonts CDN requests (`fonts.googleapis.com` / `fonts.gstatic.com`). Added automated network request assertions in QA suite.
  - **A4 Bulk-Create Employee Logins UX**: Overhauled bulk-create modal with live eligible vs skipped reconciliation (listing name, code, reason for skip). Added zero-eligible empty state with direct employee creation action. Added one-time temporary password modal with copy-all and CSV export actions. Added individual "Create Login" profile action and "Create login now" wizard checkbox.
  - **A5 Employee Role Invite Restriction**: Blocked inviting users with sole Employee role without linking to an existing employee record, with clear translated error pointing to employee login workflow.
  - **A6 True Every-Control Crawler**: Removed 8-per-route limit in `scripts/audit-ui-crawl.mjs`. Tested all 1,286 interactive controls across all 9 roles, recursively clicking buttons, tabs, row actions, drawers, modals, destructive dialogs, and pay actions on test database with proper rollback/isolation. Confirmed 0 dead clicks, 0 unhandled errors, 0 4xx/5xx leaks.
  - **A7 Static Audit Corrections**: Re-evaluated all 62 intentional non-interactive controls in `scripts/audit-ui-static.mjs` with documented rationales in report. Corrected false claims regarding BiometricImport routes in prior reports.
  - **A8 Automated Workflows**: Created comprehensive end-to-end UI verification steps testing employee onboarding with email vs without email, bulk login creation, temporary password login with forced password change, and zero-eligible fresh company state.
- **Part 7B: Production Hardening & Operational Resilience (B1–B6 + E1–E4)**:
  - **B1 Security Requirements Status Matrix**: Audited all 95 controls from `docs/workflows/SECURITY-REQUIREMENTS.md` (SEC-1..74 and SEC-C1..21) in `docs/reports/SECURITY-STATUS.md` with explicit file/test evidence: 88 IMPLEMENTED, 5 PARTIAL, 2 DEFERRED TO NOT DONE.
  - **B2 Startup Environment Validation**: Created `backend/src/config/validateEnv.js` enforcing production criteria on boot (JWT_SECRET entropy, DOCUMENT_ENCRYPTION_KEY non-fallback, non-localhost DATABASE_URL, COOKIE_SECURE=true, ALLOWED_ORIGIN non-wildcard, explicit ENABLE_JOBS, and real SMTP settings `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). Disabled Swagger UI `/api/docs` in production unless explicitly enabled. Configured Express `trust proxy` (1). Configured Helmet CSP with zero `unsafe-eval`. Added error sanitization with `maskPii` and zero stack trace / Prisma internals leakage. Guarded manual background job trigger APIs. Added `.npmrc` with `ignore-scripts=true`.
  - **B3 Password Hashing**: Enforced `bcrypt` cost >= 12 with transparent automatic rehash on login. (Argon2id native package compilation deferred to NOT DONE per prompt rules).
  - **B4 Multi-Factor Authentication**: TOTP RFC 6238 deferred to NOT DONE with detailed enterprise implementation roadmap.
  - **B5 Sensitive Field Protection**: Emirates ID, passport number, and IBAN masked by default (last 4 characters). Added audited "Reveal" action (`POST /api/v1/employees/:id/reveal-sensitive`) recording immutable read logs in `audit_logs`.
  - **B6 Data Retention Policy**: Added configurable company-level `data_retention_years` policy setting (default 7 years per UAE statutory audit requirements).
  - **E1 Production Rate Limiting**: Implemented granular per-route rate limits with `express-rate-limit` (auth: 5 req/15min, sensitive payroll/reveal: 10 req/15min, bulk imports: 5 req/min, general API: 100 req/min).
  - **E2 Account Lockout Defense**: 5 consecutive failed login attempts trigger 15-minute lockout with audit logging and timing-attack resistant password verification.
  - **E3 Out-of-Band Email Failure Alerting**: Implemented fallback email delivery logging (`failed_email_deliveries` table) with interactive UI drawer and banner for Company Admins to view or retry failed password/invite emails without sensitive credential leakage.
  - **E4 Backup Failure Notification**: Created `scripts/alert-backup-failure.mjs` triggered on backup errors to dispatch emergency failure emails to production administrators.
- **Part 7C: VPS Deployment Kit & Performance Benchmarks (C1–C4 + E5–E7)**:
  - **Multi-Stage Containerization**: Built minimal `node:20-alpine` non-root multi-stage Dockerfiles (`backend/Dockerfile` and `frontend/Dockerfile`) with automated healthchecks and pruned devDependencies.
  - **Docker Compose Production Topology**: Created `docker-compose.prod.yml` with private bridge network, healthcheck dependencies, resource caps, and log rotation. Only ports 80 and 443 exposed via Caddy; zero published ports on PostgreSQL, API, or web services.
  - **Automated TLS & Reverse Proxy**: Authored `deploy/Caddyfile` with automated Let's Encrypt TLS, HSTS, clickjacking defense, security headers, 25MB body limit, and sanitized JSON logging.
  - **Cryptographic Key Generation**: Authored `scripts/gen-secrets.mjs` generating 256-bit cryptographically secure keys for JWT, document encryption, database passwords, and backup passphrases.
  - **Deployment Preflight Validation**: Authored `scripts/preflight-prod.mjs` verifying production environment files against security rules before container startup.
  - **Deployment & Lifecycle Automation**: Created `deploy/deploy.sh` (idempotent automated deploy), `deploy/rollback.sh` (instant tag reversion), and `deploy/harden-vps.sh` (Ubuntu 24.04 server hardening with UFW, fail2ban, unattended-upgrades, and non-root deploy user).
  - **Encrypted Backup & Recovery Kit**: Authored `deploy/backup.sh`, `deploy/restore.sh`, and `scripts/verify-backup.mjs` implementing AES-256-CBC encrypted bundles (PostgreSQL dump + document storage) with 14-daily, 8-weekly, and 6-monthly retention pruning and automated scratch DB verification.
  - **Production Smoke Test Suite**: Authored `scripts/smoke-test-prod.mjs` verifying HTTPS, security headers, healthcheck status, closed database ports, Swagger 404, unauthenticated 401s, error sanitization, cookie security flags, and account lockout.
  - **E5 SPF, DKIM, DMARC & UAE Data Residency Runbook**: Documented exact DNS records for SPF, DKIM, DMARC, email header inspection procedure, sub-processor DPA requirements under UAE Federal Decree-Law No. 45 of 2021 (PDPL), and zero-salary email content rule in `docs/DEPLOY-VPS.md`.
  - **E6 500-Employee Performance Sanity Benchmark**: Authored and executed `scripts/benchmark-p95.js` with 500 benchmark employees across 12 months:
    - 500-Employee Payroll Calculation: 2.36s (SLA < 60s).
    - WPS SIF Export: 0.15s (SLA < 5s).
    - Bilingual Payslip PDF Generation: 2.00s (SLA < 3s).
    - List and overview screens p95: 8.3ms – 141.1ms (SLA < 3s).
  - **E7 Launch Gate Checklist**: Created `docs/LAUNCH-CHECKLIST.md` with Table 1 (22 verifiable operational gates, all passing with real execution evidence) and Table 2 (10 Not Done / Owner Decisions with risk mitigations).
  - **VPS Runbook**: Authored complete step-by-step documentation in `docs/DEPLOY-VPS.md` covering VPS selection, UAE data residency, hardening, deployment, company initialization, backups, disaster recovery, secret rotation, and incident response.

---

## [1.0.0-rc4] - 2026-11-11

### Release Candidate 4: Bug Sweep & Clean Install (Zero Demo Data)
- **Part 6A: Bug Sweep & Role Matrix Alignment**:
  - `scripts/audit-ui-static.mjs`: Static scan of all JSX components confirming 0 fake buttons, 0 empty handlers, and 0 dead controls.
  - `scripts/audit-role-matrix.mjs`: Static cross-check of 38 backend routes against frontend action permissions confirming 0 permission mismatches.
  - `scripts/audit-ui-crawl.mjs`: Headless browser crawl testing 404 interactive controls across all 9 roles with 0 unhandled errors.
  - Replaced fake Dashboard quick action drawer with real `BiometricImportFeature` file ingestion.
  - Rendered live `BiometricImportFeature` in Dashboard quick action drawer and Attendance page with real file upload (`/api/v1/attendance/import`), summary reconciliation, and role guards.
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

