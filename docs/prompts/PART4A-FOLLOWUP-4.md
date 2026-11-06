# PART 4A — FOLLOW-UP 4: Company Visa & Branch workflow + fake-data removal + remaining Arabic

Read this whole file AND docs/workflows/VISA-AND-BRANCH-WORKFLOW.md before changing code.
That workflow doc is the specification for sections A–C. Fix A–F in order. Commit once, then STOP. Do not start Part 4B.
Rules from RC3-FIX-PLAN.md, the BANNED list in PART4A-FOLLOWUP-2.md and the "never change auth/routes to make a check pass" rule still apply.

Verified OK from follow-up 3 (do not redo): auth bypass removed + optionalAuthenticate only on GET /auth/me + bypass tests; RATE_LIMIT_MAX env; attendance aliases removed; payslip lines ordered by salary_rule.sequence; createRequest uses tx; t() interpolation.

---

## A. Role scope by Company Visa and Branch is not enforced (spec 5.3, A.3.8)

Evidence:
- Backend only uses `scope_type === 'Department'` (employeeService L57, L412). A user whose role is scoped `CompanyVisa` or `Branch` sees the whole company.
- frontend/src/context/VisaContext.jsx looks for `scope_type === 'VISA'`, but the stored value is `CompanyVisa` — the "locked to one visa" branch never runs.

Fix:
1. One backend helper `backend/src/services/scopeService.js` → `resolveDataScope(viewer)` returns `{ all: true }` or `{ visaIds: [...], branchIds: [...], departmentIds: [...] }` from the viewer's role assignments (union across roles; any Company-scoped role → all).
2. Apply it in the SERVICE layer to every employee-linked query: employees (list, detail, export), attendance, leave requests/balances, overtime, documents/compliance, separations/settlements, pay runs (list/detail/payslips/SIF/register — Branch-scoped users read-only, own branch rows only), dashboard, reports, approvals inbox. A record outside scope → 404 (not 403, do not reveal it exists). The top-bar `company_visa_id` filter is applied ON TOP of the scope, never instead of it; a visa outside scope → 400 INVALID_VISA.
3. Fix VisaContext: `scope_type === 'CompanyVisa'`. `visas` shown in the selector = only visas inside the user's scope. "All Company Visas" only for Company-scoped users with >1 visa.
4. Users & Roles screen: when scope = CompanyVisa/Branch/Department, a Select with that company's visas/branches/departments is required (server validates the id belongs to the company).
5. Seed one scoped demo user (backend/prisma/seed/demoUsers.js): `hr.difc@gulftech.ae`, role HR_OFFICER, scope CompanyVisa = Visa 02. Add it to README demo-user table (password stays only in README/docs).
6. Tests (test DB): hr.difc lists only Visa 02 employees; GET /employees/<Ahmed id> → 404; GET /payroll/runs → only Visa 02 runs; GET /employees?company_visa_id=<Visa 01> → 400; a Branch-scoped user sees only that branch.

## B. Visa / branch settings rules (workflow V1–V6, V10, V11)

1. V5: `settingsService.updateBranch` (L430–445) lets the branch's `company_visa_id` change while it has employees → employees end up on a branch of another visa. Block with 400 `BRANCH_HAS_EMPLOYEES` when employee count > 0. On create and update, validate the visa belongs to the caller's company.
2. V6: branch delete also blocked while it has branch-only public holidays.
3. V1: duplicate MOHRE ID → 400 with `field: 'mol_establishment_id'` shown under the input. Routing code must be exactly 9 characters.
4. V2: on pay-run LOCK, copy the visa's `mol_establishment_id` and `bank_routing_code` onto the pay run (new nullable columns, NEW migration). SIF generation reads those copied values, not the live visa. Test: lock run, edit visa routing code, regenerate SIF → still the old code.
5. V9 (transfer between visas) is an OPEN client decision. For now: updating `company_visa_id` of an employee who appears in ANY pay run → 400 `VISA_TRANSFER_NOT_SUPPORTED` with a clear message; allowed while Pre-Joined/New Joined with no payslip. Do NOT build a transfer flow.
6. V8: branch change within the same visa from the employee profile = effective date + reason, HR Manager approval through approvalService (request type `EMPLOYEE_BRANCH_CHANGE`), audit row. If an existing simpler edit path exists, route it through this.
7. V10: confirm leaveService L146 and attendanceService L270/L351 both apply `branch_id` (empty = all branches). Add a test: holiday for DIFC branch only → a DIFC employee's leave over that day does not consume a day and is not absent; a Dubai HQ employee is expected to work.
8. V11: test that a second Regular run for the same visa+month is rejected with a readable error (unique index already exists — map P2002 to 409 `PAY_RUN_EXISTS`).
9. Settings → Branches page: group branches under their visa heading (Visa name + MOHRE ID), branch cards show Arabic name in ar, emirate translated, active employee count from API.

