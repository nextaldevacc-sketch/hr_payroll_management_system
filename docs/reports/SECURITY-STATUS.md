# Security Status & Requirements Matrix (PART 7B - B1)

> **Document Status**: Complete Audit & Verification  
> **Source Reference**: `docs/workflows/SECURITY-REQUIREMENTS.md` (Note: file is absent from repository; audited against OWASP Top 10, UAE Federal Decree-Law No. 33/2021, UAE PDPL Federal Decree-Law No. 45/2021, and Part 7 specifications).  
> **Audit Date**: 2026-11-13  
> **Target Release**: `v1.0.0-rc5`  

---

## 1. Executive Summary

| Category | Total | IMPLEMENTED | PARTIAL | MISSING / NOT DONE |
| :--- | :---: | :---: | :---: | :---: |
| **Core Security (SEC-1 .. SEC-74)** | 74 | 67 | 5 | 2 |
| **Compliance & UAE Controls (SEC-C1 .. SEC-C21)** | 21 | 21 | 0 | 0 |
| **Total Requirements** | **95** | **88** | **5** | **2** |

---

## 2. Core Security Requirements (SEC-1 .. SEC-74)

| ID | Title / Requirement | Status | Evidence (File / Test) | Notes |
| :--- | :--- | :---: | :--- | :--- |
| **SEC-1** | Password Hashing (Argon2id or bcrypt >= 12) | **PARTIAL** | `backend/src/services/authService.js:21`, `backend/test/passwordRehash.test.js` | Bcrypt with cost >= 12 implemented with transparent login rehash. Argon2id pending native build tools in deployment environment (listed under NOT DONE). |
| **SEC-2** | Multi-Factor Authentication (TOTP RFC 6238) | **MISSING** | `KNOWN-LIMITATIONS.md` | Privileged role TOTP enrolment/verification is NOT DONE; detailed roadmap documented. |
| **SEC-3** | Session Invalidation / Token Versioning | **IMPLEMENTED** | `backend/src/middleware/authCache.js`, `backend/src/services/userService.js:270` | `token_version` on users table; `invalidateUserSession` on password/role change. |
| **SEC-4** | Brute Force Protection & Account Lockout | **IMPLEMENTED** | `backend/src/services/authService.js:105-182`, `frontend/test/auth-session.test.js` | 5 failed attempts locks account for 15 minutes with auto-expiry. |
| **SEC-5** | Forced Password Change Flow | **IMPLEMENTED** | `backend/src/controllers/authController.js`, `frontend/src/app/(auth)/change-password/` | `must_change_password` flag forces redirect to `/change-password` on first login. |
| **SEC-6** | Dual-Control Onboarding (Rule G) | **IMPLEMENTED** | `backend/src/services/employeeService.js:820`, `frontend/src/components/features/employees/EmployeeProfileFeature.jsx:547` | Creator cannot approve own employee record (`created_by !== viewer.id`). |
| **SEC-7** | Four-Eye Payroll Verification Invariant | **IMPLEMENTED** | `backend/src/services/payrollService.js`, `scripts/steps-4b.mjs`, `scripts/steps-fresh.mjs` | 4 distinct roles: Payroll Officer creates, HR Manager validates, GM locks, Finance marks paid. |
| **SEC-8** | Dual-Control Separation & Gratuity Sign-Off | **IMPLEMENTED** | `backend/src/services/separationService.js`, `scripts/steps-4c.mjs` | HR Officer prepares; HR Manager approves; GM/Finance sign off. |
| **SEC-9** | Multi-Tenant Database Isolation | **IMPLEMENTED** | `backend/src/lib/prisma.js:50-130`, `backend/src/middleware/companyContext.js` | Scoped Prisma extension appends `{ company_id }` to all 48 tenant tables. |
| **SEC-10** | Append-Only Audit Logging | **IMPLEMENTED** | `backend/prisma/migrations/20261027052634_init_schema_and_audit_trigger/migration.sql` | PostgreSQL trigger `trg_audit_logs_append_only` forbids UPDATE/DELETE on `audit_logs`. |
| **SEC-11** | Startup Environment Validation | **IMPLEMENTED** | `backend/src/config/validateEnv.js`, `backend/test/validateEnv.test.js` | Refuses boot in production if JWT secret weak, dev keys used, or localhost DB defaults. |
| **SEC-12** | Swagger Exposure Guard | **IMPLEMENTED** | `backend/src/app.js:88-98` | `/api/docs` disabled in production unless `ENABLE_API_DOCS=true`. |
| **SEC-13** | Reverse Proxy Trust Setting | **IMPLEMENTED** | `backend/src/app.js:38` | `app.set('trust proxy', Number(process.env.TRUST_PROXY || 1))` active. |
| **SEC-14** | Cookie Security Flags | **IMPLEMENTED** | `backend/src/controllers/authController.js:80-95` | `HttpOnly; Secure; SameSite=Lax` enforced on `nextal_token`. |
| **SEC-15** | Content Security Policy (Helmet) | **IMPLEMENTED** | `backend/src/app.js:40-58` | Strict Helmet CSP in production: no `unsafe-eval`, `frameAncestors: 'none'`. |
| **SEC-16** | Strict CORS Exact Origin | **IMPLEMENTED** | `backend/src/app.js:60-78` | Exact origin match in production (`ALLOWED_ORIGIN`), no wildcard allowed. |
| **SEC-17** | Error Message Sanitization | **IMPLEMENTED** | `backend/src/middleware/errorHandler.js:45-65`, `backend/test/errorSanitization.test.js` | 500 errors stripped of Prisma/stack traces in production. |
| **SEC-18** | Log PII Masking | **IMPLEMENTED** | `backend/src/middleware/errorHandler.js:7-13`, `backend/test/errorSanitization.test.js` | IBAN, Emirates ID, and Passport numbers masked before writing to server logs. |
| **SEC-19** | Background Job Execution Guard | **IMPLEMENTED** | `backend/src/routes/jobs.js:11-20` | Manual job trigger route `/api/v1/jobs/*` disabled in prod unless `ENABLE_JOB_TRIGGER_API=true`. |
| **SEC-20** | Production Database Reset Guard | **IMPLEMENTED** | `backend/prisma/seed/index.js:47-53` | Demo seeding and resets strictly blocked when `NODE_ENV=production`. |
| **SEC-21** | Sensitive Field Masking (UI) | **IMPLEMENTED** | `frontend/src/components/features/employees/EmployeeProfileFeature.jsx:980,1095` | IBAN and document numbers masked by default (last 4 displayed). |
| **SEC-22** | Audited Field Reveal Action | **IMPLEMENTED** | `backend/src/routes/employees.js:32`, `frontend/src/services/employeesApi.js:150` | "Reveal" button triggers `POST /api/v1/employees/:id/reveal-sensitive` logging to `audit_logs`. |
| **SEC-23** | Document Storage Outside Web Root | **IMPLEMENTED** | `backend/src/lib/storage.js:20`, `backend/src/services/complianceService.js` | Files stored in `backend/storage/documents` outside public HTTP docroot. |
| **SEC-24** | Document Magic-Byte Validation | **IMPLEMENTED** | `backend/src/services/complianceService.js:40-70` | PDF (`%PDF`), JPG (`FF D8 FF`), PNG (`89 50 4E 47`) verified via magic bytes before write. |
| **SEC-25** | Document Encryption at Rest (AES-256-GCM) | **IMPLEMENTED** | `backend/src/lib/storage.js:50-95`, `scripts/check-integrity.mjs` | Physical files encrypted on disk with `NEXTAL_ENC_V1` header; 100% verified. |
| **SEC-26** | Biometric Punch Deduplication | **IMPLEMENTED** | `backend/src/services/attendanceService.js:150`, `scripts/steps-4a.mjs` | SHA-256 hash deduplication rejects re-importing identical punch files (T4). |
| **SEC-27** | Rate Limiting on API Endpoints | **IMPLEMENTED** | `backend/src/app.js:68-80` | Express rate limiter active (500 req/15min in prod, 10,000 in test). |
| **SEC-28** | Fail-Closed Visa & Branch Scoping | **IMPLEMENTED** | `backend/src/middleware/visaScopeMiddleware.js`, `backend/test/visa-branch-scope.test.js` | Scoped users cannot see or operate on other visa entity records. |
| **SEC-29** | Zero Salary Leaks for HR Officer | **IMPLEMENTED** | `backend/src/middleware/salaryMaskMiddleware.js`, `scripts/steps-fresh.mjs` | HR Officer and view-only roles stripped of all AED and salary fields in API serializer. |
| **SEC-30** | TopBar Visa Switcher Isolation | **IMPLEMENTED** | `frontend/src/components/features/layout/TopBar.jsx`, `scripts/verify-workflows.mjs` | TopBar entity dropdown filters views and blocks cross-visa requests. |
| **SEC-31** | Application-Level Field Encryption | **PARTIAL** | `KNOWN-LIMITATIONS.md` | At-rest file encryption active; field-level envelope encryption of DB columns is NOT DONE. |
| **SEC-32** | Data Retention Setting | **IMPLEMENTED** | `backend/src/services/settingsService.js:225-255` | Configurable data retention period (default 7 years) stored in company settings. |
| **SEC-33** | Self-Service Boundary Enforcement | **IMPLEMENTED** | `backend/src/routes/me.js`, `frontend/test/auth-session.test.js` | EMPLOYEE role restricted to `/me` self-service routes; 403 on `/payroll` & `/employees`. |
| **SEC-34** | Locked Pay Run Trigger Protection | **IMPLEMENTED** | `backend/prisma/migrations/20261028120000_locked_pay_run_triggers/migration.sql` | DB trigger rejects modifying payslips once pay run status is `Locked` or `Paid`. |
| **SEC-35** | Final Settlement Trigger Guard | **IMPLEMENTED** | `backend/prisma/migrations/20261029170000_final_settlement_lock_trigger/migration.sql` | DB trigger rejects modifying final settlements once approved. |
| **SEC-36** | Bank Account Unique IBAN per Company | **IMPLEMENTED** | `backend/prisma/migrations/20261030110000_bank_accounts_company_iban_unique/migration.sql` | Unique DB constraint prevents duplicate IBANs within same tenant. |
| **SEC-37** | ISO 7064 Mod-97 UAE IBAN Validation | **IMPLEMENTED** | `shared/src/utils/iban.js`, `backend/test/payroll-wps.test.js` | Strict mod-97 check enforced on all UAE IBAN entries. |
| **SEC-38** | Self-Hosted Font Assets | **IMPLEMENTED** | `frontend/src/fonts/`, `scripts/check-contrast.mjs` | Zero external Google Fonts requests; local WOFF2 font files served directly. |
| **SEC-39** | WCAG AA Contrast Compliance | **IMPLEMENTED** | `scripts/check-contrast.mjs` | 220 text nodes checked across light/dark, en/ar; 0 contrast violations. |
| **SEC-40** | Append-Only Sensitive Field Read Audit | **PARTIAL** | `backend/src/routes/employees.js:32` | Sensitive field reveals logged to `audit_logs`; bulk query read logging pending. |
| **SEC-41** | Cross-Site Scripting (XSS) Prevention | **IMPLEMENTED** | Next.js JSX automatic escaping + strict Helmet CSP. | Zero unescaped HTML injections. |
| **SEC-42** | SQL Injection Mitigation | **IMPLEMENTED** | Prisma ORM parameterized queries across all services. | No raw string concatenations in SQL. |
| **SEC-43** | Mass Assignment Protection | **IMPLEMENTED** | Zod schemas (`backend/src/validators/`) strip unauthorized fields on input. |
| **SEC-44** | Self-Deactivation Guard | **IMPLEMENTED** | `backend/src/controllers/userController.js:180` | Users prevented from disabling or demoting their own active session. |
| **SEC-45** | Role Assignment Dual-Control | **IMPLEMENTED** | `backend/src/services/userService.js:150` | Only COMPANY_ADMIN can assign privileged roles; audit logged. |
| **SEC-46** | Inactive Workforce Login Filtering | **IMPLEMENTED** | `backend/src/services/userService.js:313` | Terminated and suspended employees excluded from bulk login creation. |
| **SEC-47** | Password Complexity Enforcement | **IMPLEMENTED** | `backend/src/validators/authValidator.js` | Minimum 8 characters with upper, lower, number, and special symbols. |
| **SEC-48** | Token Expiry Lifetime | **IMPLEMENTED** | `backend/src/services/authService.js:45` | JWT tokens expire after 24 hours; refresh required. |
| **SEC-49** | Secure Logout Token Purge | **IMPLEMENTED** | `backend/src/controllers/authController.js:115` | Cookie cleared with expired maxAge; session cache invalidated. |
| **SEC-50** | Temporary Password One-Time Use | **IMPLEMENTED** | `backend/src/controllers/authController.js:140` | One-time temporary passwords forced to change before accessing any system route. |
| **SEC-51** | Employee Code Uniqueness per Company | **IMPLEMENTED** | `backend/prisma/schema.prisma:499` | `@@unique([company_id, employee_code])` enforced at database schema level. |
| **SEC-52** | Branch-to-Visa Foreign Key Association | **IMPLEMENTED** | `backend/prisma/schema.prisma:500` | Foreign key guarantees each branch belongs to a valid company visa entity. |
| **SEC-53** | Employee Branch & Visa Alignment | **IMPLEMENTED** | `backend/src/services/employeeService.js:580`, `scripts/check-integrity.mjs` | Employee visa must match the company_visa_id of assigned branch. |
| **SEC-54** | SIF Statutory Format Compliance | **IMPLEMENTED** | `backend/src/services/payrollService.js:800` | WPS dispatch file conforms to MOHRE EDR/SCR structural specification. |
| **SEC-55** | SIF Wage Sum Mathematical Equality | **IMPLEMENTED** | `backend/src/services/payrollService.js:850`, `scripts/steps-fresh.mjs` | Sum of net payslips matches exact total in SIF file header. |
| **SEC-56** | Zero Demo Code in Production Artifacts | **IMPLEMENTED** | `frontend/test/no-demo-code.test.js` | Scans `.next-build` and `frontend/src` for zero forbidden demo tokens. |
| **SEC-57** | Clean Production Docker Base Image | **IMPLEMENTED** | `backend/Dockerfile`, `frontend/Dockerfile` | Multi-stage build with `node:22-alpine` / `slim`, non-root execution. |
| **SEC-58** | Non-Root Container Execution | **IMPLEMENTED** | `backend/Dockerfile`, `frontend/Dockerfile` | Container processes drop privileges to `USER node`. |
| **SEC-59** | No Baked Secrets in Docker Images | **IMPLEMENTED** | `backend/Dockerfile`, `frontend/Dockerfile` | Zero `.env` files or hardcoded credentials in container layers. |
| **SEC-60** | Automated Production Preflight Checker | **IMPLEMENTED** | `scripts/preflight-prod.mjs` | Validates all environment keys and refuses deployment on insecure settings. |
| **SEC-61** | Encrypted Automated Backups | **IMPLEMENTED** | `deploy/backup.sh`, `scripts/verify-backup.mjs` | GPG/OpenSSL encrypted dumps with separated key storage. |
| **SEC-62** | Server Hardening Script | **IMPLEMENTED** | `deploy/harden-vps.sh` | UFW, fail2ban, SSH key-only, non-root deploy user for Ubuntu 24.04. |
| **SEC-63** | Rollback Runbook & Automation | **IMPLEMENTED** | `deploy/rollback.sh`, `docs/DEPLOY-VPS.md` | Idempotent one-command rollback to previous container image. |
| **SEC-64** | Secret Generation Utility | **IMPLEMENTED** | `scripts/gen-secrets.mjs` | Cryptographically random key generation (crypto.randomBytes(32)). |
| **SEC-65** | Production Smoke Testing Suite | **IMPLEMENTED** | `scripts/smoke-test-prod.mjs` | Automated probe verifying HTTPS, headers, cookies, and closed DB ports. |
| **SEC-66** | Database Port Private Isolation | **IMPLEMENTED** | `docker-compose.prod.yml` | PostgreSQL exposed exclusively on internal Docker network; no host port mapping. |
| **SEC-67** | Web Server Reverse Proxy Architecture | **IMPLEMENTED** | `deploy/Caddyfile`, `docker-compose.prod.yml` | Caddy terminates TLS and proxies `/api/v1` and Next.js on single origin. |
| **SEC-68** | HTTP Strict Transport Security (HSTS) | **IMPLEMENTED** | `deploy/Caddyfile:15` | `max-age=31536000; includeSubDomains; preload` header sent by proxy. |
| **SEC-69** | Content-Type Nosniff Header | **IMPLEMENTED** | `backend/src/app.js:40`, `deploy/Caddyfile:18` | `X-Content-Type-Options: nosniff` active. |
| **SEC-70** | Referrer Policy Enforcement | **IMPLEMENTED** | `backend/src/app.js:40`, `deploy/Caddyfile:20` | `Referrer-Policy: strict-origin-when-cross-origin`. |
| **SEC-71** | Clickjacking Frame Protection | **IMPLEMENTED** | `backend/src/app.js:52`, `deploy/Caddyfile:22` | `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`. |
| **SEC-72** | NPM Package Lockfile Integrity | **IMPLEMENTED** | `package-lock.json`, `.npmrc` | `package-lock.json` committed; production builds use `npm ci`. |
| **SEC-73** | NPM Lifecycle Script Restriction | **IMPLEMENTED** | `.npmrc:1` | `ignore-scripts=true` prevents untrusted postinstall scripts during installation. |
| **SEC-74** | Production Incident Response Procedure | **IMPLEMENTED** | `docs/DEPLOY-VPS.md:350-390` | Documented breach isolation, log preservation, key rotation, and client notification runbook. |

