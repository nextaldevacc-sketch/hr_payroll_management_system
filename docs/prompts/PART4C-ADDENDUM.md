# PART 4C — ADDENDUM (read with docs/prompts/PART4-REDO.md → "PART 4C")

Do section 0, then PART 4C of PART4-REDO.md with the rules and extra steps below. Commit once, then STOP. Do not start Part 5.

## Rules (all still apply — same as 4B follow-up 1, which passed)
- New file `scripts/steps-4c.mjs`, imported by verify-workflows.mjs like steps-4b. Steps 7.6.x / 7.7.x, screenshots `docs/reports/screenshots/workflow/7.6-<n>-<ROLE>.png`.
- Every action through the visible UI by the role named. **Zero** Prisma create/update/delete/executeRaw in steps-4c.mjs. Prisma may READ ids/expected values only.
- fetch() only for: forged checks (assert exact status + code), reading PDF/file bytes after a UI download, and triggering the scheduled jobs through the admin job endpoint (7.6.6, 7.7.1–7.7.2) — the job trigger must be done by a logged-in admin, and you must state that it stands in for the 01:00/01:30 cron.
- Fixtures (Omar, Sara, the 11-month employee, the employee for 7.6.1, a document expiring in 85 days, an expired document) are SEED data in backend/prisma/seed, documented as the spec Section 8 / T21–T25 examples. The runner does not create them. Use date offsets from "today" in the seed so 85 days stays 85 days on any run date.
- Money/day asserts compare to spec constants: T21 12,082.19 (Sara), T22 32,547.95 + T24 2,367.12 → net settlement 44,915.07 (Omar), T23 0 (11 months). Each report row prints expected AND measured values.
- QA stays green: add the new screens (offboarding detail, clearance checklist, settlement view, cancellation tasks, /me/documents upload, document verification drawer) to ui-qa-capture.mjs, 4 variants each.

## 0. Leftover from 4B
`backend/src/routes/leave.js` L48 registers the approve action twice: `['/requests/:id/action', '/:id/action']`. One URL per action — remove `/:id/action` and fix any caller.

## Extra 4C steps
**7.6**
- 7.6.7 Clearance amounts: Finance records the outstanding loan amount on the Finance clearance item; it appears as a deduction in the settlement (spec 7.6.3 "minus … loan balance … and clearance amounts").
- 7.6.8 Segregation on settlements: Payroll prepares, HR Manager validates, GM approves, Finance pays — each wrong role: button absent in UI AND forged API 403 with code. Nobody acts twice on one settlement.
- 7.6.9 Scope: hr.difc (Visa 02) cannot see or open a Visa 01 separation/settlement (UI absent, forged GET 404).
- 7.6.10 Archived employee's payslips stay readable by Payroll/HR Manager; their self-service login is refused with the generic error (no "archived" leak on the login page).
- 7.6.11 Arabic: the settlement PDF prints the employee's Arabic name and amounts with د.إ in AR.

**7.7**
- 7.7.5 Reminder schedule (spec 7.7.3): reminders at 90, 60 and 30 days. Seed docs at 89, 59 and 29 days → one job run sends exactly one reminder each, to the owner AND HR; a second run sends none (dedupe per threshold).
- 7.7.6 Missing Data: a document with no expiry date shows "Missing Data" (spec 7.7.2).
- 7.7.7 Renewal verification is dual-control: the uploader cannot verify their own upload (403); HR verifies; the old version stays in history with its file still downloadable.
- 7.7.8 Encryption: the stored file on disk starts with the `NEXTAL_ENC_V1` header (read the bytes from storage — read-only), and the download returns the original bytes.
- 7.7.9 hr.officer sees document expiry but never salary; hr.difc sees only Visa 02 documents.

## Traceability (as PART4-REDO says, plus)
- `fr-map.json` covers all 77 FRs + 13 NFRs + T1–T37 + VB V-1…V-10. FR-PL1–3 and T1 = DEFERRED (Phase 2) with the reason.
- `scripts/generate-traceability.js` FAILS on: a missing file, a test title not found by exact string in test files, a workflow step not PASS in the latest `docs/reports/workflow-verification.md`, or any requirement left with no evidence.
- Paste the generator's summary line (e.g. `86 PASS / 4 DEFERRED / 0 MISSING`) and run it once with a deliberately broken entry to show it fails (then revert).

## Finish
Paste the real last 15 lines of: `npm run lint --prefix frontend`, `npm test --prefix backend`, `npm test --prefix frontend`, `node scripts/verify-workflows.mjs`, `node scripts/ui-qa-capture.mjs`, `node scripts/generate-traceability.js`.
Also paste: `grep -cE "page\.(click|fill)" scripts/steps-4c.mjs`; the mutation grep on steps-4c.mjs (must be empty); every fetch( line with its reason; the 7.6/7.7 table with expected vs measured.
Commit: `Part 4C: workflows 7.6–7.7 verified step by step + evidence-checked traceability`
STOP.
