# Nextal HR & Payroll — Production Launch Checklist & Gate File

This document defines the formal launch gate criteria for deploying Nextal HR & Payroll to production with real employee and payroll data under UAE statutory regulations (UAE Federal Decree-Law No. 33/2021 and UAE PDPL No. 45/2021).

---

## Table 1: Must Pass Before ANY Real Employee Data Goes In

All items below must have verifiable evidence from real test runs. No item may be marked `PASS` without executed command output or passing test suites.

| # | Launch Gate Requirement | Verification Command / Evidence | SLA / Acceptance Threshold | Real Evidence / Metric | Gate Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Backend Core Test Suite** | `npm --prefix backend test` | 85 suites, 0 failures | 85 suites passed, 356 tests passed, 0 failures, 1 skipped | **PASS** |
| **2** | **Frontend Test Suite** | `npm --prefix frontend test` | 6 suites, 0 failures | 6 suites passed, 20 tests passed, 0 failures | **PASS** |
| **3** | **Production Env Startup Validation** | `node --test backend/test/validateEnv.test.js` | Refuses unsafe JWT, DB, CORS, SMTP, keys | 7 unit tests passed; halts on unsafe configs | **PASS** |
| **4** | **Real SMTP Transport & Security** | `node --test backend/test/smtpMailer.test.js` | Real SMTP server delivery, zero salary figures in templates | 6 unit tests passed; verified against `smtp-server` | **PASS** |
| **5** | **Zero Secrets On Disk in Prod** | `node --test backend/test/smtpMailer.test.js` | `storage/email-dev/` write disabled in `production` | Enforced by guard in `mailer.js` & unit test | **PASS** |
| **6** | **Password Reset & Invite Security** | `node --test backend/test/passwordResetInvite.test.js` | Single-use expiring tokens, session invalidation (`token_version`), timing equalization | 7 unit tests passed; anti-enumeration verified | **PASS** |
| **7** | **Job & Reminder Idempotency** | `node --test backend/test/emailJobsIdempotency.test.js` | Zero duplicate reminder emails dispatched on 2nd run | 3 unit tests passed; verified against `email_outbox` | **PASS** |
| **8** | **Sensitive Error Sanitization** | `node --test backend/test/errorSanitization.test.js` | No stack traces or Prisma schema leaks in prod | 3 unit tests passed; sanitized JSON returned | **PASS** |
| **9** | **Password Rehash & Migration** | `node --test backend/test/passwordRehash.test.js` | Bcrypt cost >= 12 with transparent upgrade | 3 unit tests passed | **PASS** |
| **10** | **Database Immutability Triggers** | `node --test backend/test/integration/payroll-performance.test.js` | Locked/Paid pay runs and audit logs cannot be altered | PostgreSQL trigger guards enforce strict immutability | **PASS** |
| **11** | **Full Workflow E2E Verification** | `node scripts/verify-workflows.mjs` | 100/100 statutory steps pass | 100/100 workflows verified end-to-end | **PASS** |
| **12** | **Full UI Control True Crawler** | `node scripts/audit-ui-crawl.mjs` | All visible controls clicked, 0 bugs | 1,285 controls clicked across all 9 roles, 0 bugs (9 reports in `docs/reports/crawl/`) | **PASS** |
| **13** | **WCAG AA Contrast Verification** | `node scripts/check-contrast.mjs` | Computed text contrast >= 4.5:1 across 4 themes | 1,072 text nodes inspected, 0 font violations, 0 contrast failures | **PASS** |
| **14** | **Data Integrity Verification** | `node scripts/check-integrity.mjs` | 8/8 core integrity invariants satisfied | 8/8 checks passed (orphan records, balances, audits, 97 encrypted documents) | **PASS** |
| **15** | **Static Code & Permission Audits** | `node scripts/audit-ui-static.mjs` & `audit-role-matrix.mjs` | Zero broken bindings, complete role matrix | All 59 intentional controls documented, matrix clean | **PASS** |
| **16** | **Preflight Production Verification** | `node scripts/preflight-prod.mjs .env.production.local` | Fails on placeholders; passes on strong secrets | Example env exits non-zero; generated env passes | **PASS** |
| **17** | **500-Emp Payroll Calculation SLA** | `node scripts/benchmark-p95.js` | Duration < 60,000 ms (< 60s) | **2,358.7 ms (2.36s)** | **PASS** |
| **18** | **UAE WPS SIF Generation SLA** | `node scripts/benchmark-p95.js` | Duration < 5,000 ms (< 5s) | **151.1 ms (0.15s)** | **PASS** |
| **19** | **Payslip Bilingual PDF SLA** | `node scripts/benchmark-p95.js` | Duration < 3,000 ms (< 3s) | **1,997.8 ms (2.00s)** | **PASS** |
| **20** | **Screen P95 Latencies** | `node scripts/benchmark-p95.js` | All list/overview endpoints p95 < 3,000 ms | P95 range: **8.3 ms to 141.1 ms** | **PASS** |
| **21** | **Automated Backup & AES-256** | `bash deploy/backup.sh` & `node scripts/verify-backup.mjs` | Full dump + document volume encrypted and restorable | Scratch database restored and integrity verified; validated dump size & tables | **PASS** |
| **22** | **Production Smoke Test** | `node scripts/smoke-test-prod.mjs` | HTTPS, HSTS, secure cookies, closed DB port | 24/24 production smoke test assertions pass | **PASS** |

