# Security Audit Findings & Rejection Log Specification

This document details the security review findings and requirements for HR & Payroll UAE (Nextal Platform).

## Security Findings Matrix

| Finding ID | Severity | Category | Description | Status | Commit | Test Name |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **C1** | Critical | Approval Engine | Approval engine order, atomic transaction, self-approval blocking, multi-step user duplication blocking | Open | Pending | `approval-rules.test.js` |
| **C2** | Critical | Authentication | Hardcoded JWT secret fallback in middleware/services; env validation in production | Open | Pending | `jwt-secret-hardening.test.js` |
| **C3** | Critical | Authorization | Mock-actor (`admin-id`) back door and arbitrary `findFirst` fallback users across approval/compliance/separation | Open | Pending | `mock-actor-removal.test.js` |
| **C4** | Critical | Multi-Tenancy | Client headers (`x-platform-admin`, `x-company-id`) trusted without verification; tenant isolation breach | Open | Pending | `client-headers-isolation.test.js` |
| **H1** | High | Approval Roles | Non-exact role match (HR_OFFICER/HR_MANAGER interchangeability) and automatic COMPANY_ADMIN bypass | Open | Pending | `approval-role-exactness.test.js` |
| **H2** | High | Route Guards | Missing `requirePermission` / `requireRole` on approval action routes | Open | Pending | `approval-route-guards.test.js` |
| **H4** | High | Data Privacy | Sensitive field reveal (Emirates ID, passport, IBAN, salary) lacking strict whitelist, RBAC & rate limiting | Open | Pending | `sensitive-field-reveal.test.js` |
| **H5** | High | Banking / WPS | Bank account modification IDOR vulnerability & unapproved IBAN modifications during active pay run | Open | Pending | `bank-account-security.test.js` |
| **M1** | Medium | Compliance Dates | Inconsistent business dates using UTC `toISOString().slice(0,10)` instead of UAE Asia/Dubai timezone | Open | Pending | `dubai-date-helper.test.js` |
| **M2** | Medium | Route Guards | Settlements, separations, and overtime lacking segregation of duties and granular route middleware | Open | Pending | `settlement-separation-guards.test.js` |
| **REJ-LOG** | Feature / Security | Rejection Audit | Dedicated append-only `approval_rejections` log table with trigger, mandatory >=10 char reason, UI tab & dialog | Open | Pending | `rejection-log.test.js` |
| **HARDEN** | Hardening | General Security | Body limit (100kb), rate limiting on login/MFA, CSRF Origin/Referer check, and production preflight checks | Open | Pending | `hardening-checks.test.js` |

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
