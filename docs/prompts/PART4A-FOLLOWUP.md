# PART 4A — FOLLOW-UP (4 gaps found on disk after "100% VERIFIED")

Read this whole file before touching code. Fix ONLY these 4 items, in order. Commit after all 4, then STOP.
Global rules from RC3-FIX-PLAN.md still apply (no business logic in routes, no manual DB edits, tests on TEST DB only, never edit applied migrations, no secrets in git).
Do NOT write "100% VERIFIED" or "PASSED" anywhere unless a script produced that result in this run.

---

## GAP 1 — Top-bar Company Visa selector is cosmetic (it filters nothing)

Evidence: `useVisa()` is used only in `app/(app)/page.jsx` (badge/subtitle text) and `app/(app)/me/payslips/page.jsx`.
Employees, Attendance, Payroll, Leave, Documents, Reports never read `selectedVisaId`. Changing the selector changes a label only.

Fix:
1. Backend: every list/summary endpoint below accepts optional query `company_visa_id` (UUID or absent = all). Validate with Zod; reject a visa that is not in the caller's company (400 `INVALID_VISA`). Filter in the SERVICE layer, not the route:
   - GET /employees (already has `company_visa_id` in controller L102 — make sure the service actually applies it)
   - GET /attendance (imports + daily records, via employee.company_visa_id)
   - GET /leave/requests and leave balances list
   - GET /payroll/runs (pay runs are per visa — filter by run.company_visa_id)
   - GET /documents/expiring and the compliance list
   - GET /dashboard summary endpoints (headcount, payroll cost, expiries, pending approvals)
   - GET /reports/* that list employees
2. Frontend: one helper `frontend/src/lib/visaQuery.js` → `withVisa(params, selectedVisaId)` that adds `company_visa_id` only when `selectedVisaId && selectedVisaId !== 'all'`. Use it in every API call above. Each page must re-fetch when `selectedVisaId` changes (add it to the effect/SWR key).
3. Page-level visa filters (e.g. EmployeeListFeature `visaFilter`) must DEFAULT to the top-bar value and stay in sync; no second, disagreeing visa filter.
4. Pay run creation: the visa field defaults to the top-bar visa when one is selected.
5. Test (backend, test DB): seed 1 employee in Visa 01 and 1 in Visa 02; GET /employees?company_visa_id=<v01> returns only the first; same pattern for /payroll/runs and /attendance. Foreign visa id → 400.
6. Runner check (scripts/verify-workflows.mjs, new step "7.1-8 HR_MANAGER visa filter"): log in as hr.mgr@, pick Visa 02 in the top bar, open /employees, assert every visible row shows the DIFC branch and Ahmed (Visa 01) is NOT visible; switch to "All Company Visas", assert Ahmed is visible. Screenshot both.

## GAP 2 — Employee code generator is a hack, not collision-safe

Evidence: `employeeService.getNextEmployeeCode` (L320–336) loads ALL employees, ignores numbers >= 8000 ("ignore 9000+ temp test series"), hard-codes `EMP-DXB-`, and two simultaneous creates both get the same code → second fails with DUPLICATE_CODE.

Fix:
1. Remove the `n < 8000` rule. If 9000+ codes exist in the DEMO DB, that is test data leaking — report the count in your output; do NOT hide it. Tests must use their own company or the test DB.
2. Compute max with one query (raw SQL on the numeric suffix, scoped to company_id) — not findMany of every employee.
3. Generate + insert inside `prisma.$transaction`; on unique-constraint error (P2002 on company_id+employee_code) retry up to 5 times with the next number. Confirm a unique index on (company_id, employee_code) exists; if not, add it in a NEW migration.
4. Prefix: keep `EMP-DXB-` as the default but read it from one constant in `shared/src/constants/` (not inline).
5. Test: fire 5 createEmployee calls with Promise.all on the test DB → 5 distinct, consecutive codes, no error.

## GAP 3 — "Pending verification" exists only as a list filter pill

Spec 7.2: after HR Officer creates a Pre-Joined employee, the HR Manager must be told and must act. Today nothing reaches the HR Manager.

Fix:
1. On create (Pre-Joined), create an approval/task item type `EMPLOYEE_VERIFICATION` assigned to role HR_MANAGER, linked to the employee id, using the SAME approval/inbox mechanism the leave requests use (approvalService). No new parallel system.
2. Create an in-app notification for every active HR_MANAGER user of that company: "New employee EMP-DXB-0xx <name> awaits verification".
3. The item appears in the Approval Inbox with Verify / Return-for-correction buttons. Verify → employee verified; item closed; audit log entry. Creator cannot verify their own record (keep the existing guard, backend-enforced 403 `SELF_APPROVAL_FORBIDDEN`).
4. Return-for-correction → notification back to the creator with the reason (required, min 5 chars).
5. Dashboard "Pending approvals" count includes these items.
6. Test (backend): officer creates → HR manager inbox has 1 item + 1 notification; officer tries verify → 403; manager verifies → item closed, audit row exists.
7. Runner: extend step 7.2-3 so the HR Manager opens the Approval Inbox (NOT the employee list) and verifies from there. Assert the notification bell count went up before clicking.

## GAP 4 — ui-qa-sweep.md has no real QA evidence

Evidence: all 13 images it cites are the workflow-runner screenshots (docs/reports/screenshots/workflow/7.x-*.png, captured 3 Nov 15:42–15:47) plus an old wf-7-4.png from 2 Nov. There is no dark-theme, Arabic/RTL, 390px, or before/after image, but the report claims all of them.

Fix:
1. Write `scripts/ui-qa-capture.mjs` (Playwright, same login helper as the runner). For each page in this list:
   /, /employees, /employees/new, /employees/<Ahmed id>, /attendance, /leave, /payroll, /payroll/<latest run id>, /approvals, /documents, /reports, /settings, /settings/visas, /settings/branches, /me, /me/payslips
   capture 4 variants → light-en-1440, dark-en-1440, light-ar-1440, dark-ar-390
   saved as `docs/reports/screenshots/qa/<page-slug>__<variant>.png`. Log in as the role that can open that page (/me pages as employee@).
2. For each capture, the script itself checks and records in `docs/reports/ui-qa-results.json`:
   - HTTP status of the page and no Next error overlay
   - text contains none of: "undefined", "null", "NaN", "Invalid request payload", "()" 
   - no horizontal scroll at 390 (document.scrollWidth <= innerWidth)
   - html[dir] = "rtl" for ar variants
   - no console errors
3. Delete the current docs/reports/ui-qa-sweep.md and REGENERATE it from ui-qa-results.json by the script (a table: page × variant → pass/fail + image link + failure reasons). No hand-written verdicts, no "100%" header — the summary line is computed (e.g. "61/64 checks passed").
4. Any failure found: fix it, re-run the script, regenerate the report. Remaining failures stay listed honestly.
5. "Before" images are not required (they can't be recreated) — remove the word "before/after" from the report.

---

## Finish
- Run: `npm test --prefix backend`, `npm test --prefix frontend`, `node scripts/verify-workflows.mjs`, `node scripts/ui-qa-capture.mjs`.
- Paste the REAL tail of each output (last 15 lines) in your final message — not a summary.
- Commit: `Part 4A follow-up: visa filter wired, safe employee codes, verification inbox, scripted QA sweep`
- STOP. Do not start Part 4B.
