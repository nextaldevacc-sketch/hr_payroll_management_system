# Nextal HR & Payroll Platform - Testing Guide & Test Catalog

This document specifies the testing architecture, suites, execution commands, and verification protocols across all platform workspaces (`packages/shared`, `apps/api`, `apps/web`).

---

## 1. Quick Test Execution Commands

Run all tests from the repository root:
```bash
npm test
```

Or run individual workspace test suites:
```bash
# 1. Shared calculations, statutory formulas & worked examples (18 tests)
npm test --workspace=packages/shared

# 2. Backend API, permissions, database isolation & privacy serializers (74 tests)
npm test --workspace=apps/api

# 3. Frontend production build protections & Playwright E2E persistence (3 tests)
npm test --workspace=apps/web
```

---

## 2. Test Catalog & Verification Matrix

### 2.1 `@nextal/shared` (18 Unit Tests)
*Path: `packages/shared/test/money.test.js`*
*Execution engine: Node.js Test Runner (`node:test`)*

| Test Case | Description | Statutory Spec Reference |
|---|---|---|
| **Ahmed Ex 1** | Normal Overtime (3h) $\rightarrow$ AED 78.13 | Section 8.4 Ex 1, UAE Labour Law Art 19 |
| **Ahmed Ex 2** | Night Overtime (2h) $\rightarrow$ AED 62.50 | Section 8.4 Ex 2, UAE Labour Law Art 19 |
| **Ahmed Ex 3** | Rest Day Overtime (8h / 1d) $\rightarrow$ AED 250.00 | Section 8.4 Ex 3, UAE Labour Law Art 19 |
| **Ahmed Ex 4** | Absence 2 days ($\div 30$ divisor) $\rightarrow$ AED 533.33 | Section 8.4 Ex 4 |
| **Ahmed Ex 5** | Absence 2 days ($\times 12 \div 365$ divisor) $\rightarrow$ AED 526.03 | Section 8.4 Ex 5 |
| **Ahmed Ex 6** | Sick Leave Half Pay (5 days at 50%) $\rightarrow$ AED 666.67 | Section 8.4 Ex 6, UAE Labour Law Art 31 |
| **Ahmed Ex 7** | Company Loan Recovery $\rightarrow$ AED 500.00 | Section 8.4 Ex 7 |
| **Ahmed Ex 8** | Ahmed Combined Pay Slip nets AED 7,044.80 | Section 8.4 Ex 8 |
| **Sara Gratuity** | Basic 5,000, 3y 6m $\rightarrow$ AED 12,082.19 | Section 8.4 Sara Gratuity |
| **Omar Gratuity** | Basic 6,000, 7 years $\rightarrow$ AED 32,547.95 | Section 8.4 Omar Gratuity |
| **Omar Encashment** | 12 unused leave days $\rightarrow$ AED 2,367.12 | Section 8.4 Omar Leave Encashment |
| **Pension 11%** | New scheme (on/after 2 Oct 2023) employee 11% | Federal Decree-Law 57/2023 |
| **Pension 5%** | Legacy scheme (before 2 Oct 2023) employee 5% | Federal Decree-Law 57/2023 |
| **Pension Min Floor** | Salary below AED 3,000 raised to floor AED 3,000 | Statutory Minimum Contribution Base |
| **Pension Max Cap** | Salary above AED 70,000 capped at AED 70,000 | Statutory Maximum Contribution Cap |
| **Pension Nafis <20k** | Salary < AED 20,000: Employer 12.5%, Gov share 2.5% | Nafis Support Scheme |
| **Pension Nafis >20k** | Salary $\ge$ AED 20,000: Employer 15%, Gov share 0% | Standard Statutory Employer Cost |
| **Statutory Rule Count** | Exactly 17 baseline salary rules defined | Section 8.1 Statutory UAE Default Rules |

---

### 2.2 `@nextal/api` (74 Integration & Unit Tests)
*Path: `apps/api/test/*.test.js`*
*Execution engine: Node.js Test Runner with Supertest & Prisma ORM*

- **Platform & Tenant Isolation (`platform.test.js`)**: 12 tests
  - Superadmin authentication, tenant provisioning, company status transitions (Active/Suspended), cross-tenant isolation enforcement.
- **Role Permissions & Security (`auth.test.js`, `users.test.js`)**: 22 tests
  - 7 standard corporate roles, account lockout after 5 consecutive failures, token invalidation, support access grants.
- **Salary Privacy Serializer Allowlist (`privacy.test.js`, `employees.test.js`)**: 14 tests
  - Deep-scan JSON response validation across all endpoints for non-salary roles (`COMPANY_ADMIN`, `HR_OFFICER`, `DEPT_MANAGER`, `EMPLOYEE`).
  - Zero salary, bank account number, IBAN, or financial balance leakage at any object depth.
- **Phase 3 Settings & Rule Engine (`settings.test.js`)**: 26 tests
  - AST formula validation, cycle detection, simulator endpoint (`POST /api/v1/settings/salary-rules/test`).
  - Section 8.4 worked examples execution.
  - Effective dating immutability: blocks modifying settings on/before locked pay runs (HTTP 400).
  - Section 5.3 role boundaries: Payroll Officer limited to salary rules; Finance limited to debit/credit accounts.
  - Delete-in-use protection (Rule E) for shifts, leave types, departments, and rules.
  - Reset to UAE defaults and audit logging.

---

### 2.3 `@nextal/web` (3 Production Protection & E2E Tests)
*Path: `apps/web/test/*.test.js`*
*Execution engine: Node.js Test Runner & Playwright Chromium*

1. **Demo Persona Bar Bundle Exclusion (`login-persona.test.js`)**:
   - Recursively inspects production build artifacts in `.next-build` and `.next`.
   - Confirms zero occurrences of `demo-personas-bar` in production JS/HTML chunks.
2. **GET /login Production HTML Verification (`login-persona.test.js`)**:
   - Spawns production server with `NEXT_PUBLIC_DEMO_MODE=false`.
   - Confirms HTTP 200 response HTML strictly excludes persona switching UI.
3. **Settings Shift Grace Minutes Persistence (Playwright E2E) (`settings-shift-persistence.test.js`)**:
   - Launches headless Chromium, authenticates as Company Admin (`admin@gulftech.ae`).
   - Navigates to `/settings`, opens Shifts drawer, edits shift grace minutes (e.g. 15m $\rightarrow$ 25m).
   - Saves via API mutation (`PUT /api/v1/settings/shifts/:id`), reloads page.
   - Re-opens drawer and asserts UI displays `25m`.
   - Queries PostgreSQL directly to confirm:
     - An `audit_logs` row exists with `table_name: 'shifts'`, `action: 'UPDATE'`, and `new_values.grace_minutes = 25`.
     - A `settings_versions` row exists with `entity_type: 'shift'` and `snapshot.grace_minutes = 25`.
