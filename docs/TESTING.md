# Nextal HR & Payroll Platform - Testing Guide & Test Catalog

This document specifies the testing architecture, suites, execution commands, and verification protocols across all platform workspaces (`shared`, `backend`, `frontend`).

---

## 1. Quick Test Execution Commands

Run all tests from the repository root:
```bash
npm test
```

Or run individual workspace test suites:
```bash
# 1. Shared calculations, statutory formulas, UAE IBAN & employee utils (43 tests)
npm test --workspace=shared

# 2. Backend API, permissions, database isolation, settings & employees (105 tests)
npm test --workspace=backend

# 3. Frontend production build protections & Playwright E2E persistence (3 tests)
npm test --workspace=frontend
```

---

## 2. Test Catalog & Verification Matrix

### 2.1 `@nextal/shared` (43 Unit Tests)
*Path: `shared/test/money.test.js` and `shared/test/employeeUtils.test.js`*
*Execution engine: Node.js Test Runner (`node:test`)*

| Test Category | Description | Count | Reference |
|---|---|---|---|
| **UAE IBAN Validation** | ISO-7064 Mod-97 checksum, 23-char length, `AE` country code, bad checksum/character rejection | 6 tests | Rule D, Central Bank of UAE |
| **Data Masking** | List IBAN masking (`AE** **** **** 1234`), Emirates ID and Passport masking for non-HR viewers | 3 tests | Rule D & E, Spec 5.3 |
| **Document Expiry Rules** | Computes Valid, Expiring Soon ($\le$ 90d), Expired, Missing Data | 4 tests | Rule C, Settings threshold |
| **Contract Versioning** | `getContractOn(employeeId, date)` resolves historical contract version across raise dates | 1 test | Rule B, Section 8 |
| **Activation Check** | Verifies 4 statutory prerequisites: contract, shift, bank account, labour card / person ID | 2 tests | Rule A, Spec 7.2 |
| **Status Transitions** | Validates explicit state machine (Pre-Joined $\rightarrow$ New Joined $\rightarrow$ Active $\rightarrow$ Suspended $\rightarrow$ Archived) | 1 test | Rule A |
| **Statutory Payroll Formulas** | Ahmed worked examples 1–8, Sara & Omar Gratuity, Omar Leave Encashment, Pension 11%/5%, Floor/Cap | 18 tests | Section 8.4, UAE Labour Law Art 19/31/57 |
| **Decimal Rounding** | Explicit confirmation of `ROUND_HALF_UP` for money: 78.125 $\rightarrow$ 78.13 and 0.005 $\rightarrow$ 0.01 | 1 test | Phase 3 Fix c |
| **Pension Rate Variables** | `GPSSA_EE` and `GPSSA_ER` use rate variables without literals; Government share (2.5%) verified | 1 test | Phase 3 Fix a & b |
| **Opening Leave Accrual Plan** | Waiting period (0 days $\le$ 6 mos), 2 days/mo after 6 mos, pro-rated mid-month, 30 days/yr after 1 yr; Sara & Omar service checks | 6 tests | Phase 4 Fix a |

---

### 2.2 `@nextal/api` (105 Integration & Unit Tests)
*Path: `backend/test/**/*.test.js`*
*Execution engine: Node.js Test Runner with Supertest & Prisma ORM*

