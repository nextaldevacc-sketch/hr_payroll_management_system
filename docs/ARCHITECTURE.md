# Nextal Platform Architecture & Repository Structure

This document details the architectural layout, modular separation of concerns, layer boundaries, and the request lifecycle across the Nextal HR & Payroll Management repository.

---

## 1. Monorepo Layout & Workspace Responsibilities

```
hr-payroll-management/
├── frontend/                      ← Next.js 14 Web Application
│   ├── public/                    ← Static fonts, assets, and branding
│   ├── src/
│   │   ├── app/                   ← Next.js routes only (thin pages that compose features)
│   │   ├── components/
│   │   │   ├── primitives/        ← GlassCard, BentoGrid, BentoTile, IconWell, InsetBox,
│   │   │   │                         ListDivided, CalloutBar, StatNumber, StatusPill, Stepper,
│   │   │   │                         DataTable, Modal, Drawer, form/
│   │   │   ├── layout/            ← AppShell, GlassSidebar, GlassTopBar, ModulePlaceholder
│   │   │   └── features/          ← Feature modules: dashboard/, auth/, platform/, settings/,
│   │   │                             employees/, attendance/, leave/, payroll/
│   │   ├── services/              ← API client per module: apiClient.js, authApi.js,
│   │   │                             settingsApi.js, employeesApi.js...
│   │   ├── hooks/                 ← useThemeColor, query hooks per domain
│   │   ├── context/               ← AuthContext, LanguageContext (EN/AR RTL), Providers
│   │   ├── i18n/                  ← en.json, ar.json
│   │   ├── lib/                   ← formatters, client constants, mock data (dev only)
│   │   └── styles/                ← globals.css (design tokens, glassmorphism, themes)
│   ├── test/                      ← Bundle protection & Playwright E2E persistence
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── backend/                       ← Node.js Express REST API
│   ├── prisma/
│   │   ├── schema.prisma          ← 43-table PostgreSQL schema
│   │   ├── migrations/            ← Schema migrations & append-only DB triggers
│   │   └── seed/                  ← Modular seed runner:
│   │       ├── index.js           ← Master orchestrator
│   │       ├── organisation.js    ← Companies, visas, branches, departments, jobs
│   │       ├── settings.js        ← Shifts, attendance policies, salary rules, leave types
│   │       ├── employees.js       ← 42 Gulf Tech employees + contracts + docs + banks
│   │       ├── attendance.js      ← Shifts assignments, punches, attendance_days
│   │       ├── payroll.js         ← October 2026 pay run, 42 payslips, salary lines
│   │       └── demoUsers.js       ← 9 demo persona accounts (bcrypt hashed)
│   ├── src/
│   │   ├── config/                ← Environment loading & Zod schema validation
│   │   ├── routes/                ← Thin Express router definitions per module
│   │   ├── controllers/           ← HTTP request/response handlers (no business logic)
│   │   ├── services/              ← Domain business logic per module
│   │   ├── validators/            ← Zod schemas for input validation
│   │   ├── serializers/           ← Role-aware allowlists (salary/bank/ID masking)
│   │   ├── middleware/            ← auth, permissions, companyContext, audit, errorHandler
│   │   ├── jobs/                  ← Scheduled background jobs (nightly expiry, monthly accruals)
│   │   ├── lib/                   ← prisma client, storage, mailer, pdf, excel
│   │   ├── docs/                  ← OpenAPI / Swagger documentation
│   │   ├── app.js                 ← Express application configuration
│   │   └── server.js              ← Server bootstrapping and listener
│   ├── storage/                   ← Uploaded documents (gitignored, kept via .gitkeep)
│   ├── test/
│   │   ├── unit/                  ← Unit tests (serializers, jobs, calculations)
│   │   └── integration/           ← End-to-end API integration tests
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── shared/                        ← Shared library (@nextal/shared)
│   ├── src/
│   │   ├── calculations/          ← AST formula parser, statutory worked examples, money math
│   │   ├── utils/                 ← UAE IBAN validator, employee lifecycle utils, masking
│   │   └── constants/             ← Roles, statuses, UAE default statutory rules
│   ├── test/                      ← Unit tests for formulas, IBAN, and employee rules
│   └── package.json
│
├── docs/                          ← System specifications, architecture, and verification
├── scripts/                       ← Screenshot capture and cross-module verification scripts
├── docker-compose.yml             ← Container orchestration (Postgres, API, Web)
├── package.json                   ← Root npm workspace declaration
└── README.md
```

