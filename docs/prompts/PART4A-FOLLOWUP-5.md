# PART 4A — FOLLOW-UP 5 (found on disk after follow-up 4)

Read this whole file + docs/workflows/VISA-AND-BRANCH-WORKFLOW.md first. Fix sections 1–6 in order. Commit once, then STOP. Do not start Part 4B.
All earlier rules still apply (RC3-FIX-PLAN.md, BANNED list in FOLLOWUP-2, never change auth/routes/allowlists to make a check pass).
NEW: do not add words to the QA ALLOWLIST or new `data-i18n-skip` to make an Arabic cell pass — translate it. data-i18n-skip stays only on person names (English fallback), emails, codes, IBANs, amounts, IDs.

Verified OK from follow-up 4 (do not redo): scopeService wired into 12 services; VisaContext uses CompanyVisa; hr.difc seed user; new migration (not edited) for pay-run visa snapshot; settingsData.js / mockData.js deleted; settingsApi fallbacks removed; no gulftech strings in frontend/src; BRANCH_HAS_EMPLOYEES, VISA_TRANSFER_NOT_SUPPORTED, PAY_RUN_EXISTS implemented.

---

## 1. SECURITY — scopeService fails OPEN

`backend/src/services/scopeService.js`:
- L25–27 `if (!viewer) return { all: true }` and L44–46 `if (scopes.length === 0) return { all: true }` → missing data = full company access.
- L48–53: any role whose `scope_type` is null counts as Company scope. The EMPLOYEE role is created WITHOUT scope_type (employeeService ~L1066, userService ~L295). So any staff user who also has an EMPLOYEE role (staff accounts linked to employee records) gets company-wide data even if their HR role is scoped to Visa 02.

Fix:
1. No viewer or no data roles → `{ all: false, visaIds: [], branchIds: [], departmentIds: [] }` (sees nothing). Fail closed.
2. Compute scope ONLY from data-access roles (everything except EMPLOYEE). EMPLOYEE gives self-service access only, never org scope.
3. NEW migration: `UPDATE user_roles SET scope_type = 'Company' WHERE scope_type IS NULL` for non-EMPLOYEE roles; make scope_type NOT NULL with default 'Company' going forward. All role-creation code sets scope_type explicitly. After this, a null scope is a 500 bug, not "Company".
4. Tests: (a) hr.difc ALSO given an EMPLOYEE role linked to a Visa 02 employee → still only Visa 02 data; (b) user with only EMPLOYEE role → /employees 403 and resolveDataScope returns empty; (c) resolveDataScope(undefined) → empty.

## 2. Branch change (V8) — backend only, payload stuffed in a comment, effective date ignored, errors swallowed

Evidence: no frontend calls `/employees/:id/branch-change`; approvalService L372–400 parses JSON out of `request.comment`, applies the change immediately on approval (effective_date ignored), inside `try/catch` with audit `.catch(() => {})`.

Fix:
1. NEW migration: `approval_requests.payload jsonb` (nullable). Store `{ from_branch_id, target_branch_id, effective_date, reason }` there. Comment stays a human comment.
2. On request: target branch must belong to the employee's current company visa (else 400 BRANCH_VISA_MISMATCH); effective date ≥ today; one pending branch change per employee (else 409 BRANCH_CHANGE_PENDING).
3. On approval, inside one transaction: re-check the target branch's visa; if effective_date ≤ today apply now, else leave Approved-pending and let the 01:30 nightly job apply it on that date (add to scheduler.js, idempotent). Audit row in the same transaction. No swallowed errors.
4. UI: Employee profile → "Change branch" button (HR_OFFICER, HR_MANAGER) → drawer with Select of same-visa branches only (Arabic names in ar), effective date, reason (required). Pending request banner on the profile. Approvals Inbox shows "Branch change: <from> → <to>, effective <date>" with Approve/Reject.
5. Tests: future-dated change stays on old branch until the job runs on that date; forged cross-visa target → 400; self-approval → 403.

## 3. Runner VB steps still break the rules

- V-3 (around runner L930): `if (createdBranch) { …delete… }` — skip guard. Assert the branch exists, then delete through the UI.
- V-7 (~L1127): `if (switcherBtn)` — assert the top bar shows a STATIC badge with the Visa 02 name and that `#btn-company-visa-switcher` is absent/disabled.
- V-8 (~L1180): holiday created with `prisma.public_holidays.create` — create it through Settings → Public Holidays UI as HR (branch = DIFC FinTech Hub).
- V-9: uses whatever seeded run exists and fetches the SIF by API. As PAYROLL_OFFICER open the Visa 02 run in the UI, click Download SIF (`page.waitForEvent('download')`), parse the downloaded file. Duplicate run: try to create it from the "New pay run" UI and assert the visible error text.
- V-10: branch change done fully by API. Use the new UI from section 2: HR Officer requests on the profile, HR Manager approves in the Approvals Inbox, assert the profile shows the new branch. Keep the VISA_TRANSFER_NOT_SUPPORTED check as a forged API call (allowed).
- V-6: besides /employees, assert Visa 02 filtering on /attendance, /leave, /payroll and the dashboard headcount tile (number changes between Visa 02 and All).
Only the forged-request checks (V-5 mismatch, V-7 URL, V-10 transfer) may use fetch. Prisma may be used to READ ids/expected values, never to create or change data.

## 4. Finish the 18 Arabic QA failures (stopped with them open for the 2nd time)

From the last sweep — translate every one (en + ar keys, enums.js where it is an enum):
- dashboard: "UAE National: 4 (4 GPSSA)", "Expat: 38", "Multi-step workflow queue"
- employee-new: subtitle "Creates employee in 'Pre-Joined'…"
- employee-detail: "Compliance Complete", "Company Visa Entity"
- payroll: "Validation Issues", "10 Flags" (pluralised)
- payroll-adjustments: "Aug 2026", "Oct 2026" → format months with `Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-AE', { month: 'long', year: 'numeric' })` via one helper used everywhere; "Locked" via enums
- payroll-detail: "TOTAL HEADCOUNT", "Active under establishment"
- offboarding: "Approved", "Prepared" via enums
- reports: "Finance Excel", "Article 51" → "المادة 51" etc.
- audit: LOGIN / CREATE / UPDATE_VARIANCE_REASON… → enums.js audit action labels (all action codes used in backend/src — grep them and add every one)
Target: 80/80. Anything left must be listed with the exact reason.

## 5. Swallowed errors

`grep -rn "catch(() => {})" backend/src` → 41 hits. Spec 5.3: every approval and manual edit is logged. For every hit that wraps an audit write, an approval step or a notification tied to an approval: remove the swallow and put it in the same transaction as the change (the action fails if the audit fails). Hits in jobs/storage cleanup may stay but must `logger.warn` with context. Paste the list of all 41 with: file:line → removed / kept (reason).

## 6. Housekeeping + finish
- Delete the duplicate `docs/prompts/VISA-AND-BRANCH-WORKFLOW.md` (the spec copy is docs/workflows/).
- Run and paste the real last 15 lines of each: `npm run lint --prefix frontend`, `npm test --prefix backend`, `npm test --prefix frontend`, `node scripts/verify-workflows.mjs`, `node scripts/ui-qa-capture.mjs`. Plus the QA summary line and the section-5 list.
- Commit: `Part 4A follow-up 5: fail-closed scope, branch-change flow + UI, strict VB steps, Arabic 80/80, no swallowed audit errors`
- STOP.
