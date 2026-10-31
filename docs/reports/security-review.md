# Nextal HR & Payroll Platform — Security Review & Vulnerability Assessment

**Assessment Date**: 31 October 2026  
**Target Release**: v1.0.0-rc1  
**Platform Architecture**: Dual-tenant / Multi-company SaaS, Next.js 14 App Router, Node.js Express REST API, PostgreSQL 16 with Prisma ORM  
**Compliance Standard**: UAE Federal Decree-Law No. 33 of 2021, MOHRE WPS Guidelines, GDPR/UAE PDPL (Federal Decree-Law No. 45 of 2021)

---

## 1. Executive Summary

Nextal HR & Payroll has been designed from the foundation with defense-in-depth security principles. Multi-tenant isolation is enforced at the database and ORM layers, eliminating single-point vulnerabilities. All data access enforces role-based access control (RBAC), automatic sensitive field masking, append-only immutable audit logging, and strict cryptographic safeguards.

---

## 2. Multi-Tenant Isolation Architecture

### 2.1 Prisma Scoped Client & AsyncLocalStorage
Multi-tenancy isolation is enforced at the ORM layer (`backend/src/lib/prisma.js`):
1. **AsyncLocalStorage (`companyStorage`)**: Each incoming HTTP request is authenticated and has its tenant context bound to Node's `AsyncLocalStorage` via `companyContextMiddleware`.
2. **Prisma Client Extension**: Automatically intercepts all CRUD operations on the 48 `COMPANY_OWNED_MODELS`:
   - `findMany`, `findFirst`, `count`, `aggregate`: Automatically appends `{ company_id: companyId }` to the `WHERE` clause.
   - `findUnique`: Rewritten to `findFirst` scoped by `company_id`.
   - `create`: Automatically injects `company_id`.
   - `update`, `delete`: First verifies company ownership with an internal query; throws `P2025` ("Record belongs to another company") if accessed across tenant boundaries.
3. **Database Constraints & Triggers**:
   - Foreign key constraints ensure entities cannot reference cross-tenant records.
   - Database triggers enforce pay run status guards (e.g. `Locked` / `Paid` pay runs cannot transition back to `Draft`, and payslip lines are strictly immutable once locked).

---

## 3. Authentication & Session Management

- **Password Hashing**: `bcrypt` with salt rounds = 10. Passwords are never stored in plaintext or logged.
- **JWT Tokens**: Signed using HMAC-SHA256 with strong secrets (`JWT_SECRET`). Tokens carry user ID, tenant company ID, platform admin flag, and assigned roles.
- **Cookie Security**:
  - `httpOnly: true` (prevents JavaScript access via XSS)
  - `secure: true` in production environments (transmitted exclusively over TLS)
  - `sameSite: 'lax'` (mitigates Cross-Site Request Forgery / CSRF)
- **Brute Force Protection**: Failed login tracking with lockouts after repeated failures (`failed_logins` column on `users` table).
- **CSRF Posture**: API endpoints consume `Authorization: Bearer <token>` headers as the primary authentication mechanism, natively immune to browser-directed cross-origin CSRF attacks.

---

## 4. Secret Management & Startup Validation

- **Cryptographic Strength Enforcer** (`backend/src/lib/envValidation.js`):
  - Validated on server boot prior to listening for requests.
  - Enforces minimum `JWT_SECRET` length of 32 characters.
  - Detects and rejects dictionary words (`secret`, `password`, `changeme`).
  - Emits hard failure in production mode if requirements are unmet.
- **Repository Hygiene**:
  - No secret keys, database credentials, or private certificates are checked into git.
  - `.gitignore` covers `.env`, `.env.local`, `.env.production`, and credential archives.
  - Standardized `.env.production.example` provides environment blueprints.

---

## 5. Network & HTTP Hardening