- **Phase 4 Employee Management, Verification & Security (`test/integration/employees.test.js`)**: 25 tests
  - **Employee List & Scoping (4 tests)**: Server-side search (`search`), filters (`status`, `department_id`, `branch_id`, `company_visa_id`, `nationality`, `document_status`), pagination, Department Manager team-only scoping (Spec 6).
  - **Role Masking & Privacy (4 tests)**: Strips all salary/bank keys for non-salary roles (`HR_OFFICER`, `DEPT_MANAGER`), blocks `EMPLOYEE` from company directory with 403, masks list IBANs (`AE** **** **** 1234`), masks sensitive Emirates ID/Passport for non-HR viewers.
  - **Status Transitions (4 tests)**: Explicit allowed-transitions map; rejects invalid transitions (e.g. Pre-Joined $\rightarrow$ Suspended) with 400; blocks transitions out of Archived.
  - **Activation Flow (2 tests)**: Blocks incomplete activation identifying missing requirements; activates complete employee, creates accrual-plan compliant opening leave allocation, and issues self-service invite token.
  - **Versioned Contracts (3 tests)**: Returns version history ordered by effective date desc; blocks contract creation with effective date inside locked pay period (2026-09) with 400 `LOCKED_PERIOD_BLOCKED`; verifies historical resolution with `getContractOn`.
  - **UAE IBAN Validation (3 tests)**: Accepts valid IBAN; rejects bad checksum (mod-97 failure); rejects non-AE country codes with structured error `INVALID_UAE_IBAN`.
  - **Document Storage & Magic Bytes (3 tests)**: Accepts PDF/PNG/JPG using magic-byte detection; rejects disguised/fake files with 400 `INVALID_FILE_TYPE`; authenticated streaming download route with permission check.
  - **Self-Verification & Audit (2 tests)**: Creator blocked from verifying their own created record (Rule G, 403 `SELF_VERIFICATION_BLOCKED`); writes immutable audit log entries (who, when, action, old $\rightarrow$ new) and reads them on History tab.
- **Phase 3 Settings & Rule Engine (`test/integration/settings.test.js`)**: 26 tests
  - AST formula validation, cycle detection, simulator endpoint (`POST /api/v1/settings/salary-rules/test`).
  - Section 8.4 worked examples execution.
  - Changing pension rates dynamically in Settings alters calculation result (Fix a).
  - Effective dating immutability: blocks modifying settings on/before locked pay runs (HTTP 400).
  - Section 5.3 role boundaries: Payroll Officer limited to salary rules; Finance limited to debit/credit accounts.
  - Delete-in-use protection (Rule E) for shifts, leave types, and salary rules.
  - Reset to UAE defaults and audit logging.
- **Phase 2 Authentication, Roles & Approvals (`test/integration/auth-roles.test.js`)**: 22 tests
  - 8 corporate roles, account lockout after 5 consecutive failures, token invalidation, support access grants, self-approval prevention.
- **Company Tenant Isolation (`test/integration/company-isolation.test.js`)**: 8 tests
  - Unscoped query rejection, cross-tenant read/write blocking, auto-injected company_id.
- **Payslip Lines & Sum Integrity (`test/integration/payslip-sum.test.js`)**: 6 tests
  - Confirms 42 payslips for October 2026, mathematical gross/net line sums, exact 335,490.50 AED Net-to-WPS parity.
- **Audit Log Database Protection (`test/integration/audit-log.test.js`)**: 4 tests
  - Append-only PostgreSQL trigger blocks UPDATE and DELETE.
- **API Skeleton & Middlewares (`test/integration/api-skeleton.test.js`)**: 4 tests
  - Health check, Swagger UI, Helmet security headers, Zod validation.
- **Serializers Unit Tests (`test/unit/serializers.test.js`)**: 3 tests
  - Statutory 4 salary roles, sensitive document masking, recursive deep sanitization.
- **Scheduled Jobs Unit Tests (`test/unit/jobs.test.js`)**: 2 tests
  - Nightly expiry scanner and monthly accrual job idempotency.

---

### 2.3 `@nextal/web` (3 Production Protection & E2E Tests)
*Path: `frontend/test/*.test.js`*
*Execution engine: Node.js Test Runner & Playwright Chromium*

1. **Demo Persona Bar Bundle Exclusion (`login-persona.test.js`)**:
   - Recursively inspects production build artifacts in `.next-build` and `.next`.
   - Confirms zero occurrences of `demo-personas-bar` in production JS/HTML chunks.
2. **GET /login Production HTML Verification (`login-persona.test.js`)**:
   - Spawns production server with `NEXT_PUBLIC_DEMO_MODE=false`.
   - Confirms HTTP 200 response HTML strictly excludes persona switching UI.