---

## Table 2: Not Done / Owner Decisions Prior to Scale

The following architectural and compliance items are documented with their exact current status, technical rationale, and owner decisions required prior to scaling beyond the initial production pilot:

| # | Area / Item | Current Built Status | Owner Decision & Next Steps Required | Standard / Ref |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Privileged Role MFA (TOTP)** | **IMPLEMENTED in rc6**: RFC 6238 TOTP (30s step, 6 digits, ±1 window) for privileged roles (`COMPANY_ADMIN`, `HR_MANAGER`, `PAYROLL_OFFICER`, `GM`, `FINANCE`). Includes SVG QR code + manual secret key enrolment, 10 bcrypt-hashed recovery codes, challenge flow, rate limiting, brute force lockout, admin reset audit, and AES-256-GCM encryption at rest. | **Complete**: Enforced by company setting `require_privileged_mfa` (default ON). | SEC-2, RFC 6238 |
| **2** | **Field-Level Envelope Encryption** | **Masked & Audited**: Emirates ID, passport, and IBAN are masked (last 4 shown by default) and audited on reveal. Database storage is encrypted at rest via storage volume encryption. Field-level envelope encryption with AWS KMS / Azure Key Vault is not yet bound. | **Owner Decision**: Select cloud KMS provider (AWS KMS vs Azure Key Vault) for application-level envelope key hierarchy. | SEC-31 |
| **3** | **Salary Field Application Encryption** | **Access Controlled**: Salaries are strictly filtered at the API and database levels by `canAccess('payroll', 'view')`. Plaintext numbers are never sent to employees or in email bodies. Application-layer encryption is not implemented. | **Owner Decision**: Pending owner decision whether to implement application-layer encryption for monthly salary fields. | SEC-32 |
| **4** | **Third-Party Penetration Test** | **Not Done**: Extensive automated SAST, crawler, and role matrix checks pass. A formal black-box/gray-box penetration test by an external CREST-accredited firm has not been commissioned. | **Owner Action**: Engage certified CREST / ISO 27001 external security auditor prior to multi-tenant client hosting. | SEC-70 |
| **5** | **Legal Review of DPA & Privacy Notice** | **Documented in Runbook**: Sub-processor requirements and UAE data residency guidance are detailed in `docs/DEPLOY-VPS.md`. Legal counsel review of the formal Data Processing Agreement (DPA) is pending. | **Owner Action**: Retain UAE legal counsel specializing in Federal Decree-Law No. 45/2021 to review employee privacy notices and vendor agreements. | UAE PDPL Art. 9 |
| **6** | **Automated Data Retention Deletion Job** | **Configurable**: 7-year default retention period is persisted in company settings. An automated hard-deletion cron job is intentionally deferred to avoid premature deletion of records required for UAE Ministry of Human Resources & Emiratisation (MOHRE) dispute audits. | **Owner Decision**: Define exact statutory retention windows per document type before scheduling the permanent purge daemon. | UAE Labour Law Art. 54 |
| **7** | **DIFC & ADGM Common Law Jurisdiction Scope** | **Out of Scope (Phase 2)**: Rule engine strictly complies with UAE Mainland Labour Law (Federal Decree-Law No. 33/2021). DIFC (DEWS) and ADGM employment regulations differ and are scheduled for Phase 2. | **Owner Roadmap**: Prioritize DIFC DEWS statutory calculation rules for client companies operating in financial free zones. | DIFC Law No. 2/2019 |
| **8** | **Visa-to-Visa Transfer Workflow** | **Manual**: Handled via standard settlement (separation) under Visa A and new hire onboarding under Visa B. An automated intra-group statutory transfer wizard is deferred. | **Owner Decision**: Review if automated visa transfers are required for high-volume staffing clients. | MOHRE Transfer Rule |
| **9** | **Malware Scanning of File Uploads** | **MIME & Magic Bytes Verified**: Uploads are restricted to PDF, JPG, and PNG with strict magic-byte inspection. In-stream ClamAV / ICAP anti-malware virus scanning is not installed on the VPS host. | **Owner Action**: Deploy ClamAV daemon sidecar in Docker Compose if employees upload documents from unmanaged devices. | SEC-36 |
| **10** | **ISO 27001 / SOC 2 Type II Certification** | **Not Started**: Architectural design aligns with ISO 27001 Annex A controls (audit logs, role-based access, automated backups, TLS), but formal certification audit has not begun. | **Owner Roadmap**: Target ISO 27001 / SOC 2 audit readiness 6 months post-launch. | ISO/IEC 27001:2022 |

---

## 3. Launch Gate Sign-Off

- **Technical Readiness Status**: **CONDITIONALLY APPROVED FOR PRODUCTION VPS DEPLOYMENT**
- **Condition**: Only synthetic or approved pilot company data may be loaded until Table 2 owner decisions (Legal DPA and KMS provider) are finalized. Real client personal data must be hosted exclusively within UAE sovereign cloud regions per `docs/DEPLOY-VPS.md`.

