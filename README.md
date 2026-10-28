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
├── frontend/                    # Next.js 14 App Router Frontend
│   ├── public/                  # Static assets and fonts
│   ├── src/
│   │   ├── app/                 # Next.js routes only (thin pages that compose features)
│   │   ├── components/
│   │   │   ├── primitives/      # GlassCard, BentoGrid, BentoTile, DataTable, Modal, Drawer...
│   │   │   ├── layout/          # AppShell, GlassSidebar, GlassTopBar, ModulePlaceholder
│   │   │   └── features/        # dashboard/, auth/, platform/, settings/, employees/
│   │   ├── services/            # API clients per module (apiClient, authApi, settingsApi, employeesApi)
│   │   ├── hooks/               # React hooks & queries
│   │   ├── context/             # AuthContext, LanguageContext (EN / AR RTL), Providers
│   │   ├── i18n/                # en.json, ar.json
│   │   ├── lib/                 # formatters, constants, client-only utilities
│   │   └── styles/              # globals.css (design system CSS tokens)
│   └── test/                    # Production bundle protection & Playwright E2E persistence
├── backend/                     # Node.js Express REST API
│   ├── prisma/
│   │   ├── schema.prisma        # 43-table PostgreSQL schema
│   │   ├── migrations/          # Schema migrations & database triggers
│   │   └── seed/                # Modular seeds (organisation, settings, employees, attendance, payroll)
│   ├── src/
│   │   ├── config/              # Zod environment loading & app constants
│   │   ├── routes/              # Thin Express routers
│   │   ├── controllers/         # HTTP request/response handlers
│   │   ├── services/            # Core business logic services
│   │   ├── validators/          # Zod validation schemas
│   │   ├── serializers/         # Role-aware output & salary/bank masking
│   │   ├── middleware/          # auth, permissions, companyContext, audit, errorHandler
│   │   ├── jobs/                # Nightly document expiry & monthly accruals
│   │   ├── lib/                 # prisma client, storage, mailer, pdf, excel
│   │   └── server.js            # Express server initialization
│   ├── storage/                 # Uploaded files (.gitkeep)
│   └── test/                    # Integration & unit test suites (105 tests)
├── shared/                      # Statutory formulas, UAE IBAN, employee utils, constants
└── docs/                        # Specifications, ARCHITECTURE.md, TESTING.md, screenshots
```

---

## 4. Running Tests & Verifying

To run the complete automated test suite across all workspaces:

```bash
npm test
```

Or run individual workspace test suites:
```bash
npm test --workspace=shared     # 43 unit tests
npm test --workspace=backend    # 105 integration & unit tests
npm test --workspace=frontend   # 3 production bundle & Playwright E2E tests
```

---

## 5. Development Server Commands

```bash
# Start backend API (Port 5000)
npm run dev --workspace=backend

# Start frontend Web App (Port 3000)
npm run dev --workspace=frontend
```