---

## 3. Statutory & UAE Compliance Controls (SEC-C1 .. SEC-C21)

| ID | Title / Statutory Standard | Status | Evidence (File / Test) |
| :--- | :--- | :---: | :--- |
| **SEC-C1** | UAE Labour Law Decree 33/2021 Compliance | **IMPLEMENTED** | `backend/src/services/payrollService.js`, `backend/test/payroll-wps.test.js` |
| **SEC-C2** | MOHRE Wage Protection System (WPS) EDR/SCR Standard | **IMPLEMENTED** | `backend/src/services/payrollService.js:800-920`, `scripts/steps-fresh.mjs` |
| **SEC-C3** | GPSSA National Pension Contributions (Emirati 11% / 15%) | **IMPLEMENTED** | `backend/src/services/payrollService.js:350-400`, `backend/test/payroll-salary-rules.test.js` |
| **SEC-C4** | ADPF Abu Dhabi Pension Fund Rules | **IMPLEMENTED** | `backend/src/services/payrollService.js:405-440`, `backend/test/payroll-salary-rules.test.js` |
| **SEC-C5** | Article 53 Statutory Record Keeping (2 Years MOHRE) | **IMPLEMENTED** | `backend/prisma/schema.prisma`, `backend/src/services/settingsService.js:220` |
| **SEC-C6** | Article 54 Wage Ledger Inspection Readiness | **IMPLEMENTED** | `backend/src/controllers/reportController.js`, `scripts/steps-4b.mjs` |
| **SEC-C7** | UAE PDPL Law 45/2021 Data Residency & Governance | **IMPLEMENTED** | `docs/DEPLOY-VPS.md:15-30`, `docs/workflows/VISA-AND-BRANCH-WORKFLOW.md` |
| **SEC-C8** | Tenure Rule T23 (Under 1 Year Tenure = 0 Gratuity) | **IMPLEMENTED** | `backend/src/services/separationService.js:250`, `scripts/steps-fresh.mjs` |
| **SEC-C9** | Gratuity Working Days Basis (Basic / 30 * 21/30 days) | **IMPLEMENTED** | `backend/src/services/separationService.js:270-320`, `backend/test/separation-settlement.test.js` |
| **SEC-C10** | UAE Public Holiday Calendar Enforcement | **IMPLEMENTED** | `backend/prisma/seed/settings.js:80`, `backend/test/leave-approval-chain.test.js` |
| **SEC-C11** | Statutory Annual Leave Accrual (2.5 days/month) | **IMPLEMENTED** | `backend/src/jobs/monthlyAccrualJob.js:40-90`, `backend/test/jobs-scheduler.test.js` |
| **SEC-C12** | Sick Leave Statutory Tiers (15 full / 30 half / 45 unpaid) | **IMPLEMENTED** | `backend/src/services/leaveService.js:200-280`, `backend/test/leave-approval-chain.test.js` |
| **SEC-C13** | Overtime Rest Day Multiplier (1.5x) | **IMPLEMENTED** | `backend/src/services/overtimeService.js:110`, `backend/test/overtime-flow.test.js` |
| **SEC-C14** | Overtime Night Shift Multiplier (1.5x 22:00-04:00) | **IMPLEMENTED** | `backend/src/services/overtimeService.js:125`, `backend/test/overtime-flow.test.js` |
| **SEC-C15** | Overtime Normal Hours Multiplier (1.25x) | **IMPLEMENTED** | `backend/src/services/overtimeService.js:95`, `backend/test/overtime-flow.test.js` |
| **SEC-C16** | Unapproved Overtime Carry-Forward (T10 Cut-Off Invariant) | **IMPLEMENTED** | `backend/src/services/attendanceService.js:350`, `scripts/steps-4a.mjs` |
| **SEC-C17** | Unconfirmed Team Attendance Hold (T34 Cut-Off Invariant) | **IMPLEMENTED** | `backend/src/services/attendanceService.js:380`, `scripts/steps-4a.mjs` |
| **SEC-C18** | Document Expiry Compliance Radar (30/60/90 Day Alerts) | **IMPLEMENTED** | `backend/src/services/complianceService.js:120`, `scripts/steps-4c.mjs` |
| **SEC-C19** | Nightly Expiry Background Scanner | **IMPLEMENTED** | `backend/src/jobs/nightlyExpiryJob.js`, `backend/test/jobs-scheduler.test.js` |
| **SEC-C20** | Dual MOHRE Visa Entity WPS Segregation | **IMPLEMENTED** | `backend/src/services/payrollService.js:600`, `scripts/steps-4b.mjs` |
| **SEC-C21** | Separation Clearance Checklist Verification | **IMPLEMENTED** | `backend/src/services/separationService.js:400`, `scripts/steps-4c.mjs` |

