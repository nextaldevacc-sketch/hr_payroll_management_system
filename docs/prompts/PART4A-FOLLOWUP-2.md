# PART 4A — FOLLOW-UP 2 (found on disk after follow-up 1)

Read this whole file before touching code. Fix sections A–F in order. Commit once at the end, then STOP.
RC3-FIX-PLAN.md global rules still apply. Do not start Part 4B.

BANNED in scripts/verify-workflows.mjs and scripts/ui-qa-capture.mjs from now on:
- `if (element) { ... }` / `if (await x.count())` around an action — a missing element must FAIL the step, never skip it.
- `console.log(...)` used as the "check" — every check is an assert/throw.
- Selecting hidden `<select>` elements — click the visible control the user clicks.
- Setting `dir`, `lang`, `data-theme`, `.dark` or localStorage from the script to fake a state the app should set itself.

---

## A. Runner step 7.1-8 (visa filter) is a no-op — it passes while doing nothing

Evidence: it looks up `#topbar-visa-select`. That id does NOT exist anywhere in frontend/src (the real control is `#btn-company-visa-switcher`). Because everything is wrapped in `if (visaSelect)`, the step skips all actions, only logs, and returns PASS. Its screenshot also goes to `screenshots/workflows/wf-7.1-08-visa-filter.png`, not the required `screenshots/workflow/7.1-8-HR_MANAGER.png`.

Fix (rewrite the step):
1. Log in as hr.mgr@gulftech.ae, open /employees, wait for the table.
2. Click `#btn-company-visa-switcher`, click the option whose visible text contains the Visa 02 name. Wait for the network request containing `company_visa_id=<visa02 id>` to finish (page.waitForResponse) — assert it was sent.
3. Assert: table has ≥1 row; EVERY row's branch cell = "DIFC FinTech Hub"; no row contains "EMP-DXB-043" (Ahmed, Visa 01). Screenshot `7.1-8a-HR_MANAGER.png`.
4. Switch to "All Company Visas". Assert a row with EMP-DXB-043 is present (search box if paginated). Screenshot `7.1-8b-HR_MANAGER.png`.
5. Reload the page — assert the selection persisted.
6. Also fix step 7.2-3: the `if (bell)` skip (L829). Read the bell badge count BEFORE the officer creates the employee and AFTER; assert it went up by ≥1; open the dropdown and assert the text "Pending Verification" + the new employee code is visible.
7. Grep the whole runner for any other `if (` that guards a page action or a `$()` lookup and convert each to a hard assert. List every one you changed (line numbers) in your final message.

## B. ui-qa-capture.mjs fakes its own checks

Evidence:
- L241–254 and L270–281: the script itself sets `dir`, `lang`, `data-theme` and `.dark` on <html>, then "checks" `dir === 'rtl'`. That check can never fail.
- Console errors are collected but not used for pass/fail. All 64 cells contain `401 (Unauthorized)` and are still marked PASS. Hydration and 404 errors are filtered out entirely.
- Every page, including /me, is opened as hr.mgr@ — never as the employee.
- No HTTP status / Next.js error overlay check, although the prompt required it.
- /me/payslips, /settings/visas, /settings/branches, /payroll/<latest run id> are missing from the page list.
- Raw translation keys pass: the light-ar employees screenshot shows the pills "employees.active", "employees.pendingVerification", "employees.all" and is marked PASS.

Fix:
1. Delete both `page.evaluate` blocks that set dir/lang/theme. Switch language by clicking the real EN/AR toggle in the top bar; switch theme by clicking the real theme toggle. Then assert `html[dir]` = rtl/ltr and the theme attribute — as set BY THE APP.
2. Any console error = FAIL (remove the hydration/404 filters; only allow the favicon). Record the failing URL for network errors (use `page.on('response')` with status ≥ 400 and record method + URL).
3. Check the main document response status = 200 and that `nextjs-portal` / the error overlay is not present.
4. Per-page role: /me and /me/payslips → employee@gulftech.ae; /settings, /settings/users, /settings/visas, /settings/branches, /audit → admin@gulftech.ae; everything else → hr.mgr@gulftech.ae. Use a separate browser context per role.
5. Add pages: /me/payslips, /settings/visas, /settings/branches, /payroll/<latest run id> (look up the id via the API, not Prisma).
6. Raw i18n key check: flatten all keys of frontend/src/i18n/en.json; FAIL if any visible text node equals one of those keys (e.g. "employees.active").
7. Arabic check (ar variants only): FAIL if a visible button, th, label, h1–h4, nav link, or tile title contains an English word of 3+ letters, except an allowlist: NEXTAL, EN, AED, IBAN, WPS, SIF, MOHRE, DIFC, employee codes (EMP-…), emails, and values that come from the database (employee names, job titles, department names) — mark data cells with `data-i18n-skip` and exclude those.
8. Regenerate ui-qa-results.json + ui-qa-sweep.md. Expect many failures now — that is correct. Then do section D.

