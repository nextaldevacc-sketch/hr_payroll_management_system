# Company Visa & Branch Management — Workflow

Source: HR Payroll Platform — Project Documentation v2.0 (content 3.1): glossary, §3 "Inside a company", §5.1–5.3 roles, §9 Settings, FR-EM1, FR-TO7, FR-PY1, FR-RP1/RP2, FR-ST1, A.3.2 company_visas, A.3.3 branches, A.3.8 user_roles, A.7.1 public_holidays.
Where the spec is silent, the rule is marked **[design]**. Where a client decision is still needed it is marked **[OPEN]**.

## 1. The structure

```
Company (Gulf Tech Logistics LLC)
 ├── Company Visa 01 — MOHRE Dubai      (MOHRE ID MOHRE-784-0129, routing ENBD001)
 │     ├── Branch: Dubai Headquarters (Al Quoz)
 │     └── Branch: Abu Dhabi Corniche Branch
 └── Company Visa 02 — DIFC Freezone    (DIFC-892-4410, routing FAB002)
       └── Branch: DIFC FinTech Hub
Departments & jobs — separate tree, NOT tied to a visa or branch.
```

| Thing | What it is | What it drives |
|---|---|---|
| Company visa | One MOHRE establishment (licence) of the company. Fields: name, MOHRE employer ID (unique), bank routing code (9), emirate | Its own pay run every month, its own WPS SIF file, its own payroll register |
| Branch | A work location. Belongs to exactly ONE company visa. Fields: name, name_ar, emirate, company visa | Grouping for reports, headcount, approvals; branch-only public holidays; role scope |
| Employee | Has one company visa AND one branch | The branch's visa MUST equal the employee's visa |
| Department | Reporting line; department manager = first leave approver | Not linked to visa/branch |

## 2. Who does what

| Step | Role |
|---|---|
| Create/edit company visas and branches | Company Admin (Settings → Company Profile & Visas, Branches) |
| Put an employee on a visa + branch | HR Officer (new employee wizard); HR Manager verifies |
| Move an employee to another branch / visa | HR Officer requests, HR Manager approves [design] |
| Branch public holidays | HR (Settings → Public Holidays) |
| Pay run per visa | Payroll Officer → HR Manager validates → GM approves → Finance pays |
| Limit a user's role to a visa / branch / department | Company Admin (Users & Roles) |

## 3. Role scope (A.3.8 user_roles)

Every role assignment has a scope: `Company`, `CompanyVisa`, `Branch` or `Department` (+ scope_id).
- Company → sees all visas and branches.
- CompanyVisa → sees only employees, attendance, leave, pay runs, documents, reports of that visa.
- Branch → sees only employees of that branch (pay runs: read-only view of their visa's run, own branch rows only) [design].
- Department → existing department-manager behaviour.
- Enforced on the SERVER on every list, detail, export and action. Opening another visa's record by URL → 404.

## 4. The top-bar Company Visa selector [design]

The spec has no switcher; it exists so a company-scoped user can focus on one visa.
1. It is a VIEW FILTER only. It never changes permissions and never changes data.
2. Options = the visas the user's scope allows. "All Company Visas" appears only for Company-scoped users with more than one visa.
3. Visa-scoped users: locked to their visa (static badge, no dropdown). Employees (self-service): hidden.
4. Choosing a visa filters every list, dashboard tile and report by `company_visa_id`. Branch filters on those pages then list only that visa's branches.
5. Creating a pay run: the visa field defaults to the selected visa. With "All" selected, the user must pick one — a pay run is always ONE visa.
6. The choice is remembered per user and survives reload / logout-login.

## 5. Workflows

**V1 Add a company visa** — Company Admin enters name, MOHRE ID (unique), routing code, emirate → saved + audit row.
**V2 Edit a company visa** — allowed. New MOHRE ID / routing code apply to SIF files of runs locked AFTER the change; a locked run keeps the values it was locked with (copied onto the pay run at lock) [design].
**V3 Delete a company visa** — blocked while it has employees, branches or pay runs (`DELETE_IN_USE_BLOCKED`).
**V4 Add a branch** — pick the company visa FIRST, then name (EN + AR) and emirate.
**V5 Change a branch's visa** — blocked while the branch has employees (`BRANCH_HAS_EMPLOYEES`); move the employees first [design].
**V6 Delete a branch** — blocked while it has employees or branch-only holidays.
**V7 Assign a new employee** — wizard: Company Visa first → Branch list shows only that visa's branches (auto-selected if one) → server rejects a mismatch (`BRANCH_VISA_MISMATCH`).
**V8 Move an employee to another branch of the SAME visa** — effective date + reason, HR Manager approves, audit row. Payroll unchanged (same visa run).
**V9 Move an employee to ANOTHER company visa (transfer)** — **[OPEN]** not defined in the spec. Recommended: effective only from the 1st of a payroll month, before that month's run for either visa is calculated; employee must get a branch of the new visa; HR Manager approves; employee then appears only in the new visa's run and SIF. Until the client confirms: changing the visa of an employee who already appears in any pay run is BLOCKED (`VISA_TRANSFER_NOT_SUPPORTED`); allowed while Pre-Joined.
**V10 Branch public holiday (FR-TO7)** — a holiday is for all branches (branch empty) or one branch. It is never counted as absence or leave for employees of the branches it applies to, and is a normal working day for the others.
**V11 Pay run per visa (FR-PY1, FR-RP1, FR-RP2)** — one Regular run per visa per month (unique). Only that visa's employees are included. SIF: SCR line uses that visa's MOHRE ID + routing code. Register and variance report per visa.
**V12 Scoped user** — e.g. an HR Officer scoped to Visa 02: sees only DIFC employees; Ahmed (Visa 01) is not in lists and his URL returns 404; selector locked to Visa 02.

## 6. Acceptance checks (runner steps)

| # | Role | Check |
|---|---|---|
| V-1 | COMPANY_ADMIN | Create a visa with a duplicate MOHRE ID → field error; valid one → saved, audit row |
| V-2 | COMPANY_ADMIN | Create a branch: visa chosen first, AR name required, appears under that visa |
| V-3 | COMPANY_ADMIN | Try to delete Visa 01 → blocked with counts; delete empty branch → ok |
| V-4 | COMPANY_ADMIN | Change visa of a branch with employees → blocked |
| V-5 | HR_OFFICER | Wizard: pick Visa 02 → only DIFC FinTech Hub offered; forged mismatch via API → 400 |
| V-6 | HR_MANAGER | Top bar Visa 02 → employees/attendance/leave/payroll/dashboard show DIFC only; All → Ahmed back; reload keeps choice |
| V-7 | HR_OFFICER (scoped Visa 02) | Locked selector; Ahmed not listed; /employees/<Ahmed id> → 404 |
| V-8 | HR (holiday) | Holiday for DIFC branch only → DIFC staff not absent that day, Dubai staff expected to work |
| V-9 | PAYROLL_OFFICER | Visa 02 run contains only Visa 02 staff; SIF SCR has DIFC-892-4410 + FAB002; second Regular run same month → blocked |
| V-10 | HR_OFFICER/HR_MANAGER | Branch move same visa with effective date → approved, audit row; visa change on an employee with pay history → VISA_TRANSFER_NOT_SUPPORTED |
