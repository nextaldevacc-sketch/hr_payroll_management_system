# RC3 Fix Plan — paste ONE part at a time into the agent

Read first, every part: `docs/reports/AUDIT-2026-10-31.md` (finding IDs A1…W6 below refer to it) and the spec `docs/HR Payroll Platform — Project Documentation v2.0.docx` (use `docs/spec.md` for text search).

Global rules for every part:
- Scope: the Nextal **platform admin is OUT of this release** (Phase 2). The **Company Admin stays** (the client's own administrator). Everything else in the spec is IN.
- No business logic in routes; follow docs/ARCHITECTURE.md. No manual DB edits; schema changes = new Prisma migration; demo data = seed only; tests use DATABASE_URL_TEST only.
- Every test has a timeout; no test leaves a server running (docs/TESTING.md).
- At the end of each part: run `npm test`, run `node scripts/check-demo-integrity.js` after a fresh demo `migrate reset`, commit with the given message, stop all servers, and report: what changed (file list), test counts, and anything you could NOT do. Then STOP and wait.

---

## PART 1 — Real login, logout and route protection (fixes A1–A11)

1. **Separate login page (A5).** Restructure `frontend/src/app` into route groups:
   - `app/(auth)/login/page.jsx`, `app/(auth)/forgot-password/page.jsx`, `app/(auth)/reset-password/page.jsx` (reads `?token=`), `app/(auth)/accept-invite/page.jsx` (reads `?token=`) — with `app/(auth)/layout.jsx` that has **no sidebar and no top bar**: a centred glass card on the themed background, language toggle and theme toggle in the card corner, Nextal logo, email, password (show/hide), "Forgot password?" link, Sign in button, error area. Both themes, en/ar RTL, works at 390 px.
   - Every other page moves under `app/(app)/…` with `app/(app)/layout.jsx` rendering `<AppShell>`. Root `app/layout.jsx` keeps only `<html>`, fonts and `<Providers>` — no AppShell.
2. **Remove all demo/persona code (A1–A4).** Delete `DEMO_USERS`, `switchDemoUser`, `demoUsers`, the auto-login `useEffect`, the offline fallback in `login()`, the "Switch Demo Persona" popover in `GlassSidebar.jsx`, and the `demo-personas-bar` in the login form. Grep the whole frontend for `DEMO_USERS|switchDemoUser|persona|Nextal@2026!` → must be **zero** matches (the password may only appear in the README/manual checklist, never in code).
3. **Session = server truth (A6, A7).**
   - `AuthContext`: initial `user = null`, `status = 'loading'`. On mount call `GET /api/v1/auth/me` with `credentials: 'include'`. 200 → set user; 401 → `user = null`, status `unauthenticated`.
   - Do **not** store the token in localStorage. Rely on the httpOnly `nextal_token` cookie. `apiClient` always sends `credentials: 'include'`. Remove `Authorization: Bearer` from the browser code.
   - Add `frontend/src/middleware.js`: if the `nextal_token` cookie is absent and the path is not under `/login|/forgot-password|/reset-password|/accept-invite|/_next|/favicon`, redirect to `/login?next=<path>`. If the cookie is present and the path is `/login`, redirect to the landing page.
   - In `(app)/layout.jsx`: while `status==='loading'` show a full-page skeleton; if `unauthenticated` → `router.replace('/login?next=…')`. Never render app content without a user.
   - Any API 401 (expired 8 h session, token_version bumped, account disabled) → clear the user, clear the React Query cache, redirect to `/login?reason=session_expired` and show "Your session expired, please sign in again" (en/ar).
4. **Login behaviour.**
   - `POST /auth/login` → on success, redirect to `next` (only if it is a relative path starting with `/` and not `//`), else by role: Employee-only users → `/me`; everyone else → `/` (dashboard).
   - Show the API's messages: wrong email/password (generic — never reveal whether the email exists), account locked (show minutes remaining, 5 attempts / 15 min), account disabled, company suspended.
   - Users with several roles get the union of permissions. There is **no role switcher anywhere**.
5. **Logout (A2).** Top-bar user menu → "Sign out": `POST /auth/logout` (server clears the cookie **and bumps token_version** so the old token is dead), clear the React Query cache and any in-memory state, `router.replace('/login')`. After logout the browser Back button must not show protected data (middleware + 401 handling cover it).
6. **Page-level guards (A9).** Each `(app)` page declares its required permission (e.g. `requirePermission('pay_runs','view')`). Users without it see a designed **403 page** ("You don't have access to this page" + back to your home), not a blank page or other data. `canAccess()` must default to **deny**. The sidebar shows only permitted items (it already filters; keep it in sync with the same permission table from `shared/`).
7. **API URL (A8).** Use `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api/v1`) through `apiClient` everywhere; zero `localhost:5000` in `frontend/src`.
8. **Platform admin off (Phase 2).** Add `FEATURE_PLATFORM_ADMIN=false` (backend `.env.example`) and `NEXT_PUBLIC_FEATURE_PLATFORM_ADMIN=false`. When false: the API refuses platform-admin login with "Not available in this release", `/api/v1/platform/*` returns 404, the `/platform/*` pages 404, and no platform UI appears. Keep the code. Add `scripts/create-company.js` (CLI: name en/ar, trade licence, admin email → creates the company with UAE defaults and an invited Company Admin) so companies can still be provisioned. In the acceptance table mark **T1** and FR-PL1–3 as `DEFERRED (Phase 2 – platform admin)`; T2 (company isolation) must still pass.
9. **Logins for every employee (A11).** The seed creates a login for **every active employee** of both companies (`<code-lowercase>@gulftech.ae`, e.g. `emp-dxb-043@gulftech.ae`; keep `employee@gulftech.ae` for Ahmed), password `Nextal@2026!` (demo only), role EMPLOYEE, linked to the employee record. Role users stay as they are (admin, hr.mgr, hr.officer, payroll, dept.mgr, gm, finance). Add the full list to `docs/MANUAL-TEST-CHECKLIST.md`.
10. **Reset / invite (A10).** `forgot-password` page → `POST /auth/forgot-password` (always shows the same "If the email exists we sent a link" message). Dev mailer writes the email to `backend/storage/email-dev/` with a link `http://localhost:3100/reset-password?token=…`. `reset-password` and `accept-invite` pages validate the token, enforce a password policy (min 10 chars, letters + numbers), then redirect to `/login` with a success message.