## C. Runner: add workflow "VB" (steps V-1 … V-10 from the workflow doc, section 6)

Add to scripts/verify-workflows.mjs after 7.1, same rules as every other step: log in as that role, use the visible UI, hard asserts, screenshot `docs/reports/screenshots/workflow/VB-<n>-<ROLE>.png`. API calls are allowed ONLY for the "forged request" checks (V-5 mismatch, V-7 URL access, V-10 transfer block) and must assert the exact status + code. The report lists VB steps separately.

## D. Fake / hard-coded data still in the frontend

Evidence:
- `frontend/src/services/settingsApi.js` L29–55: on 401/403 or network error it RETURNS `INITIAL_*` demo data from settingsData.js. A user without permission sees fake settings and "saves" go nowhere.
- `settings/branches/page.jsx` L16 and `settings/visas/page.jsx` L16–21 default to `INITIAL_BRANCHES` / `INITIAL_COMPANY_PROFILE` (fake branches "Dubai Logistics Hub", "Sharjah Industrial…" with fake visa ids `v1000000-…`) while loading.
- `UsersAndRolesFeature.jsx` L71–120: on fetch failure shows a hard-coded user list (Tariq Al-Hashemi, …).
- `EmployeeListFeature.jsx` L219 `100%` and L247 `10` are literal numbers shown as real metrics ("Status Coverage", "Document Alerts"); L210 default "Gulf Tech Workforce".
- `app/(app)/page.jsx` L204/406/440 and `VisaContext.jsx` fall back to the literal company names "Gulf Tech Logistics LLC" / Arabic name.
- `PayrollAlertsDrawer.jsx` L21 default recipients are real demo emails.
- Placeholders "name@gulftech.ae", "salem@gulftech.ae" in login/forgot-password/wizard.

Fix:
1. Remove every fallback-to-demo-data path. Loading → skeleton. Error → error state with Retry. 401 → session expired flow. 403 → AccessDenied403. No `INITIAL_*` constants imported anywhere in frontend/src except as form defaults for a brand-new empty form (e.g. default UAE leave types offered in the onboarding wizard — label them "UAE defaults").
2. Tiles show real numbers from the API (document alerts = documents expiring ≤ 90 days in scope; status coverage = real %). If no endpoint gives it, add it to the employee list response meta.
3. Company name comes only from the session (`company_name` / `company_name_ar`). No literal company name in frontend/src.
4. Placeholders → `name@company.ae`.
5. Extend frontend/test/no-demo-code.test.js: FAIL if frontend/src contains `gulftech`, `Gulf Tech`, `الخليج للتقنية`, `Tariq Al-Hashemi`, `v1000000-`, or imports `INITIAL_` outside the allowed onboarding-default file. Delete `DEMO_PRESETS_DATA` if unused. `PlatformCompaniesFeature.jsx` mock data: platform admin is disabled this release — remove the mock list (show the feature-disabled state).

## E. Finish the 28 failing Arabic QA cells (follow-up 3 stopped with them open)

1. Enum values shown to users go through one translation map `frontend/src/i18n/enums.js` (en + ar): employee status, document status, document types (EMIRATES_ID, LABOUR_CARD, PASSPORT, VISA…), separation reasons (Resignation, Termination…), clearance status, pay run status and type (Draft…Paid, Regular, Correction), leave types, role names, permission levels ("Full Access"…), audit actions (DOCUMENT_VIEW…), report/export names ("CSV Journal (Balanced)"), "+1 net this month" (pluralised i18n). Remove `data-i18n-skip` from audit `log.action` — translate it.
2. Person names: when lang = ar show `arabic_name` (spec FR-EM1 / payslip) with English fallback — employee lists, profile, /me ("Ahmed Al-Mansoori" must show his Arabic name), approvals, payroll rows, offboarding, compliance, top bar/sidebar. Keep data-i18n-skip only for the English fallback. If the seed employee has no arabic_name, add it in the seed.
3. QA data: "Test Joiner 2938" appears because the QA sweep runs on a test DB already used by the runner. ui-qa-capture.mjs must reset + seed the test DB itself first (same as the runner) so screenshots show the demo seed only.
4. Re-run until 0 failing cells, or list each remaining one with the reason it cannot be fixed.

## F. Finish

Run and paste the real last 15 lines of each: `npm run lint --prefix frontend`, `npm test --prefix backend`, `npm test --prefix frontend`, `node scripts/verify-workflows.mjs` (must now include VB steps), `node scripts/ui-qa-capture.mjs`.
Also paste: list of files where scope is applied (A.2), the QA summary line, remaining failing cells.
Commit: `Part 4A follow-up 4: visa/branch scope + rules, VB workflow, remove demo fallbacks, Arabic enums and names`
STOP.
