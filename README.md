# Nextal HR & Payroll Platform (UAE Multi-Company)

Enterprise Human Resources and WPS Payroll Management Software engineered for UAE regulatory compliance (MOHRE, Federal Decree-Law No. 33 of 2021, and Central Bank SIF Wages Protection System).

---

## 1. Demo Credentials (Section 5.2 & Phase 2 Delivery)

All demo accounts below are seeded in **Gulf Tech Logistics LLC** (Primary Demo Company) with active credentials for testing and evaluation.

> [!NOTE]
> **Demo Password for all accounts below:** `Nextal@2026!`

| Role (Section 5.2) | Person Name | Email | Sees Salary | Permissions & Primary Responsibilities |
|---|---|---|:---:|---|
| **Platform Admin** | Nextal Platform Admin | `platform@nextal.ae` | Yes* | Manages companies, creates client instances with UAE defaults, suspends/reactivates (FR-PL1–2). *No tenant data access without a time-limited support grant (FR-PL3). |
| **Company Admin** | Tariq Al-Hashemi | `admin@gulftech.ae` | **Yes** | Full company setup: users & roles, approval flows, shifts, company visas, branches, departments, salary rules. |
| **HR Manager** | Maryam Al-Nuaimi | `hr.mgr@gulftech.ae` | **Yes** | Verifies new employees, edits HR records, approves salary adjustments & leave, validates pay runs & settlements. |
| **HR Officer** | Saeed Al-Ketbi | `hr.officer@gulftech.ae` | **No** | Maintains employee documents & attendance, 2nd leave approval. **Salary numbers strictly masked & absent from API (Section 5.3).** |
| **Payroll Officer** | Zaid Al-Marzooqi | `payroll@gulftech.ae` | **Yes** | Sets cut-offs, prepares pay runs, calculates settlements, SIF file export, edits Section 8.1 salary rules. |
| **Dept Manager** | Fatima Al-Zaabi | `dept.mgr@gulftech.ae` | **No** | Oversees team attendance, approves team overtime, 1st leave approval. **Salary numbers hidden.** Scoped to Engineering department. |
| **General Manager** | Rashid Al-Falasi | `gm@gulftech.ae` | **Yes** | Final executive approval on pay runs, final settlements, and flagged leave requests. |
| **Finance** | Hassan Al-Balooshi | `finance@gulftech.ae` | **Yes** | Executes payments, marks pay runs as Paid, clearance of finance items, accounting ledger exports. |
| **Employee** | Ahmed Al-Mansoori | `employee@gulftech.ae` | **No** | Self-service only (`/me/*`): personal profile, own payslips, attendance, leave balance, leave & OT submissions. |

---

## 2. Phase 2: Login & Roles Architecture (Sections 5.1–5.4, FR-PL1–3)

### A. Authentication & Security
- **8-Hour Sessions**: Authenticated sessions issue an `httpOnly`, `SameSite=Lax` cookie `nextal_token` valid for 8 hours.
- **Account Lockout**: 5 consecutive failed login attempts trigger an automatic **15-minute account lockout** (`status: Locked`, HTTP 423 Locked).
- **Password Security**: Passwords are cryptographically salted and hashed with `bcrypt`.
- **Company Suspension Guard (FR-PL2)**: Users belonging to a suspended company cannot authenticate.

### B. Permissions Matrix (Section 5.3) & Salary Masking
- Enforced at both the **API middleware level** and the **UI level**:
  - `requirePermission(area, action)` blocks unauthorized API operations with HTTP 403 Forbidden.
  - `salaryMaskMiddleware` inspects response payloads and recursively strips sensitive salary fields (`basic`, `housing`, `transport`, `other_allowances`, `gross`, `net`) for any user where `sees_salary === false`.
  - In the UI, navigation menu items and dashboard cards dynamically hide or redact confidential figures.

### C. Approval Engine & Self-Approval Prevention
- Powered by `approval_flows`, `approval_flow_steps`, `approval_requests`, and `approval_actions`.
- **Strict Spec Rule**: **"Nobody approves their own request"**. If a requester attempts to approve their own request, the system blocks the action with HTTP 403 (`SELF_APPROVAL_FORBIDDEN`).

### D. Platform Admin Support Access Isolation (FR-PL3)
- Platform administrators cannot access client employee or salary records unless an active, unexpired, and unrevoked record exists in `support_access_grants`.

---

## 3. Project Structure

```
hr-payroll-management/
├── apps/
│   ├── api/                     # Node.js Express REST API
│   │   ├── prisma/              # 43-table schema and comprehensive seed data
│   │   ├── src/
│   │   │   ├── middleware/      # auth, permissions matrix, salaryMask, companyContext
│   │   │   ├── routes/          # auth, platform, users, approvals, employees, payroll
│   │   │   └── services/        # authService, companyService, userService, approvalService, auditService
│   │   └── test/                # Automated Node.js test suites (48 passing tests)
│   └── web/                     # Next.js 14 App Router Frontend
│       ├── src/
│       │   ├── app/             # /login, /platform/companies, /settings/users, placeholders
│       │   ├── components/      # Bento tiles, glassmorphic inputs, layout shells
│       │   └── context/         # AuthContext, LanguageContext (EN / AR RTL), Providers
├── packages/
│   └── shared/                  # Common formatters, types, validation constants
└── docs/
    └── spec.md                  # Complete v3.1 System Specification
```

---

## 4. Running Tests & Verifying

To run the complete automated test suite across all Phase 1 and Phase 2 requirements:

```bash
npm test --workspace=apps/api
```

### Verified Test Suites:
1. `API Skeleton & Middlewares Tests` (Health, Swagger UI, Helmet, Zod validation)
2. `Audit Log Service & Append-Only Database Protection Tests` (Triggers blocking UPDATE & DELETE on `audit_logs`)
3. `Company Tenant Isolation Tests` (AsyncLocalStorage context, cross-tenant leak prevention)
4. `Payslip Lines Calculation & Sum Integrity Tests` (42 payslips mathematical sum to 335,490.50 AED)
5. `Phase 2: Authentication, Roles, Permissions Matrix & Approval Engine Tests`:
   - 8-hour JWT `httpOnly` cookie login
   - 5-attempt 15-minute account lockout (HTTP 423)
   - Session expiry and tampered token rejection (HTTP 401)
   - Every row of Section 5.3 Permissions Matrix (HTTP 403 enforcement)
   - Salary fields absent from API responses for roles without salary access
   - Approval engine: self-approval blocked (HTTP 403)
   - Platform admin blocked from company data without support access grant (FR-PL3)
   - Company admin user invitation with multi-role assignment and department scoping
   - Bulk employee login creation

---

## 5. Development Server Commands

```bash
# Start backend API (Port 5000)
npm run dev --workspace=apps/api

# Start frontend Web App (Port 3000)
npm run dev --workspace=apps/web
```