3. **Settings Shift Grace Minutes Persistence (Playwright E2E) (`settings-shift-persistence.test.js`)**:
   - 120s suite timeout and tree-kill process cleanup in `after()` and `catch` (Fix d).
   - Launches headless Chromium, authenticates as Company Admin (`admin@gulftech.ae`).
   - Navigates to `/settings`, opens Shifts drawer, edits shift grace minutes (e.g. 15m $\rightarrow$ 25m).
   - Saves via API mutation (`PUT /api/v1/settings/shifts/:id`), reloads page.
   - Re-opens drawer and asserts UI displays `25m`.
   - Confirms `audit_logs` and `settings_versions` rows created in PostgreSQL.

---

## 3. Database Integrity & Testing Invariants

> [!IMPORTANT]
> **Permanent Database & Testing Rules**:
> - Never change the database schema or data by hand.
> - Never bypass a trigger or the status flow, not even temporarily.
> - Schema changes go in a NEW Prisma migration. Applied migration files are never edited.
> - Demo data comes only from backend/prisma/seed/ (locked behind SEED_MODE=demo).
> - Test data is created inside the test that needs it.

---

## 4. Automated Test Database Only: Evaluation Personas & Credentials

The demo accounts and evaluation dataset exist **exclusively in the automated test database** (`DATABASE_URL_TEST`, default: `nextal_hr_test`), populated during automated test runs with `SEED_MODE=demo`. The production database (`nextal_hr_payroll`) remains completely unseeded with zero demo records.

> [!NOTE]
> **Demo Password for all test personas below (Automated Test DB Only):** `Nextal@2026!`

| Role | Persona Name | Email | Sees Salary | Test Scope & Invariants Tested |
|---|---|---|:---:|---|
| **Platform Admin** | Platform Superadmin | `platform@nextal.ae` | — | **Deferred (Phase 2)**. Disabled via `FEATURE_PLATFORM_ADMIN=false`. Returns 403. |
| **Company Admin** | Tariq Al-Hashemi | `admin@gulftech.ae` | **No** | Company settings, visas, branches, departments, jobs, shift policies, users. **Salary masked.** |
| **HR Manager** | Maryam Al-Nuaimi | `hr.mgr@gulftech.ae` | **Yes** | Full HR lifecycle, contracts, attendance sign-off, leave approvals, pay run validation. |
| **HR Officer** | Saeed Al-Ketbi | `hr.officer@gulftech.ae` | **No** | Employee creation, document verification, biometric import, cancellation tasks. **Salary masked.** |
| **HR Officer (DIFC)** | Saeed Al-Ketbi (DIFC) | `hr.difc@gulftech.ae` | **No** | Scoped to Visa 02 (DIFC Freezone) only. Zero cross-visa leakage. |
| **Payroll Officer** | Zaid Al-Marzooqi | `payroll@gulftech.ae` | **Yes** | Pay run calculation, variable inputs, variance documentation, PDF payslip generation. |
| **Dept Manager** | Mansour Al-Ketbi | `dept.mgr@gulftech.ae` | **No** | Operations team attendance, overtime review, 1st leave approval. **Salary masked.** |
| **General Manager** | Rashid Al-Falasi | `gm@gulftech.ae` | **Yes** | Final executive approval on pay runs, final settlements, and extended leaves (> 5 days). |
| **Finance** | Hassan Al-Balooshi | `finance@gulftech.ae` | **Yes** | WPS SIF export, pay run payment (`Mark as Paid`), accounting GL journal export, settlement disbursement. |
| **Employee** | Ahmed Al-Mansoori | `employee@gulftech.ae` | **No** | Self-service (`/me/*`): personal profile, bilingual payslips (own data only), punch records, leave submission. |

### Employee Self-Service Test Logins
All 45 test employees of Gulf Tech Logistics LLC have individual logins in the test database:
`<employee_code_lowercase>@gulftech.ae` (e.g. `emp-dxb-001@gulftech.ae` … `emp-dxb-045@gulftech.ae`), password `Nextal@2026!`.