---

## 2. Core Architectural Invariant

> [!IMPORTANT]
> **Business Logic Isolation Rule**:
> **Business logic MUST reside ONLY in `backend/src/services/` or `shared/src/`.**
> 
> - **Routes (`backend/src/routes/`)**: Strictly define URI endpoints, bind HTTP verbs, and wire middleware.
> - **Controllers (`backend/src/controllers/`)**: Strictly parse request parameters, validate inputs via Zod, invoke the appropriate service method, and format the HTTP response. Controllers MUST NOT execute database queries or implement business rules.
> - **Frontend Pages (`frontend/src/app/`)**: Thin Next.js pages that simply compose feature components located in `frontend/src/components/features/`.

---

## 3. End-to-End Request Flow

Every incoming HTTP request traverses a strictly sequential pipeline:

```
[ Client Request ]
       │
       ▼
1. Route Layer (`routes/*.js`)
   - Matches URL pattern and HTTP method
   - Chains route-level middleware
       │
       ▼
2. Middleware Layer (`middleware/*.js`)
   - `authenticate`: Validates JWT session cookie, populates `req.user`
   - `companyContext`: Resolves active tenant, enforces tenant isolation via AsyncLocalStorage
   - `requirePermission`: Enforces Section 5.3 Permissions Matrix (Role-Based Access Control)
   - `validate`: Runs Zod request validation against body / params / query
       │
       ▼
3. Controller Layer (`controllers/*Controller.js`)
   - Extracts validated parameters (`req.companyId`, `req.params`, `req.body`, `req.user`)
   - Dispatches call to corresponding service method
       │
       ▼
4. Service Layer (`services/*Service.js`)
   - Encapsulates all domain business logic, validation workflows, and state machines
   - Calls `@nextal/shared` for statutory formulas, UAE IBAN validation, or money math
   - Manages transactions, locked-period immutability checks, and audit logging
       │
       ▼
5. Persistence Layer (`lib/prisma.js` / ORM)
   - Executes queries via scoped multi-tenant Prisma extension (`scopedPrisma`)
   - Enforces automatic `company_id` tenant filtering on every database operation
   - PostgreSQL triggers protect immutable tables (`audit_logs`) from UPDATE / DELETE
       │
       ▼
6. Serializer Layer (`serializers/index.js`)
   - Applies strict per-resource allowlists
   - Masks or completely strips salary & bank information for users without statutory salary roles:
     `['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE']`
   - Masks sensitive Emirates ID and Passport numbers for non-HR viewers
   - Deep-scans outbound payloads to guarantee zero data leakage
       │
       ▼
[ Client Response (HTTP 200/201/...) ]
```

---

## 4. Multi-Tenant Isolation (Rule F)

Tenant safety is guaranteed at multiple layers:
1. **AsyncLocalStorage Context**: Every authenticated request binds `company_id` to the request's execution context.
2. **Prisma Client Extension**: Automatically injects `where: { company_id }` into all queries and creates; queries without a tenant scope throw a runtime exception.
3. **Cross-Tenant Guard**: Endpoints explicitly verify that requested entity IDs belong to the active company before returning or mutating data.
4. **Platform Admin Boundary**: Platform Admins have zero visibility into tenant records unless an unexpired `support_access_grants` record has been issued by the company admin.

---

## 5. Database Integrity & Migration Rules

> [!IMPORTANT]
> **Database & Schema Invariants**:
> - Never change the database schema or data by hand.
> - Never bypass a trigger or the status flow, not even temporarily.
> - Schema changes go in a NEW Prisma migration. Applied migration files are never edited.
> - Demo data comes only from backend/prisma/seed/.
> - Test data is created inside the test that needs it.

