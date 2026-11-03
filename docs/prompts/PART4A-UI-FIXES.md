# PART 4A — UI fixes found by manual testing (do before 4B)

Found by Mohamed testing the running app (localhost:3100) on 2 Nov, confirmed in code:

## 1. Fake company switcher (top bar)
`frontend/src/components/layout/GlassTopBar.jsx` ~L102–111 hard-codes three made-up entities ("Gulf Tech Logistics LLC – MOHRE Visa #442901", "Nextal Solutions FZ-LLC – DIFC License #98210", "Apex Engineering Abu Dhabi"). The dashboard subtitle (`app/(app)/page.jsx` ~L413) hard-codes "MOHRE Visa #442901" too. Selecting an item does nothing.
Fix:
- Replace with a real **Company Visa context selector**: shows the logged-in user's company name (from `/auth/me`) and a list of that company's real visas from the API (name + MOHRE establishment ID + emirate), plus "All visas".
- The selection is stored per user (localStorage key per user id is fine — it's a view filter, not security) and actually filters: dashboard tiles, employee list, attendance grid, leave lists, pay runs, reports. The server still enforces company isolation and role scope.
- Hide the selector for employees and for users whose scope is a single visa (show a static label instead).
- Grep `frontend/src` for any other hard-coded company/visa/licence strings or `mockData` imports used outside `/styleguide`; replace with API data. Zero hard-coded business data in production pages.

## 2. Company visa ↔ branch (new-employee wizard and everywhere they appear)
Spec 4: each branch belongs to one company visa. Today the wizard shows empty visa options and branch labels like "Dubai Headquarters (Al Quoz) ()", and lets you pick a branch that doesn't belong to the chosen visa.
Fix:
- Order: **Company Visa first, then Branch**. The branch list shows only branches of the selected visa; if there is one, auto-select it; changing the visa clears an incompatible branch.
- Labels: visa = "Visa 01 (MOHRE Dubai) · MOHRE-784-0129"; branch = "Dubai Headquarters (Al Quoz)" with a small emirate chip "Dubai". Never render empty parentheses or empty options. Arabic shows name_ar.
- A one-line helper under each field (en/ar): "Company visa = the licence the employee's visa and WPS salary file are under" / "Branch = where the employee works (belongs to the chosen visa)".
- Server-side: reject a branch that doesn't belong to the given visa (Zod + service check) with a field error.
- Apply the same rule in the Employee Profile (Job tab), Settings → Branches (branch form requires a visa), and every filter that shows visas/branches.

## 3. One styled Select for the whole app
Native `<select>` elements ignore the design system (grey highlight, white-on-white in some states).
- Build `components/primitives/form/Select.jsx` as an accessible custom listbox/combobox (keyboard, type-ahead, search when > 8 options, RTL, light/dark tokens, no white outlines in dark, 390 px friendly) with `label`, `helper`, `error`, `options=[{value,label,meta,chip}]`, `placeholder`, `disabled`, `loading`, `emptyText`.
- Replace **every** native `<select>` in `frontend/src` with it (grep `<select` → zero matches outside the primitive). Option labels can never be empty: if a label is missing, show the placeholder and log a console warning in dev.

## 4. Wizard feedback
- "Invalid request payload" must never be shown. The API returns Zod issues per field; the form maps them to the fields (red helper text under each field) plus one summary line: "Please fix 2 fields".
- Never show success and error at the same time; messages for one action replace earlier ones; toasts auto-dismiss (success 4 s; errors stay until closed) and stack without overlapping the form.
- Employee code: next sequential code per company prefix (EMP-DXB-045 after 044), generated server-side in a transaction (no gaps from failed attempts, no collisions); HR can override with a unique code (uniqueness checked live).

## 5. The wizard must follow the roles in spec 7.2
- HR Officer (or HR Manager) creates → the employee is **Pre-Joined** and the wizard ends with: "Submitted to HR Manager for verification" + a checklist showing what's next and who does it (Verify — HR Manager; Contract — Payroll Officer; Documents, schedule — HR; Bank — Payroll; Activate — HR).
- No step is shown as actionable to a user who cannot do it. If the logged-in user created the record, the Verify step says up front "Another HR Manager must verify (you created this record)" — not after clicking.
- HR Managers get a **"Pending verification" queue**: an Approval Inbox item + notification + Employees list filter "Pending verification"; verifying happens from the employee profile (approve / send back with comment). Send-back notifies the creator, who sees the comment on the record.
- The contract step appears for the Payroll Officer; bank for Payroll; documents/schedule for HR — each from the employee profile "Setup checklist" card, with the activation check showing exactly what's missing.

## 6. Front-end QA sweep (every page, both themes, en/ar)
For every page in `frontend/src/app/(app)` and every drawer/modal/form:
- dropdowns populated with readable labels; no "()" "undefined" "null" "NaN" "[object Object]"; dates formatted (dd MMM yyyy); numbers with thousands separators; amounts only for salary roles.
- loading skeletons, empty states with a next action, and error states with a retry — no blank panels.
- no layout overflow at 1440 / 1024 / 390 px; RTL mirrored; no white outlines in dark mode.
Write `docs/reports/ui-qa-sweep.md`: a table page → issues found → fixed (with before/after screenshot paths). Open every screenshot and describe only what is visible.

## 7. Make the runner test what the user sees
Update `scripts/verify-workflows.mjs` (7.2) to use the wizard exactly as a user would: open the visa dropdown and assert ≥1 option with non-empty text; pick a visa; assert the branch list contains only that visa's branches; assert no "()" anywhere; assert the success message appears without an error message; assert the code is EMP-DXB-0NN sequential; log in as HR Manager → find the employee in "Pending verification" → verify there.

Run backend + frontend tests and the 4A runner (all 26 steps must still pass), commit `Part 4A UI fixes: real visa selector, visa→branch, styled selects, role-based wizard, QA sweep`, report, STOP.
