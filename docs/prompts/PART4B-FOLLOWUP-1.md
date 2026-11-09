# PART 4B — FOLLOW-UP 1 (found on disk after "64/64 PASS")

Read this whole file before changing code. Fix sections 1–5 in order. Commit once, then STOP. Do not start Part 4C.
All earlier rules apply (RC3-FIX-PLAN.md, BANNED list in PART4A-FOLLOWUP-2.md, PART4B-ADDENDUM.md rules).

Verified OK (keep): 27 fresh 4B screenshots; QA 108/108; PDF prints arabic_name; SIF/segregation/visa-isolation forged checks; Ahmed's payslip lines in sequence order with net 7,044.80.

---

## 1. BUG — leave approval is single-step and deducts the balance again on every "Approve" (spec 7.4.2, T15)

Evidence (backend/src/services/leaveService.js `actOnLeave`, ~L276–470):
- There is NO check that the request is still `Pending`. Every `Approve` call runs "deduct from allocation" (`days_taken: { increment: request.days }`) and marks attendance again.
- There is NO approval chain. The FIRST approver of any role (DEPT_MANAGER, HR_OFFICER, HR_MANAGER, GM, COMPANY_ADMIN) sets status `Approved` immediately. Nothing checks that this role is the current step.
- `requestLeave` never creates an approval request, so approvalService's LEAVE chain is never used.
- The runner's 7.4.4 calls approve as Dept Manager, then HR Officer, then GM → the balance is deducted 3 times. Report 7.4.5 says "days_taken incremented to 15" for a 4-day leave — that number was never compared with the expected value.
- routes/leave.js L49 now lets EMPLOYEE and HR_OFFICER call `/requests/:id/action`.

Fix:
1. ONE leave approval path, through approvalService (request type LEAVE, same engine as EMPLOYEE_VERIFICATION). Remove the direct status-setting in `actOnLeave`, or make `actOnLeave` delegate to approvalService.
2. Chain per spec 7.4: Dept Manager (the employee's department manager) → HR (HR_OFFICER or HR_MANAGER) → GM ONLY when the leave type or length is flagged (Settings → Approval Settings). Only the user/role of the CURRENT step can act; anyone else → 403 `NOT_CURRENT_APPROVER`. Nobody approves their own request (skip to the next step, as 7.4.8 already expects). Dept Manager must be the manager of that employee's department (scope), else 404.
3. Balance is deducted ONCE, when the FINAL step approves, inside the same transaction as the status change + attendance marking + audit row. A second approve on an Approved request → 409 `ALREADY_COMPLETED`, nothing changes.
4. Refuse at any step → Refused, nothing deducted. Cancel of an Approved request by the employee → days returned once, attendance cleared, only own request.
5. "HR checks the balance and pay band" (spec): the HR step's drawer shows remaining balance after this request and the pay band (full/half/none) per day.
6. Tests (test DB): 4-day annual leave → after Dept Manager approve: status Pending step 2, balance unchanged; HR approve (type not flagged) → Approved, balance −4 exactly; extra approve → 409 and balance unchanged; flagged type → needs GM; GM before HR → 403 NOT_CURRENT_APPROVER; employee calling approve → 403; cancel → +4 exactly; refuse → no change.

## 2. Runner 4B is API-driven, not UI-driven

scripts/steps-4b.mjs is 1,525 lines with only 5 `page.click/page.fill` calls. The main actions are done with fetch() or Prisma and then a screenshot is taken:
- Leave apply (L236, L473, L607), every leave approval (L279, L292, L305, L380, L530) — fetch.
- Pay run create (L735), calculate (L784, L803, L845), variance reasons (L904) — fetch.
- 7.5.2 "Payroll fixes the IBAN" — `prisma.bank_accounts.update` (L778, L797).
- 7.5.3 unapproved adjustment (L827) and 7.5.10 correction adjustment (L1167) — `prisma.salary_adjustments.create` (no approval at all).
- L729–732 deletes existing pay runs, payslips and lines with Prisma (bypasses the "locked run is never edited" rule).
- L938 `if (validateBtn)` — fine as written (it throws), keep.

Fix — rewrite each step with the visible UI, as the role named in the step:
1. 7.4: Ahmed applies on /me/leave (form shows 4 days with the Wed holiday — assert the number in the form); overlap and half-day through the same form (assert the visible error / "0.5"); sick leave without attachment → visible error. Each approver opens their Approvals Inbox / Leave drawer and clicks Approve. Assert status text after each step and the balance number on screen (before → after = −4 exactly, compared to a constant).
2. 7.5: create run via "New pay run"; Validation tab lists the missing-IBAN error; Payroll Officer fixes the IBAN on the employee's Bank tab (UI); Calculate button; variance reasons typed in the Variances tab; HR Manager Validate button; GM Approve/Lock button; Finance Mark Paid button.
3. Salary adjustments (unapproved one for T37, correction for T20) are created in the Salary Adjustments screen and the correction goes through its approval in the UI. The correction payslip in the next run must show the link to the original payslip on screen.
4. Test inputs that come from earlier workflows (OT 3h, 2 absence days, loan 5,000 balance) must be SEED data in backend/prisma/seed (named, documented in the seed file as the spec Section 8 Ahmed example), not created by the runner. The runner may READ them to assert.
5. No Prisma create/update/delete anywhere in steps-4b.mjs. No deleting pay runs. If a run for that visa+month already exists because the runner was re-run, the runner resets + reseeds the TEST DB at start (it already does for 4A) — do that, don't delete rows.
6. fetch() only for the forged checks (overlap via API is NOT a forged check — use the UI), SIF-before-lock refusal, segregation 403s, visa-isolation 404, privacy key check, and reading SIF/PDF bytes after the UI download.
7. Every money/day assertion compares against a constant from the spec (4 days, −4, +4, 16 days at 8 months, 0 at 4 months, 78.13, 533.33, 500, 4,500, 7,044.80) — not against values read back from the app.

## 3. Check every 7.4 report row against its expectation

Report rows currently print an "actual" that does not equal "expected" and still PASS (7.4.5: expected +4, actual "incremented to 15"; "5 attendance days marked" for a 4-day leave). The runner must compute pass/fail from the assertion, and the "actual" column must print the measured values (before, after, delta). 7.4.5: exactly 4 attendance days marked Leave (Mon, Tue, Thu, Fri) and the Wednesday stays Public Holiday.

## 4. T32 amount
PART4-REDO says "Employee cancels an approved 5-day leave → balance restored by 5 (T32)". The runner used 4. Use a separate 5 working-day leave (no holiday in it) for T32 and assert +5.

## 5. Finish
Run and paste the real last 15 lines of: `npm run lint --prefix frontend`, `npm test --prefix backend`, `npm test --prefix frontend`, `node scripts/verify-workflows.mjs`, `node scripts/ui-qa-capture.mjs`.
Also paste: `grep -c "page.click\|page.fill" scripts/steps-4b.mjs`, `grep -n "prisma.\$base().[a-z_]*.\(create\|update\|delete\)" scripts/steps-4b.mjs` (must be empty), every fetch( line in steps-4b.mjs with the reason it is allowed, and the 7.4/7.5 report table with expected vs actual columns.
Commit: `Part 4B follow-up 1: leave approval chain + single deduction, 4B runner through the UI, seed-based fixtures`
STOP.