Tests (Playwright, frontend, against the seeded **test** DB, each with timeouts):
- Unauthenticated visit to `/`, `/payroll`, `/me` → redirected to `/login?next=…`; the login page has **no sidebar** (assert the sidebar element is absent).
- Login as each role → lands on the right page; Employee lands on `/me`.
- Wrong password → generic error; 5 wrong → locked message.
- Logout → back to `/login`; pressing Back and reloading does not show data; the old cookie value used directly on `/auth/me` → 401.
- Expired/invalidated session → redirected with the session-expired message.
- Employee typing `/payroll` → 403 page; HR Officer typing `/payroll` → 403 page.
- Grep test: zero `DEMO_USERS|switchDemoUser|persona` and zero `localhost:5000` in `frontend/src`.
Commit: `Part 1: real login/logout, separate auth pages, route guards, platform admin disabled`.

---

## PART 2 — Server permissions, jobs and missing features (fixes P1–P10, J1–J2, W2–W6)

1. **Payslips (P1).** `GET /payroll/payslips/:id`, `/runs/:runId/payslips/:id`, `/pay-runs/:runId/payslips/:id`, `/payslips/:id/pdf`: allowed only for salary roles (Payroll Officer, HR Manager, GM, Finance) **or** the employee who owns the payslip **and** only if its run is `Paid`. Everyone else → 403. Log every payslip PDF download in audit_logs.
2. **Separations (P2, P3).**
   - list / view: HR Officer, HR Manager, Payroll Officer (view), GM (view); Department Manager sees only separations of their own team (to clear their items); Finance sees only those with Finance clearance items. Employees: no access (403).
   - create (record resignation/termination): HR Officer, HR Manager.
   - approve / reject the separation: **HR Manager only**.
   - clearance item clear: only the item's owner role (Dept Manager for department items, Finance for finance items, HR Officer/HR Manager for HR items, Admin/IT owner for IT/Admin items) — HR Manager can approve the checklist.
   - Remove the `|| ['HR_MANAGER']` fallback; missing roles = no access.
3. **Final settlement steps (P4)** — enforce by role, plus "not the same user as the previous step":
   calculate/prepare = Payroll Officer · validate = HR Manager · approve = GM · mark paid = Finance. HR Officer may *initiate* the exit (Part 2.2) but sees no amounts.
