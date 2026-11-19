# Security Audit Findings & Rejection Log Specification

This document details the security review findings and requirements for HR & Payroll UAE (Nextal Platform).

## Security Findings Matrix

| Finding ID | Severity | Category | Description | Status | Commit | Test Name |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **C1** | Critical | Approval Engine | Approval engine order, atomic transaction, self-approval blocking, multi-step user duplication blocking | Closed | `fec0654` | `backend/test/security/approval-engine.test.js` |
| **C2** | Critical | Authentication | Hardcoded JWT secret fallback in middleware/services; env validation in production | Closed | `c80b4bc` | `backend/test/security/jwt-secret.test.js` |
| **C3** | Critical | Authorization | Mock-actor (`admin-id`) back door and arbitrary `findFirst` fallback users across approval/compliance/separation | Closed | `6ff9661` | `backend/test/security/mock-actor-removal.test.js` |
| **C4** | Critical | Multi-Tenancy | Client headers (`x-platform-admin`, `x-company-id`) trusted without verification; tenant isolation breach | Closed | `c3feb67` | `backend/test/security/client-headers.test.js` |
| **H1** | High | Approval Roles | Non-exact role match (HR_OFFICER/HR_MANAGER interchangeability) and automatic COMPANY_ADMIN bypass | Closed | `fec0654` | `backend/test/security/approval-engine.test.js` |
| **H2** | High | Route Guards | Missing `requirePermission` / `requireRole` on approval action routes | Closed | `fec0654` | `backend/test/security/approval-engine.test.js` |
| **H3** | High | Authorization | Route authorization on employee profile & document management | Fixed | `4eaaf64` | `backend/test/integration/employees.test.js` |
| **H4** | High | Data Privacy | Sensitive field reveal (Emirates ID, passport, IBAN, salary) lacking strict whitelist, RBAC & rate limiting | Closed | `26ccc76` | `backend/test/security/sensitive-reveal.test.js` |
| **H5** | High | Banking / WPS | Bank account modification IDOR vulnerability & unapproved IBAN modifications during active pay run | Closed | `d4294dc` | `backend/test/security/bank-account-security.test.js` |
| **H6** | High | Banking / Payroll | Payroll SIF export authorization, locked pay run DB triggers, and tamper-resistance | Fixed | `829df70` | `backend/test/security/bank-account-security.test.js` |
| **H7** | High | Multi-Tenancy / Scoping | Data scope bypass prevention (Branch / Visa scoping across all entities with fail-closed middleware) | Fixed | `c5d914a` | `backend/test/integration/visa-branch-scope.test.js` |
| **M1** | Medium | Compliance Dates | Inconsistent business dates using UTC `toISOString().slice(0,10)` instead of UAE Asia/Dubai timezone | Closed | `708c476` | `backend/test/unit/dubai-date-helper.test.js` |
| **M2** | Medium | Route Guards | Settlements, separations, and overtime lacking segregation of duties and granular route middleware | Closed | `b72d7fb` | `backend/test/security/settlement-guards.test.js` |
| **M3** | Medium | Attendance Policies | Shift grace minutes and attendance policy tamper-resistance & audit logging on settings change | Fixed | `ce00847` | `backend/test/integration/settings.test.js` |
| **M4** | Medium | Input Validation | Document magic-byte validation on file uploads (PDF `%PDF`, JPEG `FF D8 FF`, PNG `89 50 4E 47`) | Fixed | `5cb59ae` | `backend/test/integration/employees.test.js` |
| **M5** | Medium | Abuse Prevention | Rate limiting on sensitive endpoints (login, MFA, sensitive reveal) | Fixed | `e47010a` | `backend/test/security/hardening.test.js` |
| **M6** | Medium | Authentication | Password complexity enforcement (10+ chars, upper, lower, number, special, no name/email username, 20-word common blocklist) | Fixed | `50611ca` | `backend/test/security/password-policy.test.js` |
| **M7** | Medium | Encryption at Rest | Column-level encryption at rest with blind index (SEC-31) | Deferred (Reason: file uploads are AES-256-GCM encrypted, UI masking active; blind indexing deferred post-1.0.0; documented in `docs/KNOWN-LIMITATIONS.md`) | `N/A` | `no automated test (documented in docs/KNOWN-LIMITATIONS.md)` |
| **M8** | Medium | Cryptography | Argon2id password hashing migration (SEC-1) | Deferred (Reason: native C++ toolchain compatibility on Windows/container; bcrypt cost 12 with transparent rehash active; documented in `docs/KNOWN-LIMITATIONS.md`) | `N/A` | `no automated test (documented in docs/KNOWN-LIMITATIONS.md)` |
| **REJ-LOG** | Feature / Security | Rejection Audit | Dedicated append-only `approval_rejections` log table with trigger, mandatory >=10 char reason, UI tab & dialog, restricted to HR, GM, Admin | Closed | `624aa33` | `backend/test/security/rejection-log.test.js` |
| **HARDEN** | Hardening | General Security | Body limit (100kb), rate limiting on login/MFA, CSRF Origin/Referer check, and production preflight checks | Closed | `e47010a` | `backend/test/security/hardening.test.js` |

