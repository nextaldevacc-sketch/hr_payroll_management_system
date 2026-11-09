# PART 4B — ADDENDUM (read together with docs/prompts/PART4-REDO.md → "PART 4B")

Do section 0 first, then PART 4B of PART4-REDO.md with the extra rules and steps below. Commit once at the end, then STOP. Do not start Part 4C.

## Rules (all still apply)
- RC3-FIX-PLAN.md global rules; the BANNED list in PART4A-FOLLOWUP-2.md; never change auth/routes/allowlists/data-i18n-skip to make a check pass.
- Add the 4B steps to the SAME scripts/verify-workflows.mjs (7.4.x, 7.5.x). Each step: log in as that role, visible UI only, hard asserts, screenshot `docs/reports/screenshots/workflow/7.4-<n>-<ROLE>.png` / `7.5-<n>-<ROLE>.png`. fetch() only for forged-request checks (assert exact status + code). Prisma only to READ ids / expected values.
- Expected money values come from the spec (Section 8 worked examples), written as constants in the runner — never read back from the app's own output.
- After 4B, `node scripts/ui-qa-capture.mjs` must still be 80/80, and new screens added in 4B (leave apply form, leave approval drawer, pay run Validation/Variances/Payslips tabs, SIF screen, /me/payslips/<id>) must be added to the QA page list (all 4 variants).

## 0. Leftovers from 4A (small)
1. EmployeeProfileFeature.jsx L588–589 and L767: uses `company_visa.visa_entity_name` / `visa_entity_name_ar`, which do not exist, so the header shows the literal "Company". Use the visa's real `name` (+ MOHRE ID); no literal fallback text.
2. Money format: pay run detail shows "AED 287,911.88" while the rest of the app shows "287,911.88 د.إ" in Arabic. One `formatCurrency` everywhere (en: "AED 287,911.88", ar: "287,911.88 د.إ").
3. Pay run action buttons must match spec 7.5 roles exactly and be labelled by the ACTION: Payroll Officer → "Calculate"; HR Manager → "Validate" (التحقق); GM → "Approve" (اعتماد); then Lock; Finance → "Mark as Paid". hr.mgr currently sees "اعتماد المسيرة" (Approve) on a Calculated run — HR Manager validates, GM approves. Each role sees only its own button; the server rejects the others (403 with code).

## Extra 4B steps (add to the list in PART4-REDO.md)
**7.4**
- 7.4.9 (HR_OFFICER hr.difc, Visa 02 scope): Ahmed's (Visa 01) leave request is NOT in their list; approving it by forged API → 404.
- 7.4.10 (DEPT_MANAGER, Arabic UI): approve a leave with the language set to AR; screenshot; no English text in the drawer.
- 7.4.11 Branch holiday: Ahmed (Dubai HQ) applies leave over the DIFC-only holiday created in VB-8 → that day IS counted for Ahmed (holiday is not his branch).

**7.5**
- 7.5.11 Exact Ahmed figures (spec worked example): basic 5,000; housing 2,000; transport 500; other 500; OT 78.13; absence 533.33; loan 500 with balance after 4,500; **net 7,044.80**. Assert each line on the payslip screen and in the PDF text, in that order (salary_rule.sequence).
- 7.5.12 SIF: for every EDR line, fixed + variable = that employee's payslip net; SCR count = number of EDR lines; SCR total = sum of EDR = run net; SCR has Visa 01 MOHRE ID `MOHRE-784-0129` + routing `ENBD001` (copied at lock). Time HHMM, month MMYYYY.
- 7.5.13 Segregation: the same user cannot do two of calculate / validate / approve-lock / mark paid on one run — try each with the wrong user through the UI (button absent) AND by forged API (403 `SEGREGATION_OF_DUTIES`).
- 7.5.14 Visa isolation: the Visa 01 run contains no Visa 02 employee; hr.difc cannot open the Visa 01 run (404).
- 7.5.15 Payslip in Arabic: Ahmed switches to AR → /me/payslips shows month in Arabic, amounts with د.إ, and the PDF prints his Arabic name (spec: arabic_name is printed on the payslip).
- 7.5.16 Employee privacy: hr.officer (no salary access) opens the run / Ahmed's profile → no salary figures anywhere (screen + API response has no salary keys).

## Finish
Run and paste the real last 15 lines of: `npm run lint --prefix frontend`, `npm test --prefix backend`, `npm test --prefix frontend`, `node scripts/verify-workflows.mjs`, `node scripts/ui-qa-capture.mjs`.
Also paste the table of every 7.4 / 7.5 step (step, role, PASS/FAIL, screenshot path) from the generated report, and Ahmed's payslip lines as rendered.
Commit: `Part 4B: workflows 7.4–7.5 verified step by step`
STOP.