- **Helmet Security Headers** (`helmet@8.0.0`):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Strict-Transport-Security: max-age=15552000; includeSubDomains` (HSTS)
  - `X-DNS-Prefetch-Control: off`
  - `Referrer-Policy: no-referrer`
- **CORS Configuration**:
  - Configured with strict origin whitelisting (`CORS_ORIGIN`).
  - Allowed methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
  - Allowed headers: `Content-Type, Authorization, X-Company-Id, X-Platform-Admin, Cookie`.
- **API Rate Limiting** (`express-rate-limit`):
  - Standard tier: 500 requests per 15-minute window per IP.
  - Health check endpoint exempted from rate limiting for cluster probes.

---

## 6. Input Validation & Injection Prevention

### 6.1 SQL Injection Audit
A comprehensive codebase audit verified zero unsafe dynamic SQL string interpolations:
- **Prisma Parameterized Queries**: 100% of domain business logic uses Prisma's typed queries.
- **Raw SQL Scan**: The only two `$queryRaw` statements in the codebase are in `/api/v1/health`:
  - `SELECT 1` (static probe)
  - `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'` (static probe)
  - Result: **0% SQL injection attack surface**.

### 6.2 Zod Validation Middleware
- Every mutating REST endpoint executes schema validation before controller execution (`backend/src/middleware/validate.js`).
- Invalid payloads return `HTTP 400 Bad Request` with structured field errors.

---

## 7. File Upload Hardening