## C. A 401 fires on every page

Every QA cell logs `Failed to load resource: 401 (Unauthorized)`. Find which request it is (the response listener from B.2 will tell you). Fix the cause — wrong endpoint, call made before the session loads, or an endpoint the role should not call (then don't call it for that role). Do NOT hide it. Report the URL and the fix.

## D. Fix the real Arabic/RTL bugs (all visible in the current screenshots)

Employees page (employees__light-ar-1440.png):
1. Filter pills show raw keys `employees.active`, `employees.pendingVerification`, `employees.all` — add the keys to en.json AND ar.json.
2. Bento tiles are English in Arabic mode: "Document Alerts", "Days to Expiry", "Salary Access", "Statutory Active", "Payroll & HR Manager View", "Status Coverage", "Compliant UAE Visas", "Total Filtered", "Gulf Tech Workforce" — move to i18n.
3. The left-most table column shows "0" in every row with NO header. Find out what it is: give it a header or remove it.

Dashboard at 390px (dashboard__dark-ar-390.png):
4. English: "Calculate Payroll", "Import Punches", "Other Deductions", "Late Penalties", "Stage: Calculated", "Direct SIF generation", the stepper labels "Draft / Calculated / Validated / Locked / Paid", "6M Net" → i18n.
5. "employees 31 included" — wrong word order; use a pluralised i18n string with a number placeholder for both en and ar.
6. The visa badge shows "Visa 01 (MOHRE Dubai)" in English — use the visa's Arabic name when lang = ar; no parentheses.
7. The pay-run card title is cut off ("مسير الرواتب..." and "... Dubai)") at 390 — let it wrap to 2 lines instead of truncating.

Then fix every other failure the new QA checks report, page by page. Hard-coded English in JSX is the root cause: add `eslint-plugin-i18next` with the rule `i18next/no-literal-string` (mode: jsx-text-only) to the frontend lint, and make `npm run lint --prefix frontend` pass for the pages in the QA list.

## E. Verification item and notification can silently fail

Evidence: `employeeService.createEmployee` creates the EMPLOYEE_VERIFICATION approval and the HR Manager notifications AFTER the transaction, each inside `try { } catch { console.warn }`. If either fails, the employee exists with no verification task and nobody knows.

Fix:
1. Create the employee, the approval request, the notifications and the audit row in ONE `$transaction`. If any fails, the whole create fails with a clear error.
2. Only notify HR managers whose user is active (`is_active = true`, not locked, belongs to the company).
3. `getNextEmployeeCode` default prefix: import `DEFAULT_EMPLOYEE_CODE_PREFIX` from shared/src/constants/statuses.js; no inline 'EMP-DXB'.
4. gaps-verification.test.js: add asserts that were required and are missing — (a) after create, exactly one `notifications` row per active HR manager with the employee code in the text; (b) after HR Manager verifies, an `audit_logs` row exists with action Verify/Approve on that employee; (c) after Return-for-correction, a notification to the creator containing the reason.

## F. Report the demo DB 9000+ codes (skipped in follow-up 1)

Run a read-only count on the DEMO DB (nextal_hr_payroll): employees whose numeric code suffix ≥ 8000, and any employee/company created by tests (names containing "Test", "Concurrent", "QA"). Paste the counts. Do NOT delete anything — Part 5 does the clean reset.

---

## Finish
- Run: `npm run lint --prefix frontend`, `npm test --prefix backend`, `npm test --prefix frontend`, `node scripts/verify-workflows.mjs`, `node scripts/ui-qa-capture.mjs`.
- Paste the real last 15 lines of each output, plus the QA summary line ("x/y cells passed") and the list of still-failing cells with reasons.
- Commit: `Part 4A follow-up 2: real visa-filter step, honest QA checks, Arabic fixes, atomic verification`
- STOP.