4. **Employees (P5, P6).** `POST /employees/:id/verify` → `employees:verify` (HR Manager only). Contract versions: create = Payroll Officer; HR Manager approves a new contract version before it takes effect (add `status` Pending/Approved on contracts via migration if missing; payroll uses only Approved versions); GM and Finance view only.
5. **Users & Roles (P7):** Company Admin only. **Company Admin matrix (P8):** settings (all), users & roles, approval settings, departments/branches/visas, audit view, dashboard (no salary tiles). Remove pay-run and settlement actions and salary visibility from COMPANY_ADMIN; those come only from holding Payroll/HR Manager/GM/Finance roles.
6. **Pay-run segregation (P9):** the user who calculated cannot validate; the validator cannot approve/lock; the approver cannot mark Paid. Tests for each.
7. **Approvals (P10):** `/approvals/requests/:id/action` must check that the acting user holds the role of the **current step** from Approval Settings and is not the requester; `/approvals/pending` returns only items for the user's roles (and the Dept Manager's own team). Tests.
8. **Scheduled jobs (J1).** In `backend/src/jobs/scheduler.js`, register with `node-cron` (timezone `Asia/Dubai`), started from `server.js` when `ENABLE_JOBS=true` (default true; tests set false):
   - 01:00 daily — document expiry status + 90/60/30 reminders (FR-CO2–CO4)
   - 01:30 daily — archive leavers whose settlement is approved and final working date passed, deactivate login, open cancellation tasks (FR-OF6–OF7)
   - 02:00 on the 1st of each month — leave accrual (FR-TO5)
   - Each job is idempotent, writes one audit row per run, and logs start/end. Document the backup cron in DEPLOYMENT.md (J2). Add an admin-only `POST /api/v1/jobs/:name/run` (Company Admin, for testing) — logged.
9. **Separation tasks (W2, FR-OF7):** API `GET /separations/:id/tasks`, `PATCH /separation-tasks/:id` (HR Officer/HR Manager: status Open → In Progress → Done, reference number, completion date, note). UI: a "Cancellation Tasks" section on the separation detail and an HR list with filters. Audit-logged.
10. **Secure documents (W3, FR-EM5):** encrypt files at rest with AES-256-GCM (key from `DOCUMENT_ENCRYPTION_KEY`, 32 bytes, validated at startup), decrypt on download; migrate existing seed files at seed time. Log every document view and download in audit_logs (who, which document, when).
11. **Payslip email (W4, FR-PY10):** when a run is marked Paid, email each employee "Your payslip for <month> is available" with a link to `/me/payslips` (dev mailer to `backend/storage/email-dev/`). No PDF attachment (salary data stays behind login).
12. **Polish:** Variances tab label uses the Settings threshold (W5). Startup log prints the real Swagger path `/api/docs` (W6).

Tests: a permission test **for every route** generated from the 5.3 matrix — for each of the 7 company roles + Company Admin, call each endpoint and assert 2xx vs 403 per the spec. Plus tests for items 1–11.
Commit: `Part 2: server permissions per spec 5.3, segregation, scheduled jobs, cancellation tasks, encrypted documents`.

---

## PART 3 — Role-by-role login and access verification (Playwright, through the real UI)

For EACH user — `admin@gulftech.ae` (Company Admin), `hr.mgr@`, `hr.officer@`, `payroll@`, `dept.mgr@`, `gm@`, `finance@`, `employee@gulftech.ae` (Ahmed) and one more employee login — do and screenshot:
1. Open `/` logged out → lands on the separate login page (no sidebar).
2. Sign in with email + password → correct landing page.
3. Sidebar shows exactly the menu items allowed by spec 5.3 (write the expected list per role in the test and assert it).
4. Open 3 URLs the role must NOT access by typing them → 403 page; and 3 it must access → content loads.
5. Salary figures: visible only for Payroll, HR Manager, GM, Finance (dashboard tiles, employee profile salary/bank tabs, offboarding amounts).
6. Sign out → login page; Back button does not show data.
Write `docs/reports/role-access-verification.md`: one table per role (expected vs actual, PASS/FAIL, screenshot path). Open each screenshot and describe only what is visible. Fix anything that fails, re-run, then commit `Part 3: role-by-role login and access verified`.

---

## PART 4 — Every workflow in spec Section 7, in spec order, done by the right person

Run each workflow through the **UI** on a fresh demo DB, logging in as the role the spec names for each step (log out between roles). Screenshot every step. Use the **spec's numbering exactly**:

- **7.1 Company onboarding** (platform steps 1–2 = `scripts/create-company.js`): Company Admin sets company profile & visas, branches, departments & jobs, shifts & attendance policies, leave types & accrual plans, public holidays, salary rules & structures, approval settings, users & roles; invites users; a trial user logs in via the invite link.
- **7.2 New employee setup**: HR Officer creates (Pre-Joined) → HR Manager verifies (also: send back with comment, then re-verify) → Payroll Officer enters contract version → HR Manager approves it → HR uploads passport/visa/EID/labour card with expiry + owner → HR assigns shift, policy, device code, leave approver → Payroll adds bank (IBAN validated) → activation check blocks while bank is missing (T27) → New Joined/Active → employee receives invite and logs in to `/me`.
- **7.3 Attendance**: HR imports the biometric file (re-import adds nothing, T4) → exceptions flagged → HR fixes a missing punch with a reason; an employee submits a missing-punch request → OT request auto-created → Dept Manager approves as normal / night / rest-day / holiday / substitute day / refuse → Dept Manager confirms team month → HR confirms → only confirmed days and approved OT appear in payroll inputs; unapproved OT moves to next month (T10, T34).
- **7.4 Leave request**: employee applies (full day and half day, attachment where required) → balance + overlap checks, holidays/weekends excluded (T31) → Dept Manager approves → HR approves → GM approves when flagged (T15) → balance reduced → marked on attendance with pay band → cancellation restores balance (T32); 4-month employee blocked (T16); 8-month employee has 16 days (T17).
- **7.5 Monthly payroll**: Payroll Officer sets cut-off → validation shows blocking errors (missing IBAN blocks calculation, T28) → calculate → variance reasons required above threshold (T29) → HR Manager validates → GM approves → locked → SIF only from the locked run (T30), SIF totals match → payslips generated → Finance marks Paid → employees emailed → Ahmed sees October payslip net **7,044.80** in `/me/payslips` (T19); a correction after lock goes to a later run (T20); an unapproved adjustment is ignored (T37).
- **7.6 Offboarding**: HR Officer records resignation → HR Manager approves → clearance items cleared by each owner (laptop not cleared blocks approval, T35) → Payroll Officer calculates (Omar: gratuity 32,547.95, encashment 2,367.12; Sara 12,082.19; 11-month employee = 0, T23) → HR Manager validates → GM approves → Finance pays → after the final working date the job archives the employee, login is refused (T36), cancellation tasks appear and HR completes them.
- **7.7 Compliance documents**: a document expiring in 85 days shows Expiring Soon and reminders go to the owner and HR (T25) → owner uploads the renewal → HR verifies → status Valid; an expired document shows Expired.

Then write `docs/reports/FR-TRACEABILITY.md`: **every one of the 77 FR IDs and 13 NFR IDs** from the spec (FR-PL1…FR-X4, NFR-1…NFR-13) with: where it is implemented (file), how it is tested (test name), and status PASS / DEFERRED (Phase 2, platform admin only) / FAIL. No FR may be left FAIL — fix it.
Write `docs/reports/workflow-verification.md` in spec order with every step, the role used, PASS/FAIL and screenshot path. Re-record the 3 demo videos (company setup by Company Admin, a payroll month, a final settlement) using real logins — **no persona switching**.
Commit: `Part 4: spec Section 7 workflows verified in spec order + FR traceability`.

---

## PART 5 — Clean handover state

1. Fresh `migrate reset` of the demo DB; run the jobs once via the job runner; run `scripts/check-demo-integrity.js` → 0 violations; confirm Gulf Tech 44 employees, the spec examples (Ahmed, Sara, Omar) exactly as in the spec.
2. Update `docs/MANUAL-TEST-CHECKLIST.md`: the login list (every role + every employee login), and for each spec workflow 7.1–7.7 the click-by-click steps with **which user to log in as**, plus expected values (Ahmed 7,044.80 etc.).
3. Update README (start commands, `NEXT_PUBLIC_API_URL`, `ENABLE_JOBS`, `DOCUMENT_ENCRYPTION_KEY`, `FEATURE_PLATFORM_ADMIN`), user guides (remove any persona-switch instructions; Platform Admin guide marked Phase 2), CHANGELOG, KNOWN-LIMITATIONS (platform admin = Phase 2).
4. Full `npm test`, production build, regenerate the acceptance table from raw output (T1 DEFERRED, all others PASS).
5. Commit `Release candidate 3: secure login, full company workflow verified`, tag `v1.0.0-rc3`, stop all servers, report.