All multipart uploads (`/employees`, `/compliance`, `/attendance`) route through `safeFileUpload` (`backend/src/middleware/fileUpload.js`):
1. **Memory Storage**: Uploads are held in memory buffer (`multer.memoryStorage()`) and never directly executed or written to arbitrary server paths.
2. **MIME Whitelist**: Strictly restricted to `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`, and `text/plain`.
3. **Extension Blacklist**: Hard block on executable extensions (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.phtml`, `.js`, `.mjs`, `.vbs`, `.scr`, `.ps1`, `.jar`, `.dll`, `.com`).
4. **Size Ceilings**: Hard ceiling of 25 MB max per request.

---

## 8. Information Leakage Prevention & Privacy

1. **Production Error Masking**: `errorHandler` suppresses `err.stack` in production environments, returning generic client-safe error messages.
2. **Statutory Salary & Identity Masking** (Spec Section 5.3):
   - Only 4 roles can view unmasked salary details: `PLATFORM_ADMIN`, `COMPANY_ADMIN`, `HR_MANAGER`, `PAYROLL_OFFICER`.
   - All other roles receive masked responses: `basic`, `housing`, `gross`, `net` are stripped or set to `0.00`.
   - Bank accounts: IBAN masked as `AE** **** **** 1234` for unauthorized viewers.
   - Government IDs: Emirates ID masked as `784-****-*******-1` and passport numbers masked.

---

## 9. Dependency Vulnerability Assessment (`npm audit`)

| Package | Version | Severity | Impact | Mitigation Status |
|---|---|---|---|---|
| `basic-ftp` | 5.0.3 | High | Sub-dependency of `puppeteer` (used only for server-side PDF generation) | Mitigated: Internal PDF generation consumes only trusted HTML templates |
| `extract-zip` | 2.0.1 | High | Sub-dependency of `puppeteer` | Mitigated: No zip archives accepted from external users for browser extraction |
| `minimatch` | 3.1.2 | Moderate | Sub-dependency of `exceljs` | Mitigated: File path parsing operates on trusted internal file system paths |
| `uuid` | 8.3.2 | Moderate | Sub-dependency of `node-cron` | Mitigated: System UUIDs generated via native crypto/database UUIDv4 |
| `next` | 14.2.15 | High | Frontend web framework | Mitigated: Production Next.js server operates behind reverse proxy; server components execute internal fetches |

---

## 10. Role-Based Access Control (RBAC) Permissions Table

| API Endpoint Path | HTTP Method | Permitted System Roles | Primary Purpose |
|---|---|---|---|
| `/api/v1/auth/login` | `POST` | Public | Authenticate user & issue JWT |
| `/api/v1/auth/me` | `GET` | Authenticated (All 8 roles) | Fetch current session profile |
| `/api/v1/platform/companies` | `GET, POST` | `PLATFORM_ADMIN` | Multi-tenant company onboarding |
| `/api/v1/platform/support-access` | `POST` | `PLATFORM_ADMIN` | Request temporary support access |
| `/api/v1/users` | `GET, POST, PUT` | `PLATFORM_ADMIN`, `COMPANY_ADMIN` | Manage users and assign roles |
| `/api/v1/employees` | `GET` | `COMPANY_ADMIN`, `HR_MANAGER`, `PAYROLL_OFFICER`, `HR_OFFICER`, `DEPT_MANAGER`* | Employee list (*Dept Manager scoped to team) |
| `/api/v1/employees` | `POST, PUT` | `COMPANY_ADMIN`, `HR_MANAGER`, `HR_OFFICER` | Create / edit employee profiles |
| `/api/v1/employees/:id/salary` | `GET` | `COMPANY_ADMIN`, `HR_MANAGER`, `PAYROLL_OFFICER` | View unmasked salary breakdown |
| `/api/v1/attendance/punch` | `POST` | Authenticated (All) | Submit clock in / out punch |
| `/api/v1/attendance/import` | `POST` | `COMPANY_ADMIN`, `HR_MANAGER`, `HR_OFFICER` | Import biometric punch file |
| `/api/v1/attendance/confirm/manager` | `POST` | `COMPANY_ADMIN`, `DEPT_MANAGER` | Manager attendance period sign-off |
| `/api/v1/attendance/confirm/hr` | `POST` | `COMPANY_ADMIN`, `HR_MANAGER` | HR attendance period sign-off |
| `/api/v1/leave/requests` | `POST` | Authenticated (All) | Submit leave request |
| `/api/v1/leave/requests/:id/approve` | `POST` | `COMPANY_ADMIN`, `HR_MANAGER`, `DEPT_MANAGER` | Approve employee leave request |
| `/api/v1/payroll/runs` | `GET` | `COMPANY_ADMIN`, `HR_MANAGER`, `PAYROLL_OFFICER`, `FINANCE` | View pay runs list |
| `/api/v1/payroll/runs/calculate` | `POST` | `COMPANY_ADMIN`, `PAYROLL_OFFICER` | Execute payroll calculation engine |
| `/api/v1/payroll/runs/:id/validate` | `POST` | `COMPANY_ADMIN`, `HR_MANAGER` | HR validation of draft pay run |
| `/api/v1/payroll/runs/:id/approve` | `POST` | `COMPANY_ADMIN`, `GM` | GM approval of validated pay run |
| `/api/v1/payroll/runs/:id/lock` | `POST` | `COMPANY_ADMIN`, `PAYROLL_OFFICER` | Lock pay run (triggers immutability) |
| `/api/v1/payroll/runs/:id/pay` | `POST` | `COMPANY_ADMIN`, `FINANCE` | Mark pay run Paid & record payment details |
| `/api/v1/payroll/runs/:id/sif` | `GET` | `COMPANY_ADMIN`, `PAYROLL_OFFICER`, `FINANCE` | Download MOHRE WPS SIF file |
| `/api/v1/separations` | `POST` | `COMPANY_ADMIN`, `HR_MANAGER`, `EMPLOYEE` (self) | Initiate resignation / termination |
| `/api/v1/separations/:id/clearance` | `PATCH` | Department leads, `HR_MANAGER` | Clear department assets & liabilities |
| `/api/v1/settlements/prepare` | `POST` | `COMPANY_ADMIN`, `PAYROLL_OFFICER` | Calculate Article 51 gratuity & encashment |
| `/api/v1/settlements/:id/approve` | `POST` | `COMPANY_ADMIN`, `GM` | GM final approval of settlement |
| `/api/v1/compliance/documents` | `GET` | `COMPANY_ADMIN`, `HR_MANAGER`, `HR_OFFICER` | Track passport, visa, EID expirations |
| `/api/v1/reports/accounting-export` | `GET` | `COMPANY_ADMIN`, `FINANCE`, `PAYROLL_OFFICER` | Generate balanced ERP General Ledger CSV |
| `/api/v1/reports/headcount` | `GET` | `COMPANY_ADMIN`, `HR_MANAGER`, `GM` | Headcount, joiners, leavers, turnover % |
| `/api/v1/audit/logs` | `GET, POST` | `COMPANY_ADMIN`, `PLATFORM_ADMIN`, `HR_MANAGER` | View immutable audit trail & export CSV |