---

## Detailed Task Breakdown

### STEP 1 — C2: Remove Hard-Coded JWT Secret
- Remove `'nextal_super_secret_jwt_key_2026_uae'` fallback in `backend/src/middleware/auth.js` and `backend/src/services/authService.js`.
- Refuse app boot in `backend/src/config/validateEnv.js` if `JWT_SECRET` is missing, <32 characters, or a known default.
- Require `JWT_SECRET` in development from `.env` (provided via `.env.example`).

### STEP 2 — C4: Stop Trusting Client Headers
- In `backend/src/middleware/companyContext.js`, remove client-supplied `x-platform-admin` and `x-company-id`.
- Ensure company and platform-admin flags come ONLY from verified JWT.
- Allow `x-company-id` only when `decoded.isPlatformAdmin` is true, auditing every tenant-switch invocation.

### STEP 3 — C3: Remove Mock-Actor Back Door & First-User Fallback
- In `approvalService.js`, eliminate `admin-id` / fallback mock actor resolution.
- Eliminate arbitrary `findFirst` fallback users in `complianceService.js` and `separationService.js`.
- Require real, validated UUIDs within the caller's company.

### STEP 4 — C1 + H1 + H2: Approval Engine Order & Role Rules
- Exact pipeline: Load company-scoped request → Check scope → Status check → Authorize exact role for step → Block self-approval → Block same user from multiple steps → Validate reject reason → Atomic `prisma.$transaction` containing all side effects → Commit → Notify.
- Disallow HR_OFFICER / HR_MANAGER role conflation unless defined on step.
- Implement explicit `adminOverride` path requiring >=10 char reason, logging `override=true` audit entry.
- Secure all routes in `routes/approvals.js` with role/permission middleware.

### STEP 5 — H4: Sensitive-Field Reveal
- In `employeeController.revealSensitiveField`: RBAC check for field (Emirates ID, passport, IBAN, salary), scope verification, whitelist enforcement, per-user rate limit, and audit logging.

### STEP 6 — H5: Bank-Account Changes
- Filter updates by `{ id, company_id, employee_id }`.
- Creating/updating IBAN during an active pay run creates a pending bank change requiring dual approval. SIF generator ignores unapproved IBANs.

### STEP 7 — M2: Settlements / Separations Route Guards
- Implement granular segregation of duties (preparer ≠ approver ≠ payer) on settlements and separations.
- Audit full role matrix with `scripts/audit-role-matrix.mjs` and export to `docs/reports/ROLE-MATRIX-AFTER.md`.

### STEP 8 — Rejection Log
- Prisma model `approval_rejections` with immutability database trigger (no UPDATE, no DELETE).
- Repository, Service, Controller, Route hierarchy under `/api/v1/approvals/rejections`.
- Shared `approvalService.reject(...)` engine method across all domain modules.
- Frontend Rejections tab, full-detail drawer, CSV export, and `RejectDialog` component with live counter (min 10 chars).

### STEP 9 — M1: Dubai Date Helper Everywhere
- Standardize all business date formatting to `toDubaiDateString()` (Asia/Dubai, UTC+4).

### STEP 10 — Hardening
- Body limit 100kb, strict rate limits, CSRF check, and `scripts/preflight-prod.mjs` verification.
