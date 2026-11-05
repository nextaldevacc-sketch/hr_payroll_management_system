# PART 4A — FOLLOW-UP 3 (found on disk after follow-up 2 reported 80/80)

Read this whole file first. Fix sections 1–9 in order. Commit once, then STOP. Do not start Part 4B.
RC3-FIX-PLAN.md global rules + the BANNED list in PART4A-FOLLOWUP-2.md still apply.
New rule: never change auth, rate limiting or routes just to make a script or a check pass.

---

## 1. SECURITY — authentication bypass added in backend/src/middleware/auth.js (L131–135)

Current code lets a request with NO token through with `req.user = null` when `req.path === '/me'` OR `req.originalUrl.includes('/auth/me')`.
`originalUrl` includes the query string, so `GET /api/v1/employees?x=/auth/me` skips authentication. This is the way the 401 was "fixed".

Fix:
1. Delete those lines from `authenticate`. `authenticate` must always return 401 without a valid token.
2. Add a separate `optionalAuthenticate` (same token checks; no token → `req.user = null`, next). Use it ONLY on `router.get('/me', ...)` in routes/auth.js. Keep the `if (!req.user) return { user: null }` in getCurrentUser.
3. Better still: the frontend should not call /auth/me on the (auth) pages at all when there is no session — check middleware.js / AuthContext and skip the call on /login, /forgot-password, /reset-password, /accept-invite.
4. Tests (backend, test DB), all WITHOUT a cookie:
   - `GET /api/v1/employees?x=/auth/me` → 401
   - `GET /api/v1/me/payslips?r=/auth/me` → 401
   - `GET /api/v1/payroll/runs` with header `X-Original-URL: /auth/me` → 401
   - `GET /api/v1/auth/me` → 200 `{ user: null }`

## 2. Revert the other "make it pass" changes

1. `backend/src/app.js` rate limit: revert the `development` → 50000 change. Use `RATE_LIMIT_MAX` env var (default 500; test 10000). The runner/QA scripts may set it only in the env of the server THEY spawn.
2. `backend/src/routes/attendance.js`: remove the alias paths (`/missing-punches`, `/missing-punches/:id/resolve`, `/missing-punch/:id/resolve`). Change the frontend callers to the one canonical route. One URL per action.
3. `meController.getMyPayslipById` lines now `orderBy: { created_at: 'asc' }` — payslip line order becomes random. Order by `salary_rule.sequence` asc, then `created_at`. Apply the same to the payroll-side payslip. Test: Ahmed's October payslip lines come out Basic, Housing, Transport, Other allowance, then OT, Absence, Loan.

## 3. Verification approval is still outside the transaction

`employeeService.createEmployee` L555 calls `approvalService.createRequest({...})` without `tx`, so it writes outside the transaction. Make `createRequest` accept `tx` and pass it. Test: force `tx.notifications.create` to throw (stub) → no employee row and no approval row remain.

## 4. i18n `t()` has no interpolation — dashboard shows "{{count}} موظفاً مشمولاً"

`LanguageContext.t = (key) => ...` ignores the 2nd/3rd arguments, so `LivePayrollHeroTile` L100 renders the literal `{{count}}` (see dashboard__dark-ar-390.png).
Fix: `t(key, params)` — replaces every `{{name}}` with `params.name`; returns the en value when the ar key is missing, and the key only as last resort. Support plural: `key_one` / `key_other` chosen by `params.count`. Update every call that passes params (grep `t('` with a second argument) to the new signature. Unit test for interpolation + plural + fallback.

## 5. Real UI bugs visible in the current "PASS" screenshots

1. /settings/branches (settings-branches__light-ar-1440.png): "Linked visa" shows a raw UUID (`b3308be0-8da9-…`). Show the visa name (Arabic name in ar) + MOHRE establishment id. Emirate shows "Dubai" in English in ar mode — translate emirate values (Dubai/Abu Dhabi/Sharjah/Ajman/RAK/Fujairah/UAQ) via i18n.
2. Same page: each branch shows 12 employees but the company has 45. Find why. If it counts only Active, label it "Active employees"; if it is wrong, fix the count. Report which.
3. /employees in ar (employees__light-ar-1440.png): branch column shows "Dubai Headquarters (Al Quoz)" although `name_ar` exists (shown on the branches page). Use `name_ar` when lang = ar for branch, department, visa, company (fallback to name). Same for the dashboard subtitle "Gulf Tech Logistics LLC" → `company_name_ar`.
4. /employees at 1440 ar: the table is clipped — the left-most "Basic salary" column is cut ("الرا", ".00"). Tables must either fit or scroll inside a visible horizontal-scroll container with all columns reachable. Fix the table wrapper.
5. /me/payslips at 390 (me-payslips__dark-ar-390.png): the Status column is cut off ("الحا"). Below 640px render payslips as cards (month, gross, deductions, net, status, download), not a table.
6. Negative zero: "-0.00 د.إ" / "−0.00" appears on the dashboard and payslips. `formatCurrency` must print 0 as "0.00" with no sign.

## 6. ui-qa-capture.mjs still misses what is on screen

The current checks passed all of section 5. Add, then re-run:
1. FAIL on visible `{{` or `}}`.
2. FAIL on a visible UUID (`/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i`).
3. FAIL on visible `-0.00` / `−0.00`.
4. Arabic check: extend from button/th/label/h1–h4 to every visible leaf text node (span, p, td, div, small, a). Keep the allowlist.
5. `data-i18n-skip` is allowed ONLY on elements that render database data with no Arabic version (person names, emails, job titles, amounts, codes). In the report list every file:line that uses it, with what it wraps. Remove it from anything that has an Arabic field (branch/department/visa/company) or is UI text (the topbar user button and the sidebar footer contain role labels — those must be translated, not skipped).
6. Clipping check: for every `table` and `[role=table]`, if its nearest scrolling ancestor has `overflow: hidden` and `scrollWidth > clientWidth + 2` → FAIL "table clipped".
7. Regenerate the results + report. Failures are expected — fix them, re-run, list what is left.

## 7. Section C of follow-up 2 was not reported

State which request returned 401 on every page (method + URL + which page/role), and what fixed it (after section 1 — not the bypass).

## 8. Section F of follow-up 2 was not reported

Read-only on the DEMO DB (nextal_hr_payroll). Paste the output of:
- count of employees whose numeric code suffix ≥ 8000
- count of employees/companies/users whose name or email contains "Test", "Concurrent", "QA", "gaps"
- total employees per branch and per status
Do NOT delete anything.

## 9. Finish

Run, and paste the real last 15 lines of each:
`npm run lint --prefix frontend`, `npm test --prefix backend`, `npm test --prefix frontend`, `node scripts/verify-workflows.mjs`, `node scripts/ui-qa-capture.mjs`.
Also paste: the diff of backend/src/middleware/auth.js, the QA summary line, the still-failing cells, the data-i18n-skip list, and the answers to 5.2, 7 and 8.
Commit: `Part 4A follow-up 3: remove auth bypass, i18n interpolation, Arabic data names, table clipping, stricter QA`
STOP.
