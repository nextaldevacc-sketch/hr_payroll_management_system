<h1>HR &amp; Payroll Software — Project Documentation and Sprint Plan</h1>

<p>Oct 16, 2026 · @NEXTAL</p>
<h2>Document control</h2>

<p>This document describes the HR &amp; Payroll Software that Nextal Technologies is building for UAE companies, and the sprint plan to build Release 1.</p>
<table><thead><tr><th><p>Field</p>
</th><th><p>Detail</p>
</th></tr>
</thead><tbody><tr><td><p>Product</p>
</td><td><p>HR &amp; Payroll Software (multi-company, UAE)</p>
</td></tr>
<tr><td><p>Document type</p>
</td><td><p>Product specification and sprint plan</p>
</td></tr>
<tr><td><p>Version</p>
</td><td><p>3.1</p>
</td></tr>
<tr><td><p>Prepared by</p>
</td><td><p>Mohamed Imran, AI/ML Developer</p>
</td></tr>
<tr><td><p>Organisation</p>
</td><td><p>Nextal Technologies</p>
</td></tr>
<tr><td><p>Build window</p>
</td><td><p>10 working days for the core release, plus 4 days for offboarding, compliance and reports (14 in total)</p>
</td></tr>
<tr><td><p>Status</p>
</td><td><p>For review</p>
</td></tr>
</tbody></table>

<p><strong>Revision history</strong></p>
<table><thead><tr><th><p>Version</p>
</th><th><p>Date</p>
</th><th><p>Author</p>
</th><th><p>Change</p>
</th></tr>
</thead><tbody><tr><td><p>3.1</p>
</td><td><p>25 Oct 2026</p>
</td><td><p>Mohamed Imran</p>
</td><td><p>Full scope check: public holidays, overtime requests, clearance, variance report, approval settings, audit history and self-service requests added; workflows corrected; database design added as Appendix A</p>
</td></tr>
<tr><td><p>3.0</p>
</td><td><p>16 Oct 2026</p>
</td><td><p>Mohamed Imran</p>
</td><td><p>Rules, roles, screens and reports aligned with the HR &amp; Payroll Software specification; 10–14 day sprint plan</p>
</td></tr>
<tr><td><p>2.0</p>
</td><td><p>8 Oct 2026</p>
</td><td><p>Mohamed Imran</p>
</td><td><p>Multi-company platform with two admin levels</p>
</td></tr>
<tr><td><p>1.0</p>
</td><td><p>5 Oct 2026</p>
</td><td><p>Mohamed Imran</p>
</td><td><p>First version</p>
</td></tr>
</tbody></table>

<p><strong>How to read this document</strong></p>
<table><thead><tr><th><p>You are…</p>
</th><th><p>Start with</p>
</th></tr>
</thead><tbody><tr><td><p>New to the project</p>
</td><td><p>"Start here", then Sections 1 and 4</p>
</td></tr>
<tr><td><p>A client or manager</p>
</td><td><p>"Start here", then Sections 3, 5, 7 and 14</p>
</td></tr>
<tr><td><p>HR or payroll staff</p>
</td><td><p>Sections 7, 8 and 9</p>
</td></tr>
<tr><td><p>A developer</p>
</td><td><p>Everything; Sections 8 to 15 and Appendix A (database) in detail</p>
</td></tr>
</tbody></table>

<p>Technical sections open with a short <strong>"In simple words"</strong> note, so anyone can follow the idea before the detail.</p>
<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>Start here</h2>

<p>If you only read one part of this document, read this one. No technical background is needed.</p>
<p><strong>What we are building</strong></p>
<p>An online HR and payroll system for companies in the UAE. It keeps employee records, reads fingerprint attendance, handles leave, works out salaries, and produces payslips and the WPS bank file. It also handles employees who leave the company and warns HR before visas, Emirates IDs and other documents expire.</p>
<p>Many companies can use the same system. Each company only ever sees its own data.</p>
<p><strong>Who runs it</strong></p>
<ul><li><strong>Nextal</strong> owns the platform. Our platform admin creates each client company and gives it a company admin.</li>
<li><strong>The company admin</strong> sets everything up for their company: departments, shifts, leave types, salary rules and who approves what.</li>
<li><strong>Everyone else</strong> (HR, payroll, managers, the GM, finance and employees) gets only the screens their job needs.</li>
</ul>

<p><strong>One month in the life of an employee</strong></p>
<p>Ahmed works at a company on the platform. His contract says basic AED 5,000, housing 2,000, transport 500 and other allowance 500, so his gross is AED 8,000.</p>
<ol><li>He punches in and out on the fingerprint machine every day. HR imports the machine file into the system.</li>
<li>One evening he stays 3 hours late. His manager approves it as overtime.</li>
<li>He is absent for 2 days without approval.</li>
<li>He took a loan of AED 6,000 earlier this year, paid back AED 500 a month.</li>
<li>At month end the system builds his payslip from approved records only:<ul><li>Gross: AED 8,000.00</li>
<li>Overtime: 3 h × (5,000 ÷ 30 ÷ 8) × 1.25 = AED 78.13</li>
<li>Absence: 8,000 ÷ 30 × 2 = AED 533.33 deducted</li>
<li>Loan: AED 500.00 deducted</li>
<li><strong>Net pay: AED 7,044.80</strong></li>
</ul>

</li>
<li>HR reviews the changes from last month and validates the pay run, the GM approves it, the run is locked, and only then are the payslips and the WPS file made. Finance sends the file to the bank.</li>
</ol>

<p>If Ahmed's overtime had not been approved by month end, it would not be lost. It would simply wait and be paid in the next month.</p>
<p><strong>Four ideas to remember</strong></p>
<table><thead><tr><th><p>Idea</p>
</th><th><p>What it means</p>
</th></tr>
</thead><tbody><tr><td><p>One platform, many companies</p>
</td><td><p>Each company is separate and cannot see another's data</p>
</td></tr>
<tr><td><p>Two admin levels</p>
</td><td><p>Nextal creates companies; each company admin runs their own</p>
</td></tr>
<tr><td><p>Rules are settings</p>
</td><td><p>Salary rules, leave types and attendance policies are changed on screen, not in code</p>
</td></tr>
<tr><td><p>Only approved records are paid</p>
</td><td><p>Unapproved overtime or leave waits for the next month</p>
</td></tr>
</tbody></table>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>1. Executive summary</h2>

<p>The HR &amp; Payroll Software is a multi-company system that takes UAE companies from setting up a new employee to monthly WPS salary payment and final settlement, using rules each company controls.</p>
<p><strong>The problem.</strong> Most UAE companies run HR in spreadsheets: attendance in one file, leave in another, salaries in a third, and the WPS file built by hand. Overtime gets paid without approval, document expiries are missed, and final settlements are worked out on a calculator. It is slow, error-prone and hard to audit.</p>
<p><strong>What the software does</strong></p>
<ul><li>Shows HR a dashboard of headcount, approvals waiting, this month's payroll status, exceptions and expiring documents.</li>
<li>Keeps one employee record with dated contract versions (salary history), secure UAE documents and bank details.</li>
<li>Imports biometric punches, flags exceptions, turns extra hours into overtime requests, and has managers and HR confirm each month's attendance.</li>
<li>Runs leave requests through manager, HR and, when needed, GM approval, with balances, accruals and a public holiday calendar.</li>
<li>Runs payroll in a fixed order: cut-off, validation, calculation, variance review, approval and locking, then payslips and the WPS SIF file.</li>
<li>Settles leavers: clearance checklist, gratuity, leave encashment and recoveries, then switches off their access.</li>
<li>Tracks visa, Emirates ID, labour card, passport, insurance and MOHRE contract expiry, with a named owner and reminders.</li>
<li>Lets employees see their own payslips, attendance and leave, and submit requests and documents.</li>
<li>Records every change and approval in an audit history nobody can edit.</li>
</ul>

<p><strong>How it is organised.</strong> Nextal's platform admin creates each client company and its company admin. The company admin configures everything else. Every salary rule is a row with a code, so rates change in Settings without new code. Defaults follow UAE Federal Decree-Law 33 of 2021.</p>
<p><strong>Release 1 outcome.</strong> A company can be created, configured and taken through a full month: attendance, leave, pay run, payslips and WPS file, plus one final settlement and the document expiry tracker.</p>
<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>2. Glossary</h2>

<p>The terms used in this document, in plain words.</p>
<p><strong>Platform and people</strong></p>
<table><thead><tr><th><p>Term</p>
</th><th><p>Meaning</p>
</th></tr>
</thead><tbody><tr><td><p>Platform admin</p>
</td><td><p>Nextal staff member who creates client companies and their first company admin</p>
</td></tr>
<tr><td><p>Company admin</p>
</td><td><p>The client's own administrator, who sets up and changes every setting for their company</p>
</td></tr>
<tr><td><p>Company visa</p>
</td><td><p>The company licence under which employees hold visas; one WPS file and one payroll register are produced per company visa</p>
</td></tr>
<tr><td><p>Division / branch / department</p>
</td><td><p>Ways of grouping employees for reporting and approvals</p>
</td></tr>
<tr><td><p>Leave approver</p>
</td><td><p>The person who gives first approval on an employee's leave, usually their department manager</p>
</td></tr>
<tr><td><p>GM</p>
</td><td><p>General Manager; gives final approval on pay runs, settlements and flagged leave</p>
</td></tr>
</tbody></table>

<p><strong>Employees and contracts</strong></p>
<table><thead><tr><th><p>Term</p>
</th><th><p>Meaning</p>
</th></tr>
</thead><tbody><tr><td><p>Employee status</p>
</td><td><p>Pre-Joined, New Joined, Active, Suspended, Transferred or Archived</p>
</td></tr>
<tr><td><p>Contract</p>
</td><td><p>The dated record of an employee's job and salary. Every salary or position change creates a new contract version from an effective date</p>
</td></tr>
<tr><td><p>Limited / Unlimited contract</p>
</td><td><p>Fixed-term or open-ended contract types</p>
</td></tr>
<tr><td><p>Probation</p>
</td><td><p>The trial period at the start of a contract</p>
</td></tr>
<tr><td><p>Residency type</p>
</td><td><p>UAE National or Expat; decides whether pension (GPSSA) applies</p>
</td></tr>
<tr><td><p>GPSSA</p>
</td><td><p>General Pension and Social Security Authority; pension contributions for UAE Nationals</p>
</td></tr>
</tbody></table>

<p><strong>Attendance and leave</strong></p>
<table><thead><tr><th><p>Term</p>
</th><th><p>Meaning</p>
</th></tr>
</thead><tbody><tr><td><p>Punch</p>
</td><td><p>One fingerprint check-in or check-out</p>
</td></tr>
<tr><td><p>Shift</p>
</td><td><p>Working hours, break minutes, grace minutes and weekly off days</p>
</td></tr>
<tr><td><p>Attendance policy</p>
</td><td><p>The rules for late grace, penalty steps, early out and overtime eligibility</p>
</td></tr>
<tr><td><p>Penalty steps</p>
</td><td><p>A scale of penalties for lateness, e.g. a warning first, then hours or a fraction of a day deducted</p>
</td></tr>
<tr><td><p>Missing punch</p>
</td><td><p>A day with a check-in but no check-out, or the reverse</p>
</td></tr>
<tr><td><p>OT</p>
</td><td><p>Overtime: approved hours worked beyond the shift</p>
</td></tr>
<tr><td><p>Accrual</p>
</td><td><p>Leave earned gradually, e.g. 2 days for each month worked</p>
</td></tr>
<tr><td><p>Carry-over</p>
</td><td><p>Unused leave moved into the next year, with an expiry date</p>
</td></tr>
<tr><td><p>Pay band</p>
</td><td><p>Whether a leave day is paid in full, half or not at all</p>
</td></tr>
</tbody></table>

<p><strong>Payroll and exit</strong></p>
<table><thead><tr><th><p>Term</p>
</th><th><p>Meaning</p>
</th></tr>
</thead><tbody><tr><td><p>Salary rule</p>
</td><td><p>One line of the payslip calculation with a code, e.g. BASIC, OT_NORMAL, LOAN</p>
</td></tr>
<tr><td><p>Structure</p>
</td><td><p>A set of salary rules used for a group of employees; a separate structure is used for final settlement</p>
</td></tr>
<tr><td><p>Payroll cut-off</p>
</td><td><p>The day after which no new inputs enter this month's pay run; later items go to next month</p>
</td></tr>
<tr><td><p>Pay run</p>
</td><td><p>All payslips for one month and one company visa. Status: Draft, Calculated, Validated, Locked, Paid</p>
</td></tr>
<tr><td><p>Variance report</p>
</td><td><p>A comparison of each employee's pay with last month, so unusual changes are explained before approval</p>
</td></tr>
<tr><td><p>Locked run</p>
</td><td><p>An approved pay run that can no longer be edited; corrections go into a later run</p>
</td></tr>
<tr><td><p>Correction payslip</p>
</td><td><p>A correction made in a later pay run, with a full audit trail</p>
</td></tr>
<tr><td><p>Salary adjustment</p>
</td><td><p>A loan, advance, recurring deduction or bonus recorded against an employee and approved before payroll uses it</p>
</td></tr>
<tr><td><p>Public holiday</p>
</td><td><p>An official UAE holiday in the company calendar; not counted as absence, and work on it earns holiday overtime</p>
</td></tr>
<tr><td><p>WPS / SIF</p>
</td><td><p>Wage Protection System and its Salary Information File, sent to the bank</p>
</td></tr>
<tr><td><p>EDR / SCR</p>
</td><td><p>The two line types in a SIF: one EDR per employee and one SCR control line per employer</p>
</td></tr>
<tr><td><p>EOSB / gratuity</p>
</td><td><p>End-of-service benefit paid when an employee leaves</p>
</td></tr>
<tr><td><p>Clearance</p>
</td><td><p>The exit checklist (laptop, ID card, finance, visa) that must be completed before the final settlement</p>
</td></tr>
<tr><td><p>Final settlement</p>
</td><td><p>All money owed on exit: salary to last day, gratuity, leave encashment, minus loans and recoveries</p>
</td></tr>
<tr><td><p>Notice shortfall</p>
</td><td><p>Notice days not served, which may be recovered</p>
</td></tr>
<tr><td><p>Audit history</p>
</td><td><p>The read-only record of every change, approval and login</p>
</td></tr>
</tbody></table>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>3. Scope</h2>

<p><strong>In simple words:</strong> What the first version will do, and what we are keeping for later.</p>
<p>Release 1 covers 11 modules, from setting up an employee to their final settlement, for one or more companies on the platform. Recruitment and onboarding is left for a later release.</p>
<p><strong>In scope — Release 1</strong></p>
<table><thead><tr><th><p>#</p>
</th><th><p>Module</p>
</th><th><p>Included in Release 1</p>
</th></tr>
</thead><tbody><tr><td><p>1</p>
</td><td><p>Platform</p>
</td><td><p>Create, suspend and reactivate companies; invite the company admin</p>
</td></tr>
<tr><td><p>2</p>
</td><td><p>Dashboard</p>
</td><td><p>Headcount, pending approvals, payroll status, exceptions and expiring documents</p>
</td></tr>
<tr><td><p>3</p>
</td><td><p>Employees</p>
</td><td><p>Employee master, departments, jobs, versioned contracts with salary history, bank and WPS details, secure documents</p>
</td></tr>
<tr><td><p>4</p>
</td><td><p>Attendance &amp; shifts</p>
</td><td><p>Biometric import, shift schedules, daily attendance, missing punch queue, overtime request and approval, manager and HR review</p>
</td></tr>
<tr><td><p>5</p>
</td><td><p>Leave &amp; holidays</p>
</td><td><p>Leave types, request and approval, balances and accruals, public holiday calendar and its payroll impact</p>
</td></tr>
<tr><td><p>6</p>
</td><td><p>Payroll</p>
</td><td><p>Cut-off and validation, monthly pay run, approved earnings and deductions, loans and advances, variance review, approval, locked payroll, payslips</p>
</td></tr>
<tr><td><p>7</p>
</td><td><p>Offboarding</p>
</td><td><p>Resignation and termination, clearance checklist, final settlement, leave encashment and recoveries, access deactivation</p>
</td></tr>
<tr><td><p>8</p>
</td><td><p>Compliance &amp; documents</p>
</td><td><p>Visa, Emirates ID, labour card, passport, MOHRE contract and insurance records with expiry dates, reminders and a responsible owner</p>
</td></tr>
<tr><td><p>9</p>
</td><td><p>Reports &amp; integrations</p>
</td><td><p>Payroll register, variance report, attendance and leave reports, WPS SIF export, accounting export, gratuity provision, leave liability, headcount</p>
</td></tr>
<tr><td><p>10</p>
</td><td><p>Settings &amp; audit</p>
</td><td><p>Companies, company visas, branches, departments, jobs, shifts, holidays, salary rules, roles, approval settings and audit history</p>
</td></tr>
<tr><td><p>11</p>
</td><td><p>Employee self-service</p>
</td><td><p>View own profile, payslips, attendance and leave balance; submit leave and overtime requests and upload documents</p>
</td></tr>
</tbody></table>

<p><strong>Later releases</strong></p>
<ul><li><strong>Recruitment and onboarding:</strong> manpower requests, candidate pipeline, offers and the onboarding checklist (left out of Release 1 on purpose; new employees are set up directly in the Employees module)</li>
<li>Accounting journal posted directly to an accounting system (Release 1 exports CSV)</li>
<li>Mobile app and push notifications</li>
<li>Live connection to biometric devices (Release 1 imports files)</li>
<li>Performance and training modules</li>
<li>Automatic visa and labour card cancellation through government portals (Release 1 opens tasks for HR)</li>
</ul>

<p><strong>Assumptions</strong></p>
<ul><li>Demo and test data are fictitious; no client data is used during the build.</li>
<li>UAE labour-law defaults are pre-loaded; each company confirms its own policy where marked.</li>
<li>One developer builds Release 1, with a project lead reviewing.</li>
</ul>

<p><strong>Constraints</strong></p>
<ul><li>No rule hard-coded: every rate, step and threshold is a setting.</li>
<li>Payroll reads approved records only.</li>
</ul>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>4. How the platform is organised</h2>

<p><strong>In simple words:</strong> Nextal runs one system. Each client company lives inside it in its own locked space, with its own structure, rules and people. Nextal opens the space; the company's own admin sets up everything inside it.</p>
<p>The platform has two layers: Nextal's platform layer, which creates and supervises companies, and the company layer, where each company admin configures their own setup.</p>
<p>[IMAGE]</p>
<p>platform organisation · platform, companies, structure, settings</p>
<p><strong>Inside a company</strong></p>
<table><thead><tr><th><p>Item</p>
</th><th><p>What it is used for</p>
</th></tr>
</thead><tbody><tr><td><p>Company visas</p>
</td><td><p>Each produces its own pay run, WPS SIF file and payroll register</p>
</td></tr>
<tr><td><p>Branches</p>
</td><td><p>Grouping for reports, headcount, approvals and branch-only public holidays</p>
</td></tr>
<tr><td><p>Departments and jobs</p>
</td><td><p>Reporting lines; the department manager is the first leave approver</p>
</td></tr>
<tr><td><p>Shifts and attendance policies</p>
</td><td><p>Working hours, breaks, grace, weekly off, Ramadan hours, late penalties and OT eligibility</p>
</td></tr>
<tr><td><p>Public holiday calendar</p>
</td><td><p>The year's holidays, so they are never counted as absence</p>
</td></tr>
<tr><td><p>Approval settings</p>
</td><td><p>Who approves each kind of request, step by step</p>
</td></tr>
<tr><td><p>Salary structures</p>
</td><td><p>The set of salary rules used for a group of employees, plus a separate final-settlement structure</p>
</td></tr>
<tr><td><p>Employees</p>
</td><td><p>Each with dated contract versions, UAE documents and bank details</p>
</td></tr>
</tbody></table>

<p><strong>Design principles</strong></p>
<ol><li><strong>Companies never see each other.</strong> Every record belongs to one company, and the system checks this on every request.</li>
<li><strong>Contracts are versioned.</strong> A raise or job change creates a new contract row from an effective date. Old months are always recalculated with the contract that applied then.</li>
<li><strong>Rules live in Settings.</strong> Every salary rule has a code and a formula that HR can change without new code.</li>
<li><strong>Only approved records are paid.</strong> Unapproved overtime or leave is held for the next month, never paid by default.</li>
<li><strong>Locked means locked.</strong> Once a pay run is approved it is locked, and only then are payslips and the WPS file made. A correction is approved and paid in a later run, linked to the original.</li>
<li><strong>Everything is traceable.</strong> Every approval and manual edit is logged with user, time, old value and new value.</li>
</ol>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>5. Roles and permissions</h2>

<p><strong>In simple words:</strong> Nextal's platform admin opens companies. Inside each company, the company admin hands out roles. Each role sees only what that job needs, and salary figures stay hidden from anyone who doesn't need them.</p>
<p>There are two admin levels and seven company roles; salary figures are visible only to Payroll, HR Manager, GM and Finance.</p>
<p><strong>5.1 Admin levels</strong></p>
<table><thead><tr><th><p>Role</p>
</th><th><p>Who</p>
</th><th><p>What they can do</p>
</th></tr>
</thead><tbody><tr><td><p>Platform admin</p>
</td><td><p>Nextal</p>
</td><td><p>Create, suspend and reactivate companies; invite the first company admin; see company status and usage. No access to a company's employee or salary data unless the company grants support access, which is time-limited and logged</p>
</td></tr>
<tr><td><p>Company admin</p>
</td><td><p>Client's system owner</p>
</td><td><p>Users and roles, company visas, divisions and branches, departments and jobs, and every setting in Section 9. Can be the same person as the HR Manager</p>
</td></tr>
</tbody></table>

<p><strong>5.2 Company roles</strong></p>
<table><thead><tr><th><p>Role</p>
</th><th><p>Typical person</p>
</th><th><p>Main job in the system</p>
</th></tr>
</thead><tbody><tr><td><p>Employee</p>
</td><td><p>Every staff member</p>
</td><td><p>Sees own profile, payslips, attendance and leave balance; submits leave, overtime and missing-punch requests; uploads documents</p>
</td></tr>
<tr><td><p>Department Manager</p>
</td><td><p>Team leads</p>
</td><td><p>Sees the team, approves overtime, confirms team attendance, gives first leave approval, clears department items when someone leaves</p>
</td></tr>
<tr><td><p>HR Officer</p>
</td><td><p>HR team</p>
</td><td><p>Maintains employee records, documents and attendance, confirms attendance, gives second leave approval, prepares exits and clearance</p>
</td></tr>
<tr><td><p>Payroll Officer</p>
</td><td><p>Payroll team</p>
</td><td><p>Sets cut-off, prepares and calculates pay runs, enters contracts and salary adjustments, calculates settlements, edits salary rules</p>
</td></tr>
<tr><td><p>HR Manager</p>
</td><td><p>Head of HR</p>
</td><td><p>Verifies new employees, edits everything in HR, approves salaries and leave, reviews variances, validates pay runs and settlements</p>
</td></tr>
<tr><td><p>GM</p>
</td><td><p>General Manager</p>
</td><td><p>Final approval on pay runs, settlements and flagged leave</p>
</td></tr>
<tr><td><p>Finance</p>
</td><td><p>Finance team</p>
</td><td><p>Pays salaries, marks runs Paid, clears finance items on exit, posts payroll to accounts</p>
</td></tr>
</tbody></table>

<p><strong>5.3 Permissions matrix</strong></p>
<table><thead><tr><th><p>Area</p>
</th><th><p>Employee</p>
</th><th><p>Dept Manager</p>
</th><th><p>HR Officer</p>
</th><th><p>Payroll Officer</p>
</th><th><p>HR Manager</p>
</th><th><p>GM</p>
</th><th><p>Finance</p>
</th></tr>
</thead><tbody><tr><td><p>Dashboard</p>
</td><td><p>—</p>
</td><td><p>Team</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td></tr>
<tr><td><p>Own profile, payslips, leave</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td></tr>
<tr><td><p>Employee records</p>
</td><td><p>—</p>
</td><td><p>View team</p>
</td><td><p>Edit</p>
</td><td><p>View</p>
</td><td><p>Edit + verify</p>
</td><td><p>View</p>
</td><td><p>—</p>
</td></tr>
<tr><td><p>Documents</p>
</td><td><p>Upload own</p>
</td><td><p>—</p>
</td><td><p>Edit</p>
</td><td><p>—</p>
</td><td><p>Edit + verify</p>
</td><td><p>View</p>
</td><td><p>—</p>
</td></tr>
<tr><td><p>Salary and contracts</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>Edit</p>
</td><td><p>Approve</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td></tr>
<tr><td><p>Attendance</p>
</td><td><p>Own</p>
</td><td><p>Confirm team</p>
</td><td><p>Edit + confirm</p>
</td><td><p>View</p>
</td><td><p>Edit</p>
</td><td><p>View</p>
</td><td><p>—</p>
</td></tr>
<tr><td><p>Overtime requests</p>
</td><td><p>Request</p>
</td><td><p>Approve team</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>Approve</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td></tr>
<tr><td><p>Leave requests</p>
</td><td><p>Apply</p>
</td><td><p>1st approval</p>
</td><td><p>2nd approval</p>
</td><td><p>View</p>
</td><td><p>Approve</p>
</td><td><p>Final (when flagged)</p>
</td><td><p>—</p>
</td></tr>
<tr><td><p>Salary adjustments</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>Prepare</p>
</td><td><p>Approve</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td></tr>
<tr><td><p>Pay runs</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>Prepare</p>
</td><td><p>Validate</p>
</td><td><p>Approve</p>
</td><td><p>Pay</p>
</td></tr>
<tr><td><p>Clearance</p>
</td><td><p>—</p>
</td><td><p>Clear own items</p>
</td><td><p>Prepare + clear</p>
</td><td><p>View</p>
</td><td><p>Approve</p>
</td><td><p>—</p>
</td><td><p>Clear own items</p>
</td></tr>
<tr><td><p>Final settlement</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>Prepare</p>
</td><td><p>Calculate</p>
</td><td><p>Validate</p>
</td><td><p>Approve</p>
</td><td><p>Pay</p>
</td></tr>
<tr><td><p>Settings and rules</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>Edit rules</p>
</td><td><p>Edit all</p>
</td><td><p>—</p>
</td><td><p>Accounts only</p>
</td></tr>
<tr><td><p>Audit history</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>—</p>
</td><td><p>View</p>
</td><td><p>View</p>
</td><td><p>—</p>
</td></tr>
</tbody></table>

<p>The company admin has every Settings screen, including Users and Roles and Approval Settings, and can view the audit history.</p>
<p><strong>Rules that apply to everyone</strong></p>
<ul><li>Nobody approves their own request.</li>
<li>Every approval and manual edit is logged with user, time, old value and new value.</li>
<li>A user can hold more than one role, and roles can be limited to a company visa, division or department.</li>
</ul>

<p><strong>5.4 Login</strong></p>
<ol><li>The platform admin creates the company and invites the company admin by email.</li>
<li>The company admin invites users and assigns roles. Employee logins can be created in bulk.</li>
<li>Each user sets a password from the invite link and then logs in with email and password.</li>
<li>Forgotten passwords are reset by email; five wrong attempts lock the account for 15 minutes.</li>
<li>When an employee is archived after leaving, their login is switched off.</li>
</ol>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>6. Modules and screens</h2>

<p><strong>In simple words:</strong> These are the pages of the system, grouped the way they appear in the side menu. Employees use the same pages but only ever see their own information.</p>
<p>The company side has 40 screens across 10 menu items; Nextal's platform admin has 2 more.</p>
<table><thead><tr><th><p>Menu</p>
</th><th><p>Screens</p>
</th><th><p>Main purpose</p>
</th></tr>
</thead><tbody><tr><td><p>Dashboard</p>
</td><td><p>HR Dashboard</p>
</td><td><p>Headcount, pending approvals, payroll status of the current month, exceptions waiting (missing punches, unapproved OT, validation errors) and documents expiring in 90 days</p>
</td></tr>
<tr><td><p>Employees</p>
</td><td><p>Employee List · Employee Profile (tabs: Personal, Job &amp; Contract, Salary History, UAE Documents, Attendance Setup, Bank &amp; WPS, History) · New Employee wizard</p>
</td><td><p>Employee master, contract versions with salary history, secure documents</p>
</td></tr>
<tr><td><p>Attendance</p>
</td><td><p>Daily Attendance Grid · Biometric Import · Missing Punch Queue · Overtime Requests · Attendance Review</p>
</td><td><p>Punches, exceptions, late and early-out penalties, overtime requests, manager and HR sign-off</p>
</td></tr>
<tr><td><p>Leave &amp; holidays</p>
</td><td><p>Leave Requests · Leave Request Form · Approval Inbox · Leave Balances · Public Holiday Calendar</p>
</td><td><p>Requests, multi-level and GM approval, balances and accruals, holidays</p>
</td></tr>
<tr><td><p>Payroll</p>
</td><td><p>Pay Runs · Pay Run Detail (tabs: Validation, Payslips, Variances, Approval) · Payslip · Salary Adjustments (loans, advances, deductions, bonuses)</p>
</td><td><p>Cut-off, validation, calculation, variance review, approval, locking and corrections</p>
</td></tr>
<tr><td><p>Offboarding</p>
</td><td><p>Resignation / Termination · Clearance Checklist · Final Settlement</p>
</td><td><p>Notice, clearance, gratuity, leave encashment, recoveries, settlement payslip, access deactivation</p>
</td></tr>
<tr><td><p>Compliance</p>
</td><td><p>Document Expiry Tracker</p>
</td><td><p>Visa, Emirates ID, labour card, passport, MOHRE contract and insurance, each with an owner and reminders</p>
</td></tr>
<tr><td><p>Reports</p>
</td><td><p>WPS SIF Export · Payroll Register · Variance Report · Attendance Report · Leave Report · Gratuity Provision · Leave Liability · Headcount · Accounting Export</p>
</td><td><p>Payment files, month-end checks and reports</p>
</td></tr>
<tr><td><p>Settings</p>
</td><td><p>Company Profile and Visas · Branches · Departments and Jobs · Shifts and Attendance Policies · Leave Types and Accrual Plans · Salary Rules and Structures · Users and Roles · Approval Settings</p>
</td><td><p>Setup tables, edited by the company admin</p>
</td></tr>
<tr><td><p>Audit</p>
</td><td><p>Audit History</p>
</td><td><p>Read-only list of every change, approval and login, filtered by user, record or date</p>
</td></tr>
</tbody></table>

<p><strong>Platform admin (Nextal only):</strong> Companies list, and Company detail with its admins and status.</p>
<p>Employee self-service: My Profile, My Payslips, My Attendance, My Leave Balance, My Requests (leave, overtime and missing-punch requests) and My Documents (view and upload) use the same screens, filtered to the logged-in employee.</p>
<p><strong>What a few key screens show</strong></p>
<table><thead><tr><th><p>Screen</p>
</th><th><p>What the user sees and does</p>
</th></tr>
</thead><tbody><tr><td><p>HR Dashboard</p>
</td><td><p>Headcount by department, approvals waiting, this month's pay run status (Draft, Calculated, Validated, Locked, Paid), exceptions waiting and documents expiring in 90 days; each tile opens the list behind it</p>
</td></tr>
<tr><td><p>Employee Profile</p>
</td><td><p>Seven tabs; Salary History lists every contract version with its date; salary and bank tabs hidden from roles without salary access; documents open only for permitted roles; History shows every change with who and when</p>
</td></tr>
<tr><td><p>Daily Attendance Grid</p>
</td><td><p>One row per employee, one column per day; late, early-out, OT and missing punches marked; click a cell to edit (logged)</p>
</td></tr>
<tr><td><p>Missing Punch Queue</p>
</td><td><p>Days with only one punch; HR adds the missing time with a reason, or the employee submits a request</p>
</td></tr>
<tr><td><p>Overtime Requests</p>
</td><td><p>OT hours waiting, from the attendance import or from an employee request; the manager approves as normal, night, rest-day or holiday OT, chooses a substitute day, or refuses</p>
</td></tr>
<tr><td><p>Attendance Review</p>
</td><td><p>The month for a team: the manager confirms, then HR confirms; only confirmed days reach payroll</p>
</td></tr>
<tr><td><p>Public Holiday Calendar</p>
</td><td><p>The year's UAE public holidays, for all branches or one branch; HR adds or moves a date when it is announced</p>
</td></tr>
<tr><td><p>Pay Run Detail</p>
</td><td><p>Validation tab lists blocking errors (for example a missing IBAN); Payslips tab shows gross, deductions and net; Variances tab compares each employee with last month; Approval tab shows who approved and when</p>
</td></tr>
<tr><td><p>Clearance Checklist</p>
</td><td><p>One line per item (laptop, ID card, loan, visa) with its department owner, status and any amount due</p>
</td></tr>
<tr><td><p>Final Settlement</p>
</td><td><p>Notice, gratuity, leave encashment, loan balance and recoveries, frozen once approved</p>
</td></tr>
<tr><td><p>Document Expiry Tracker</p>
</td><td><p>Each document with status Valid, Expiring Soon, Expired or Missing Data, and the person responsible for renewing it</p>
</td></tr>
<tr><td><p>Approval Settings</p>
</td><td><p>For each request type (leave, OT, salary adjustment, pay run, settlement), the approval steps and who approves each step</p>
</td></tr>
<tr><td><p>Audit History</p>
</td><td><p>Who changed what, when, the old value and the new value; cannot be edited or deleted</p>
</td></tr>
</tbody></table>

<p>All screens work in English and Arabic, on desktop and tablet.</p>
<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>7. Workflows</h2>

<p><strong>In simple words:</strong> Seven routines run the business. A company is set up once. New employees are set up as they join. Every month, attendance is checked, leave is approved and salaries are paid. Leavers are settled and cleared, and document expiry dates are watched all year.</p>
<p>Payroll reads only approved records: an unapproved OT hour or leave day is held to the next month, never paid by default.</p>
<p><strong>7.1 Company onboarding</strong></p>
<p>[IMAGE]</p>
<p>company onboarding · 8 steps, 2 by Nextal, 6 by the company admin</p>
<p>Nextal finishes steps 1–2 in minutes. Most settings start from UAE defaults, so the company admin usually completes steps 3–7 in one or two days. The trial month runs alongside the company's current method until the numbers match.</p>
<p><strong>7.2 New employee setup</strong></p>
<p>Recruitment is not in Release 1, so HR creates the employee directly. The employee cannot become Active until every required item is in place.</p>
<ol><li><strong>Create:</strong> the HR Officer enters the employee in the New Employee wizard. Status is Pre-Joined.</li>
<li><strong>HR verification:</strong> the HR Manager checks the personal details and the passport, visa and Emirates ID copies, then approves or sends them back with a comment.</li>
<li><strong>Contract and documents:</strong> the Payroll Officer enters the first contract version (job, department, basic and allowances). HR uploads each document with its number, expiry date and the person responsible for renewing it.</li>
<li><strong>Schedule and bank setup:</strong> HR assigns the shift, attendance policy, biometric device code and leave approver, and the opening leave allocation is created from the accrual plan. Payroll adds the bank account, IBAN and routing code for WPS.</li>
<li><strong>Active employee:</strong> the system checks that a contract, shift, bank account and labour card or person ID exist. The status changes to New Joined on the joining date and to Active when the checks pass, and the employee is invited to self-service.</li>
</ol>

<p><strong>7.3 Attendance import and review</strong></p>
<ol><li><strong>Import:</strong> HR imports the biometric file. Device codes are mapped to employees, and duplicate punches are dropped.</li>
<li><strong>Validate:</strong> the system builds one attendance day per employee from their shift and flags exceptions: missing punch, late arrival, early out, absent without leave, work on a rest day or public holiday, and unknown device codes.</li>
<li><strong>Handle exceptions:</strong> HR adds missing times with a reason (logged), or the employee submits a missing-punch request. Late and early-out penalties are applied from the attendance policy.</li>
<li><strong>Overtime:</strong> hours above the shift (and above the policy's minimum minutes) become overtime requests. Employees can also request overtime themselves. The manager approves each one as normal, night, rest-day or holiday overtime, chooses a substitute day, or refuses.</li>
<li><strong>Manager and HR review:</strong> the manager confirms the team's month, then HR confirms it. Only confirmed attendance and approved overtime reach payroll; anything still open at cut-off moves to next month.</li>
</ol>

<p><strong>7.4 Leave request</strong></p>
<ol><li><strong>Request:</strong> the employee applies in self-service (or HR applies for them), for full days or a half day. The system checks the balance and overlapping requests, does not count public holidays or weekly off days, and asks for an attachment where the leave type needs one.</li>
<li><strong>Approval:</strong> the department manager approves or refuses; HR checks the balance and pay band and approves; the GM approves when the leave type or length is flagged.</li>
<li><strong>Balance update:</strong> approved days are taken off the balance at once. A refused or cancelled request returns the days.</li>
<li><strong>Approved payroll input:</strong> approved days are marked on the attendance days with their pay band (full, half or none), and the pay run of that month uses them.</li>
</ol>

<p>Public holidays come from the Public Holiday Calendar. A holiday is never counted as absence, and work on a holiday is treated as holiday overtime or earns a substitute day.</p>
<p><strong>7.5 Monthly payroll</strong></p>
<p>[IMAGE]</p>
<p>monthly payroll flow · 8 steps, locked before payslips and the SIF</p>
<ol><li><strong>Cut-off:</strong> the Payroll Officer sets the cut-off date for the month and company visa. Anything approved after it goes to next month.</li>
<li><strong>Validate:</strong> before calculating, the system checks every employee: status (joiners, leavers and suspended staff), confirmed attendance, approved leave, approved overtime, contract and salary changes effective this month, approved loans, advances and deductions, and bank details. Blocking errors are listed and must be cleared.</li>
<li><strong>Calculate:</strong> each payslip is computed from the salary rules in the employee's structure. Status becomes Calculated.</li>
<li><strong>Review variances:</strong> the variance report compares every employee with last month. Any change above the set threshold needs a reason. The HR Manager then validates the run. Status becomes Validated.</li>
<li><strong>Approve:</strong> the GM approves the run.</li>
<li><strong>Lock:</strong> the approved run is locked. Status becomes Locked, and no payslip in it can be edited.</li>
<li><strong>Payslips and SIF:</strong> the payslips and the WPS SIF file are generated from the locked run only, so the bank file always matches the approved numbers.</li>
<li><strong>Paid:</strong> Finance pays through the bank or exchange house and marks the run Paid. Payslips are released to employees and the accounting export is produced.</li>
</ol>

<p><strong>Corrections after locking.</strong> A locked run is never edited quietly. If a mistake is found, the correction is approved as a salary adjustment and paid or recovered in a later run as a correction payslip linked to the original. The audit history shows the original, the correction, who approved it and why.</p>
<p><strong>7.6 Offboarding</strong></p>
<ol><li><strong>Record the exit:</strong> HR records the resignation or termination, the notice date and the final working date. The HR Manager approves it.</li>
<li><strong>Clearance:</strong> a checklist is created, one item per department (for example IT for the laptop, Admin for the ID card, Finance for loans, HR for visa cancellation). Each owner clears their item and records any amount due.</li>
<li><strong>Calculate the final settlement</strong> under the approved policy: salary to the last day, gratuity and leave encashment, minus notice shortfall, loan balance, training-cost recovery and clearance amounts. The figures are frozen in a settlement snapshot.</li>
<li><strong>Review and approval:</strong> the Payroll Officer prepares the final-settlement payslip, the HR Manager validates it and the GM approves it. Finance pays.</li>
<li><strong>Deactivate access:</strong> the employee's login is switched off after the final working date, the status becomes Archived, and visa and labour card cancellation tasks are opened for HR.</li>
</ol>

<p><strong>7.7 Compliance documents</strong></p>
<ol><li>Every document has a type, number, issue and expiry date, a secure file and an owner: the person responsible for renewing it.</li>
<li>Every night the system checks every expiry date and sets the status: Valid, Expiring Soon (90 days or less), Expired or Missing Data.</li>
<li>Reminders go to the owner and HR at 90, 60 and 30 days, and the dashboard shows the count.</li>
<li>The owner uploads the renewed document; HR verifies it and the status returns to Valid.</li>
</ol>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>8. Payroll calculation rules (UAE)</h2>

<p><strong>In simple words:</strong> This is the maths behind every payslip. Each line on a payslip comes from one rule with a short code (like BASIC or LOAN). HR can change a rule's rate in Settings without a programmer. The default values follow UAE labour law; where a company has its own policy, it says so.</p>
<p>Every rule below is a salary-rule row with a code, so HR can change rates in Settings without code changes. Defaults follow Federal Decree-Law 33/2021; confirm company policy where marked.</p>
<p><strong>8.1 Salary rules</strong></p>
<table><thead><tr><th><p>Code</p>
</th><th><p>Rule</p>
</th><th><p>Default formula</p>
</th></tr>
</thead><tbody><tr><td><p>BASIC</p>
</td><td><p>Basic salary</p>
</td><td><p>contract.basic × paid_days ÷ month_days</p>
</td></tr>
<tr><td><p>HRA / TRA / OTH</p>
</td><td><p>Housing, transport, other allowances</p>
</td><td><p>contract amount × paid_days ÷ month_days</p>
</td></tr>
<tr><td><p>GROSS</p>
</td><td><p>Gross</p>
</td><td><p>BASIC + all allowances</p>
</td></tr>
<tr><td><p>OT_NORMAL</p>
</td><td><p>Normal overtime</p>
</td><td><p>(basic ÷ 30 ÷ 8) × 1.25 × approved OT hours</p>
</td></tr>
<tr><td><p>OT_NIGHT</p>
</td><td><p>Overtime 10 pm–4 am</p>
</td><td><p>(basic ÷ 30 ÷ 8) × 1.5 × hours</p>
</td></tr>
<tr><td><p>OT_REST</p>
</td><td><p>Rest day / public holiday work</p>
</td><td><p>substitute day, or (basic ÷ 30 ÷ 8) × 1.5 × hours</p>
</td></tr>
<tr><td><p>ABS</p>
</td><td><p>Absence / unpaid leave</p>
</td><td><p>gross ÷ 30 × days (company policy: ÷ 30 or × 12 ÷ 365)</p>
</td></tr>
<tr><td><p>LATE</p>
</td><td><p>Late / early-out penalty</p>
</td><td><p>from attendance policy steps (days, or hours × hourly rate)</p>
</td></tr>
<tr><td><p>SICK_HALF</p>
</td><td><p>Sick leave days 16–45</p>
</td><td><p>50% of daily gross</p>
</td></tr>
<tr><td><p>SICK_NONE</p>
</td><td><p>Sick leave days 46–90</p>
</td><td><p>100% deduction</p>
</td></tr>
<tr><td><p>LOAN / ADV</p>
</td><td><p>Loan and advance recovery</p>
</td><td><p>monthly instalment from Salary Adjustments</p>
</td></tr>
<tr><td><p>GPSSA_EE</p>
</td><td><p>UAE National pension, employee share</p>
</td><td><p>% of contribution salary (set current GPSSA rates)</p>
</td></tr>
<tr><td><p>NET</p>
</td><td><p>Net to WPS</p>
</td><td><p>GROSS + earnings − deductions</p>
</td></tr>
</tbody></table>

<p>Unpaid days are taken either through paid days (BASIC and allowances) or through the ABS line. The salary structure decides which, so the same day is never deducted twice.</p>
<p><strong>8.2 Gratuity (end-of-service benefit)</strong></p>
<p>Paid for one year of service or more, on the last basic salary:</p>
<ul><li>Daily wage = basic × 12 ÷ 365</li>
<li>First 5 years: 21 days' wage per year</li>
<li>After 5 years: 30 days' wage per year</li>
<li>Cap: total gratuity cannot exceed 2 years' total wage</li>
<li>Part-years are pro-rated; unpaid absence days are excluded from service</li>
</ul>

<p><strong>8.3 Leave entitlements</strong></p>
<table><thead><tr><th><p>Leave</p>
</th><th><p>Entitlement</p>
</th><th><p>Pay</p>
</th></tr>
</thead><tbody><tr><td><p>Annual</p>
</td><td><p>2 days per month after 6 months of service; 30 days a year after 1 year</p>
</td><td><p>Full pay</p>
</td></tr>
<tr><td><p>Sick</p>
</td><td><p>90 days a year</p>
</td><td><p>First 15 days full pay, next 30 days half pay, last 45 days unpaid</p>
</td></tr>
<tr><td><p>Maternity</p>
</td><td><p>60 days</p>
</td><td><p>First 45 days full pay, next 15 days half pay</p>
</td></tr>
<tr><td><p>Leave encashment on exit</p>
</td><td><p>Unused annual leave days</p>
</td><td><p>Unused days × basic daily wage</p>
</td></tr>
</tbody></table>

<p><strong>8.4 Worked examples</strong></p>
<p>All employees are fictitious. Ahmed's contract: basic 5,000, housing 2,000, transport 500, other 500, so gross is AED 8,000. His hourly basic rate is 5,000 ÷ 30 ÷ 8 = AED 20.83 (the system uses the unrounded rate and rounds only the final amount).</p>
<table><thead><tr><th><p>#</p>
</th><th><p>Situation</p>
</th><th><p>Rule</p>
</th><th><p>Calculation</p>
</th><th><p>Result</p>
</th></tr>
</thead><tbody><tr><td><p>1</p>
</td><td><p>3 approved overtime hours on a normal day</p>
</td><td><p>OT_NORMAL</p>
</td><td><p>20.83 × 1.25 × 3</p>
</td><td><p>AED 78.13</p>
</td></tr>
<tr><td><p>2</p>
</td><td><p>2 hours worked between 10 pm and midnight</p>
</td><td><p>OT_NIGHT</p>
</td><td><p>20.83 × 1.5 × 2</p>
</td><td><p>AED 62.50</p>
</td></tr>
<tr><td><p>3</p>
</td><td><p>8 hours on a public holiday, paid instead of a substitute day</p>
</td><td><p>OT_REST</p>
</td><td><p>20.83 × 1.5 × 8</p>
</td><td><p>AED 250.00</p>
</td></tr>
<tr><td><p>4</p>
</td><td><p>2 days absent without approval</p>
</td><td><p>ABS (÷ 30)</p>
</td><td><p>8,000 ÷ 30 × 2</p>
</td><td><p>AED 533.33</p>
</td></tr>
<tr><td><p>5</p>
</td><td><p>Same, company uses × 12 ÷ 365</p>
</td><td><p>ABS (÷ 365)</p>
</td><td><p>8,000 × 12 ÷ 365 × 2</p>
</td><td><p>AED 526.03</p>
</td></tr>
<tr><td><p>6</p>
</td><td><p>Sick days 16 to 20 of the year (5 days)</p>
</td><td><p>SICK_HALF</p>
</td><td><p>8,000 ÷ 30 × 50% × 5</p>
</td><td><p>AED 666.67</p>
</td></tr>
<tr><td><p>7</p>
</td><td><p>Loan of 6,000 repaid at 500 a month</p>
</td><td><p>LOAN</p>
</td><td><p>monthly instalment</p>
</td><td><p>AED 500.00</p>
</td></tr>
<tr><td><p>8</p>
</td><td><p>One month with examples 1, 4 and 7</p>
</td><td><p>NET</p>
</td><td><p>8,000 + 78.13 − 533.33 − 500</p>
</td><td><p><strong>AED 7,044.80</strong></p>
</td></tr>
</tbody></table>

<p><strong>Gratuity examples</strong> (basic × 12 ÷ 365 = daily wage)</p>
<table><thead><tr><th><p>Employee</p>
</th><th><p>Basic</p>
</th><th><p>Service</p>
</th><th><p>Days of wage</p>
</th><th><p>Daily wage</p>
</th><th><p>Gratuity</p>
</th></tr>
</thead><tbody><tr><td><p>Sara</p>
</td><td><p>AED 5,000</p>
</td><td><p>3 years 6 months</p>
</td><td><p>21 × 3.5 = 73.5</p>
</td><td><p>164.38</p>
</td><td><p>AED 12,082.19</p>
</td></tr>
<tr><td><p>Omar</p>
</td><td><p>AED 6,000</p>
</td><td><p>7 years</p>
</td><td><p>21 × 5 + 30 × 2 = 165</p>
</td><td><p>197.26</p>
</td><td><p>AED 32,547.95</p>
</td></tr>
</tbody></table>

<p>Omar's cap is 2 years' total wage, far above his gratuity, so the cap does not apply. If Omar also has 12 unused leave days, his leave encashment is 12 × 197.26 = AED 2,367.12.</p>
<p><strong>Late penalty example.</strong> The penalty steps come from each company's attendance policy, so there is no single legal default. A company might set: first late arrival in the month a warning only; second late arrival 1 hour deducted; third and later half a day deducted. The LATE rule then multiplies hours or days by the employee's hourly or daily rate.</p>
<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>9. Company settings</h2>

<p><strong>In simple words:</strong> This is each company's rule book. The company admin (or HR Manager) changes these on screen. New companies start with the UAE defaults shown here.</p>
<p>The Settings menu holds eight setup screens, grouped below in four parts, and the Audit menu shows every change; every change is dated, logged and never alters a pay run that is already locked.</p>
<p><strong>9.1 Salary rules and structures</strong></p>
<table><thead><tr><th><p>Setting</p>
</th><th><p>What can be changed</p>
</th><th><p>Default</p>
</th></tr>
</thead><tbody><tr><td><p>Salary rule</p>
</td><td><p>Code, name, category (Basic, Allowance, Gross, Deduction, Net), sequence, condition, amount type (Fixed, %, Input, Formula), formula, shown on payslip, debit and credit account</p>
</td><td><p>The 13 rules in Section 8.1</p>
</td></tr>
<tr><td><p>Structure</p>
</td><td><p>Which rules apply, which unpaid entry types reduce pay, final-settlement flag</p>
</td><td><p>One monthly structure and one final-settlement structure</p>
</td></tr>
<tr><td><p>Absence divisor</p>
</td><td><p>÷ 30, or × 12 ÷ 365</p>
</td><td><p>÷ 30</p>
</td></tr>
<tr><td><p>Overtime rates</p>
</td><td><p>Normal, night, rest day and holiday multipliers; night window</p>
</td><td><p>1.25 normal; 1.5 night (10 pm–4 am), rest day and holiday</p>
</td></tr>
<tr><td><p>Rest-day work</p>
</td><td><p>Substitute day or paid overtime</p>
</td><td><p>Chosen per case by the approver</p>
</td></tr>
<tr><td><p>GPSSA</p>
</td><td><p>Employee and employer rates, contribution salary</p>
</td><td><p>Current GPSSA rates, for UAE Nationals only</p>
</td></tr>
</tbody></table>

<p><strong>9.2 Leave types and accrual plans</strong></p>
<table><thead><tr><th><p>Setting</p>
</th><th><p>What can be changed</p>
</th><th><p>Default</p>
</th></tr>
</thead><tbody><tr><td><p>Leave type</p>
</td><td><p>Name, paid or unpaid, maximum days, pay bands (full, half, none), attachment required, GM approval required</p>
</td><td><p>Annual, sick, maternity, unpaid</p>
</td></tr>
<tr><td><p>Accrual plan</p>
</td><td><p>Days earned per month, waiting period, yearly cap</p>
</td><td><p>Annual: 2 days a month after 6 months; 30 days a year after 1 year</p>
</td></tr>
<tr><td><p>Sick pay bands</p>
</td><td><p>Days at full, half and no pay</p>
</td><td><p>15 full, 30 half, 45 unpaid (90 a year)</p>
</td></tr>
<tr><td><p>Maternity pay bands</p>
</td><td><p>Days at full and half pay</p>
</td><td><p>45 full, 15 half (60 days)</p>
</td></tr>
<tr><td><p>Carry-over</p>
</td><td><p>Days that can move to next year and their expiry date</p>
</td><td><p>Company policy</p>
</td></tr>
<tr><td><p>GM flag</p>
</td><td><p>Leave types or lengths that need GM approval</p>
</td><td><p>Company policy</p>
</td></tr>
</tbody></table>

<p><strong>9.3 Shifts and attendance policies</strong></p>
<table><thead><tr><th><p>Setting</p>
</th><th><p>What can be changed</p>
</th><th><p>Default</p>
</th></tr>
</thead><tbody><tr><td><p>Shift</p>
</td><td><p>Name, start, end, break minutes, grace minutes, weekly off days</p>
</td><td><p>Company policy</p>
</td></tr>
<tr><td><p>Ramadan schedule</p>
</td><td><p>Shorter hours during Ramadan</p>
</td><td><p>Ramadan flag on the shift</p>
</td></tr>
<tr><td><p>Late grace</p>
</td><td><p>Minutes allowed before lateness counts</p>
</td><td><p>Company policy</p>
</td></tr>
<tr><td><p>Penalty steps</p>
</td><td><p>What each late arrival or early-out costs (warning, hours or days)</p>
</td><td><p>Company policy</p>
</td></tr>
<tr><td><p>Early-out rule</p>
</td><td><p>When leaving early counts, and the penalty</p>
</td><td><p>Company policy</p>
</td></tr>
<tr><td><p>OT eligibility</p>
</td><td><p>Which employees or grades may earn overtime</p>
</td><td><p>Company policy</p>
</td></tr>
</tbody></table>

<p><strong>9.4 Company, organisation, approvals and audit</strong></p>
<table><thead><tr><th><p>Setting</p>
</th><th><p>What can be changed</p>
</th><th><p>Default</p>
</th></tr>
</thead><tbody><tr><td><p>Company profile</p>
</td><td><p>Name in English and Arabic, trade licence number, logo, default language</p>
</td><td><p>Entered by Nextal when the company is created; edited by the company admin</p>
</td></tr>
<tr><td><p>Company visas</p>
</td><td><p>MOHRE employer ID and bank routing code for each WPS file</p>
</td><td><p>One per company visa</p>
</td></tr>
<tr><td><p>Branches</p>
</td><td><p>Branch name, emirate and the company visa it belongs to</p>
</td><td><p>Company policy</p>
</td></tr>
<tr><td><p>Departments and jobs</p>
</td><td><p>Department tree, job titles and grades, department managers (first leave approvers)</p>
</td><td><p>Company policy</p>
</td></tr>
<tr><td><p>Public holidays</p>
</td><td><p>The year's UAE public holidays, for all branches or one branch; a date can be added or moved when it is announced</p>
</td><td><p>Loaded each year by HR</p>
</td></tr>
<tr><td><p>Users and roles</p>
</td><td><p>Invite users, assign one or more of the seven roles, limit a role to a company visa, branch or department</p>
</td><td><p>Company admin only</p>
</td></tr>
<tr><td><p>Approval settings</p>
</td><td><p>For each request type (leave, overtime, salary adjustment, pay run, separation and final settlement): the steps, the role that approves each step and when an extra step applies (for example GM approval for leave longer than a set number of days)</p>
</td><td><p>The approval chains in Section 5</p>
</td></tr>
<tr><td><p>Payroll checks</p>
</td><td><p>Default cut-off day, and the change from last month that needs a reason in the variance review</p>
</td><td><p>Company policy</p>
</td></tr>
<tr><td><p>Document alerts</p>
</td><td><p>Alert days before expiry, the default owner for each document type, and who receives the digest</p>
</td><td><p>90, 60 and 30 days; owner is the HR Officer</p>
</td></tr>
<tr><td><p>Audit history</p>
</td><td><p>Who may view it; nobody can edit or delete it</p>
</td><td><p>HR Manager, GM and company admin</p>
</td></tr>
</tbody></table>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>10. Functional requirements</h2>

<p><strong>In simple words:</strong> The full list of things the software must do, written as short promises. Each has a code so it can be ticked off when it is built and tested. FR-PY3, for example, means "Payroll requirement number 3".</p>
<p>Release 1 has 77 functional requirements across 12 areas.</p>
<p><strong>Platform (PL)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-PL1</p>
</td><td><p>Platform admin creates a company with UAE default settings and invites its company admin</p>
</td></tr>
<tr><td><p>FR-PL2</p>
</td><td><p>Platform admin suspends or reactivates a company; suspended users cannot log in</p>
</td></tr>
<tr><td><p>FR-PL3</p>
</td><td><p>Platform admin cannot see employee or salary data unless the company grants time-limited support access</p>
</td></tr>
</tbody></table>

<p><strong>Dashboard (DS)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-DS1</p>
</td><td><p>Dashboard tiles for headcount, pending approvals, this month's payroll status, exceptions waiting (missing punches, unapproved overtime, validation errors) and documents expiring in 90 days; each tile opens the list behind it</p>
</td></tr>
<tr><td><p>FR-DS2</p>
</td><td><p>Tiles follow the user's role: salary figures appear only for salary roles, and managers see only their team</p>
</td></tr>
</tbody></table>

<p><strong>Employees (EM)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-EM1</p>
</td><td><p>Employee record with code (unique), English and Arabic names, legal name, status, joining date, residency type, company visa, branch, manager, HR manager, leave approver, personal and emergency details</p>
</td></tr>
<tr><td><p>FR-EM2</p>
</td><td><p>Statuses: Pre-Joined, New Joined, Active, Suspended, Transferred, Archived</p>
</td></tr>
<tr><td><p>FR-EM3</p>
</td><td><p>Contract versions with effective date, type (Limited/Unlimited), dates, probation, job, department, shift, basic and allowances, annual leave days, gratuity policy and notice periods; every salary change is a new dated version, listed in the Salary History tab</p>
</td></tr>
<tr><td><p>FR-EM4</p>
</td><td><p>UAE documents: passport, visa, Emirates ID, labour card, MOHRE contract and insurance, each with number, dates, file and owner</p>
</td></tr>
<tr><td><p>FR-EM5</p>
</td><td><p>Secure documents: files stored encrypted, opened only by permitted roles and the employee, and every view or download logged</p>
</td></tr>
<tr><td><p>FR-EM6</p>
</td><td><p>Bank accounts with IBAN, routing code and salary split %</p>
</td></tr>
<tr><td><p>FR-EM7</p>
</td><td><p>New employee setup: create, HR verification, contract and documents, schedule and bank, then Active; the status cannot become Active until contract, shift, bank account and labour card or person ID exist</p>
</td></tr>
<tr><td><p>FR-EM8</p>
</td><td><p>History tab showing every change with who, when, old value and new value</p>
</td></tr>
</tbody></table>

<p><strong>Attendance (AT)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-AT1</p>
</td><td><p>Import CSV or Excel from the device software; map device code to employee code</p>
</td></tr>
<tr><td><p>FR-AT2</p>
</td><td><p>Drop duplicate punches on import; importing the same file twice adds nothing</p>
</td></tr>
<tr><td><p>FR-AT3</p>
</td><td><p>Daily record: check-in, check-out, worked hours, break deducted, net hours, late minutes, early-out hours, penalty days, day type (work day, weekly off, public holiday, leave)</p>
</td></tr>
<tr><td><p>FR-AT4</p>
</td><td><p>Exceptions flagged: missing punch, late, early out, absent without leave, work on a rest day or public holiday, unknown device code</p>
</td></tr>
<tr><td><p>FR-AT5</p>
</td><td><p>Missing Punch Queue; HR edits record who, when and why; employees can submit a missing-punch request</p>
</td></tr>
<tr><td><p>FR-AT6</p>
</td><td><p>Late and early-out penalties from the employee's attendance policy steps</p>
</td></tr>
<tr><td><p>FR-AT7</p>
</td><td><p>Overtime requests created from attendance (above the policy's minimum minutes) or submitted by the employee</p>
</td></tr>
<tr><td><p>FR-AT8</p>
</td><td><p>Overtime approval as normal (1.25), night (1.5), rest day or holiday (1.5 or a substitute day), or refused</p>
</td></tr>
<tr><td><p>FR-AT9</p>
</td><td><p>Monthly review: manager confirms the team, then HR confirms; only confirmed days and approved overtime reach payroll</p>
</td></tr>
</tbody></table>

<p><strong>Leave and holidays (TO)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-TO1</p>
</td><td><p>Leave request for full days or a half day, with reason and attachment, by the employee or by HR for them</p>
</td></tr>
<tr><td><p>FR-TO2</p>
</td><td><p>On submit, check the balance and overlapping requests; public holidays and weekly off days are not counted</p>
</td></tr>
<tr><td><p>FR-TO3</p>
</td><td><p>Approval chain from Approval Settings: department manager, then HR, then GM when flagged</p>
</td></tr>
<tr><td><p>FR-TO4</p>
</td><td><p>Pay band applied per day (full, half, none) by leave type</p>
</td></tr>
<tr><td><p>FR-TO5</p>
</td><td><p>Allocations, regular or by accrual plan, with carry-over and expiry</p>
</td></tr>
<tr><td><p>FR-TO6</p>
</td><td><p>Balance reduced on approval and restored when a request is refused or cancelled</p>
</td></tr>
<tr><td><p>FR-TO7</p>
</td><td><p>Public holiday calendar per year, for all branches or one branch; a holiday is never counted as absence</p>
</td></tr>
<tr><td><p>FR-TO8</p>
</td><td><p>Approved days are marked on attendance and used by the pay run of that month</p>
</td></tr>
</tbody></table>

<p><strong>Payroll (PY)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-PY1</p>
</td><td><p>Pay run per month and company visa; status Draft, Calculated, Validated, Locked, Paid</p>
</td></tr>
<tr><td><p>FR-PY2</p>
</td><td><p>Cut-off date per run; anything approved after it moves to next month</p>
</td></tr>
<tr><td><p>FR-PY3</p>
</td><td><p>Validation before calculation: employee status, confirmed attendance, approved leave and overtime, contract and salary changes, approved deductions, bank details; blocking errors must be cleared</p>
</td></tr>
<tr><td><p>FR-PY4</p>
</td><td><p>Payslips computed from the salary rules in the employee's structure, using approved inputs only</p>
</td></tr>
<tr><td><p>FR-PY5</p>
</td><td><p>Salary adjustments (loan, advance, recurring deduction, bonus) approved before payroll uses them, with monthly amount and running balance</p>
</td></tr>
<tr><td><p>FR-PY6</p>
</td><td><p>Variance report comparing each employee with last month; changes above the set threshold need a reason</p>
</td></tr>
<tr><td><p>FR-PY7</p>
</td><td><p>Prepare (Payroll Officer), validate (HR Manager), approve (GM), pay (Finance)</p>
</td></tr>
<tr><td><p>FR-PY8</p>
</td><td><p>The approved run is locked before payslips and the WPS SIF are generated; a locked run cannot be edited</p>
</td></tr>
<tr><td><p>FR-PY9</p>
</td><td><p>Corrections are approved and made in a later run as a correction payslip linked to the original, with a full audit trail</p>
</td></tr>
<tr><td><p>FR-PY10</p>
</td><td><p>Payslip PDF in English with Arabic name, emailed or in the portal</p>
</td></tr>
<tr><td><p>FR-PY11</p>
</td><td><p>GPSSA pension for UAE Nationals</p>
</td></tr>
</tbody></table>

<p><strong>Offboarding (OF)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-OF1</p>
</td><td><p>Record resignation or termination with notice date and final working date; HR Manager approves</p>
</td></tr>
<tr><td><p>FR-OF2</p>
</td><td><p>Clearance checklist with one item per department, its owner, status and any amount due; the settlement cannot be approved until every item is cleared</p>
</td></tr>
<tr><td><p>FR-OF3</p>
</td><td><p>Calculate salary to the last day, notice shortfall, gratuity, unused leave encashment, loan balance, training-cost recovery and clearance amounts</p>
</td></tr>
<tr><td><p>FR-OF4</p>
</td><td><p>Freeze the figures in a settlement snapshot</p>
</td></tr>
<tr><td><p>FR-OF5</p>
</td><td><p>Final-settlement payslip using the final-settlement structure; HR Manager validates, GM approves, Finance pays</p>
</td></tr>
<tr><td><p>FR-OF6</p>
</td><td><p>Deactivate the employee's login after the final working date and set the status to Archived</p>
</td></tr>
<tr><td><p>FR-OF7</p>
</td><td><p>Open visa and labour card cancellation tasks</p>
</td></tr>
</tbody></table>

<p><strong>Compliance (CO)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-CO1</p>
</td><td><p>Every document has an owner responsible for renewing it</p>
</td></tr>
<tr><td><p>FR-CO2</p>
</td><td><p>Nightly expiry check of every document</p>
</td></tr>
<tr><td><p>FR-CO3</p>
</td><td><p>Status Valid, Expiring Soon (90 days or less), Expired or Missing Data</p>
</td></tr>
<tr><td><p>FR-CO4</p>
</td><td><p>Reminders to the owner and HR at 90, 60 and 30 days; count on the dashboard</p>
</td></tr>
</tbody></table>

<p><strong>Reports (RP)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-RP1</p>
</td><td><p>WPS SIF file per company visa, generated from a locked run only</p>
</td></tr>
<tr><td><p>FR-RP2</p>
</td><td><p>Payroll register per pay run, department and company visa, in Excel and PDF</p>
</td></tr>
<tr><td><p>FR-RP3</p>
</td><td><p>Variance report per pay run: each employee's gross, deductions and net against last month, with the reason for each large change</p>
</td></tr>
<tr><td><p>FR-RP4</p>
</td><td><p>Attendance report: late arrivals, early outs, absences and overtime by employee, department and month</p>
</td></tr>
<tr><td><p>FR-RP5</p>
</td><td><p>Leave report: leave taken, balances and upcoming leave by employee, department and leave type</p>
</td></tr>
<tr><td><p>FR-RP6</p>
</td><td><p>Gratuity provision and leave liability for Finance</p>
</td></tr>
<tr><td><p>FR-RP7</p>
</td><td><p>Headcount and attrition dashboard</p>
</td></tr>
<tr><td><p>FR-RP8</p>
</td><td><p>Accounting journal as CSV, debit and credit per salary rule by cost centre</p>
</td></tr>
</tbody></table>

<p><strong>Settings and audit (ST)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-ST1</p>
</td><td><p>Company profile, company visas and branches</p>
</td></tr>
<tr><td><p>FR-ST2</p>
</td><td><p>Departments and jobs</p>
</td></tr>
<tr><td><p>FR-ST3</p>
</td><td><p>Shifts and attendance policies (Section 9.3)</p>
</td></tr>
<tr><td><p>FR-ST4</p>
</td><td><p>Leave types, accrual plans and public holidays (Section 9.2 and 9.4)</p>
</td></tr>
<tr><td><p>FR-ST5</p>
</td><td><p>Salary rules and structures editable without code (Section 9.1)</p>
</td></tr>
<tr><td><p>FR-ST6</p>
</td><td><p>Users and roles</p>
</td></tr>
<tr><td><p>FR-ST7</p>
</td><td><p>Approval settings per request type</p>
</td></tr>
<tr><td><p>FR-ST8</p>
</td><td><p>Payroll checks (cut-off day, variance threshold) and document alerts</p>
</td></tr>
<tr><td><p>FR-ST9</p>
</td><td><p>Audit History screen filtered by user, record and date</p>
</td></tr>
<tr><td><p>FR-ST10</p>
</td><td><p>The audit log cannot be edited or deleted by anyone, admins included</p>
</td></tr>
</tbody></table>

<p><strong>Employee self-service (SS)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-SS1</p>
</td><td><p>View own profile, payslips, attendance and leave balance</p>
</td></tr>
<tr><td><p>FR-SS2</p>
</td><td><p>Submit leave, overtime and missing-punch requests and follow their status</p>
</td></tr>
<tr><td><p>FR-SS3</p>
</td><td><p>Upload documents; HR verifies them before they count</p>
</td></tr>
</tbody></table>

<p><strong>Cross-cutting (X)</strong></p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Requirement</p>
</th></tr>
</thead><tbody><tr><td><p>FR-X1</p>
</td><td><p>Every record belongs to one company; nothing crosses companies</p>
</td></tr>
<tr><td><p>FR-X2</p>
</td><td><p>Every approval, manual edit and login logged with user, time, old and new value</p>
</td></tr>
<tr><td><p>FR-X3</p>
</td><td><p>Salary figures visible only to Payroll, HR Manager, GM and Finance</p>
</td></tr>
<tr><td><p>FR-X4</p>
</td><td><p>English and Arabic interface with right-to-left layout</p>
</td></tr>
</tbody></table>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>11. Reports and integrations</h2>

<p><strong>In simple words:</strong> These are the files and reports the software produces. Two of them are needed from day one: the WPS file that pays salaries through the bank, and the import that reads the fingerprint machine. Everything else can follow.</p>
<p>The WPS SIF file and the biometric import are the two integrations needed on day one; the accounting export can follow.</p>
<table><thead><tr><th><p>Output / link</p>
</th><th><p>Format</p>
</th><th><p>Notes</p>
</th></tr>
</thead><tbody><tr><td><p>WPS SIF file</p>
</td><td><p>.SIF (CSV text)</p>
</td><td><p>Made only from a locked pay run. One EDR line per employee (labour card / person ID, bank routing code, IBAN, period, days, fixed and variable pay, leave days) and one SCR control line per employer ID; one file per company visa</p>
</td></tr>
<tr><td><p>Biometric import</p>
</td><td><p>CSV / Excel from the device software</p>
</td><td><p>Device code mapped to employee code; duplicate punches dropped and exceptions flagged on import</p>
</td></tr>
<tr><td><p>Payroll register</p>
</td><td><p>Excel + PDF</p>
</td><td><p>Per pay run, per department, per company visa</p>
</td></tr>
<tr><td><p>Variance report</p>
</td><td><p>Excel + PDF</p>
</td><td><p>Per pay run: each employee's gross, deductions and net against last month, the difference, and the reason for each change above the threshold</p>
</td></tr>
<tr><td><p>Attendance report</p>
</td><td><p>Excel</p>
</td><td><p>Late arrivals, early outs, absences, missing punches and overtime by employee, department and month</p>
</td></tr>
<tr><td><p>Leave report</p>
</td><td><p>Excel</p>
</td><td><p>Leave taken, balances and upcoming leave by employee, department and leave type</p>
</td></tr>
<tr><td><p>Payslip</p>
</td><td><p>PDF, emailed or in the portal</p>
</td><td><p>English, with the employee's Arabic name</p>
</td></tr>
<tr><td><p>Gratuity provision</p>
</td><td><p>Excel</p>
</td><td><p>Monthly accrual per employee, for Finance</p>
</td></tr>
<tr><td><p>Leave liability</p>
</td><td><p>Excel</p>
</td><td><p>Unused leave × daily basic</p>
</td></tr>
<tr><td><p>Document expiry alerts</p>
</td><td><p>Dashboard + email</p>
</td><td><p>90, 60 and 30 days before expiry, to the document owner and HR</p>
</td></tr>
<tr><td><p>Accounting journal</p>
</td><td><p>CSV export (API later)</p>
</td><td><p>Debit and credit per salary rule, by cost centre</p>
</td></tr>
<tr><td><p>Headcount and attrition</p>
</td><td><p>Dashboard</p>
</td><td><p>Joiners, leavers, by department and nationality</p>
</td></tr>
</tbody></table>

<p><strong>Checks built into the WPS file</strong></p>
<ul><li>The SCR control line total must equal the sum of all EDR lines, or the file is not produced.</li>
<li>Every employee in the file must have an IBAN, a bank routing code and a labour card or person ID.</li>
<li>Each EDR's net must match the employee's approved payslip.</li>
<li>The exact field layout is confirmed with the company's bank or exchange house before go-live.</li>
</ul>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>12. System architecture</h2>

<p><strong>In simple words:</strong> This is how the software is put together. The screens people use (top) talk to a server in the middle that does the work. A platform layer checks which company each person belongs to, so nobody can see another company's data. Everything is stored securely in the UAE (bottom).</p>
<p>One web portal and one API serve every company; a platform layer keeps companies apart, and four business modules sit on a shared HR core.</p>
<p>[IMAGE]</p>
<p>system architecture · portal, API, platform layer, modules, shared core, storage</p>
<p><strong>Tech stack</strong></p>
<table><thead><tr><th><p>Layer</p>
</th><th><p>Technology</p>
</th><th><p>Why</p>
</th></tr>
</thead><tbody><tr><td><p>Frontend</p>
</td><td><p>React + TypeScript + Vite, Tailwind CSS</p>
</td><td><p>Fast to build; good right-to-left support</p>
</td></tr>
<tr><td><p>Translations</p>
</td><td><p>i18next</p>
</td><td><p>English and Arabic with RTL layout</p>
</td></tr>
<tr><td><p>Backend</p>
</td><td><p>Node.js 20 LTS + Express + TypeScript</p>
</td><td><p>One language across frontend and backend</p>
</td></tr>
<tr><td><p>Security</p>
</td><td><p>Helmet, CORS, rate limiting, Zod validation</p>
</td><td><p>Blocks common attacks and bad input</p>
</td></tr>
<tr><td><p>Data</p>
</td><td><p>PostgreSQL 16 with Prisma</p>
</td><td><p>Exact decimal arithmetic for money</p>
</td></tr>
<tr><td><p>Login</p>
</td><td><p>JWT tokens, bcrypt password hashing</p>
</td><td><p>Standard and secure</p>
</td></tr>
<tr><td><p>Rule engine</p>
</td><td><p>Salary rules evaluated in sequence from Settings</p>
</td><td><p>Rates change without new code</p>
</td></tr>
<tr><td><p>Scheduled jobs</p>
</td><td><p>Nightly job runner</p>
</td><td><p>Document expiry checks and email digests</p>
</td></tr>
<tr><td><p>Excel and PDF</p>
</td><td><p>ExcelJS, Puppeteer</p>
</td><td><p>Imports, reports, payslips with Arabic text</p>
</td></tr>
<tr><td><p>Testing</p>
</td><td><p>Jest, Supertest, Playwright</p>
</td><td><p>Rules, API and end-to-end flows</p>
</td></tr>
<tr><td><p>Hosting</p>
</td><td><p>AWS me-central-1 (UAE) or Azure UAE North</p>
</td><td><p>Data stays in the UAE</p>
</td></tr>
</tbody></table>

<p><strong>API overview</strong></p>
<p>All screens call one REST API under /api/v1, documented with Swagger. Each call carries the user's login token and the selected company, and the server checks role and company before reading or writing anything.</p>
<table><thead><tr><th><p>Area</p>
</th><th><p>Example endpoints</p>
</th></tr>
</thead><tbody><tr><td><p>Platform</p>
</td><td><p>/platform/companies, /platform/companies/{id}/admins</p>
</td></tr>
<tr><td><p>Dashboard</p>
</td><td><p>/dashboard/summary</p>
</td></tr>
<tr><td><p>Employees</p>
</td><td><p>/employees, /employees/{id}/verify, /employees/{id}/activate, /employees/{id}/contracts, /employees/{id}/documents, /employees/{id}/bank-accounts</p>
</td></tr>
<tr><td><p>Attendance</p>
</td><td><p>/attendance/import, /attendance/grid, /attendance/exceptions, /attendance/missing-punches, /attendance/review</p>
</td></tr>
<tr><td><p>Overtime</p>
</td><td><p>/overtime-requests, /overtime-requests/{id}/approve</p>
</td></tr>
<tr><td><p>Leave and holidays</p>
</td><td><p>/leave-requests, /leave-requests/{id}/approve, /leave-balances, /public-holidays</p>
</td></tr>
<tr><td><p>Payroll</p>
</td><td><p>/pay-runs, /pay-runs/{id}/validate-inputs, /pay-runs/{id}/calculate, /pay-runs/{id}/variances, /pay-runs/{id}/validate, /pay-runs/{id}/approve, /pay-runs/{id}/lock, /pay-runs/{id}/mark-paid, /salary-adjustments</p>
</td></tr>
<tr><td><p>Offboarding</p>
</td><td><p>/separations, /separations/{id}/clearance, /separations/{id}/settlement, /separations/{id}/deactivate</p>
</td></tr>
<tr><td><p>Compliance</p>
</td><td><p>/documents/expiring</p>
</td></tr>
<tr><td><p>Reports</p>
</td><td><p>/reports/wps-sif, /reports/payroll-register, /reports/variance, /reports/attendance, /reports/leave, /reports/gratuity-provision, /reports/leave-liability, /reports/accounting</p>
</td></tr>
<tr><td><p>Settings</p>
</td><td><p>/company, /company-visas, /branches, /departments, /jobs, /salary-rules, /structures, /leave-types, /accrual-plans, /shifts, /attendance-policies, /users, /roles, /approval-flows</p>
</td></tr>
<tr><td><p>Audit</p>
</td><td><p>/audit-logs</p>
</td></tr>
<tr><td><p>Self-service</p>
</td><td><p>/me/profile, /me/payslips, /me/attendance, /me/leave, /me/requests, /me/documents</p>
</td></tr>
</tbody></table>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>13. Non-functional requirements</h2>

<p><strong>In simple words:</strong> Section 10 says <em>what</em> the software does. This section says <em>how well</em>: safely, fast enough, in Arabic too, and with every change recorded. Each line has a target we can check.</p>
<p>The software must keep companies apart, protect salary data, be fast enough for month-end and record every change.</p>
<table><thead><tr><th><p>ID</p>
</th><th><p>Area</p>
</th><th><p>Requirement</p>
</th><th><p>Target</p>
</th></tr>
</thead><tbody><tr><td><p>NFR-1</p>
</td><td><p>Company isolation</p>
</td><td><p>Every request checked against the user's company</p>
</td><td><p>No cross-company access in any test</p>
</td></tr>
<tr><td><p>NFR-2</p>
</td><td><p>Salary privacy</p>
</td><td><p>Salary figures shown only to Payroll, HR Manager, GM and Finance</p>
</td><td><p>Enforced on screens and API</p>
</td></tr>
<tr><td><p>NFR-3</p>
</td><td><p>Security</p>
</td><td><p>HTTPS only; hashed passwords; lockout after 5 failed logins</p>
</td><td><p>Session expires after 8 hours</p>
</td></tr>
<tr><td><p>NFR-4</p>
</td><td><p>Audit</p>
</td><td><p>Every approval and manual edit logged with user, time, old and new value</p>
</td><td><p>Log cannot be edited</p>
</td></tr>
<tr><td><p>NFR-5</p>
</td><td><p>Accuracy</p>
</td><td><p>Money held as exact decimals; rounding only on final amounts</p>
</td><td><p>No floating-point maths</p>
</td></tr>
<tr><td><p>NFR-6</p>
</td><td><p>Locking</p>
</td><td><p>Approved payslips and settlement snapshots cannot change</p>
</td><td><p>Tested every build</p>
</td></tr>
<tr><td><p>NFR-7</p>
</td><td><p>Performance</p>
</td><td><p>Pay run for 500 employees computed</p>
</td><td><p>Under 30 seconds</p>
</td></tr>
<tr><td><p>NFR-8</p>
</td><td><p>Performance</p>
</td><td><p>One month of punches (about 10,000 rows) imported</p>
</td><td><p>Under 30 seconds</p>
</td></tr>
<tr><td><p>NFR-9</p>
</td><td><p>Performance</p>
</td><td><p>Normal screens</p>
</td><td><p>Under 2 seconds</p>
</td></tr>
<tr><td><p>NFR-10</p>
</td><td><p>Reliability</p>
</td><td><p>Nightly expiry job and daily backups</p>
</td><td><p>Backups kept 30 days; restore tested</p>
</td></tr>
<tr><td><p>NFR-11</p>
</td><td><p>Language</p>
</td><td><p>English and Arabic screens; Arabic names on payslips</p>
</td><td><p>Full RTL support</p>
</td></tr>
<tr><td><p>NFR-12</p>
</td><td><p>Data residency</p>
</td><td><p>All data and files in a UAE region</p>
</td><td><p>UAE only</p>
</td></tr>
<tr><td><p>NFR-13</p>
</td><td><p>Maintainability</p>
</td><td><p>No rate or threshold hard-coded</p>
</td><td><p>All in Settings</p>
</td></tr>
</tbody></table>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>14. Sprint plan</h2>

<p><strong>In simple words:</strong> The build is split into two sprints. After 10 working days a company can already run a real payroll month (the MVP). The next 4 days add employees leaving the company, document expiry alerts and the remaining reports, then everything is tested and handed over.</p>
<p>Release 1 takes 14 working days: Sprint 1 (Days 1–10) delivers a working MVP, and Sprint 2 (Days 11–14) completes the scope.</p>
<p>[IMAGE]</p>
<p>sprint plan · 14 working days, MVP after day 10</p>
<p>The dates assume a start on Monday 19 October 2026 and a Monday-to-Friday week. If the start moves, the days move with it.</p>
<p><strong>What each sprint delivers</strong></p>
<table><thead><tr><th><p>Sprint</p>
</th><th><p>Days</p>
</th><th><p>Goal</p>
</th><th><p>Demo at the end</p>
</th></tr>
</thead><tbody><tr><td><p>Sprint 1</p>
</td><td><p>1–10</p>
</td><td><p>A company can be set up and run one full payroll month</p>
</td><td><p>Create a company, configure it, import punches, approve leave and OT, run payroll, download payslips and the WPS SIF</p>
</td></tr>
<tr><td><p>Sprint 2</p>
</td><td><p>11–14</p>
</td><td><p>Exit, compliance and finance reports; production-ready</p>
</td><td><p>Settle a leaving employee with gratuity; show document expiry alerts; hand over</p>
</td></tr>
</tbody></table>

<p><strong>Day-by-day plan</strong></p>
<table><thead><tr><th><p>Day</p>
</th><th><p>Date</p>
</th><th><p>Focus</p>
</th><th><p>Work</p>
</th><th><p>Done when</p>
</th></tr>
</thead><tbody><tr><td><p>1</p>
</td><td><p>Mon 19 Oct</p>
</td><td><p>Foundation</p>
</td><td><p>Repo, CI, environments; database schema (Appendix A); frontend shell in English and Arabic; platform layer with company isolation; audit log written on every change</p>
</td><td><p>App runs; isolation test passes</p>
</td></tr>
<tr><td><p>2</p>
</td><td><p>Tue 20 Oct</p>
</td><td><p>Login and roles</p>
</td><td><p>Login, invites, password reset, lockout; platform admin screens; 7 company roles and permissions; approval engine driven by Approval Settings</p>
</td><td><p>Gate 1: Nextal creates a company; its admin logs in</p>
</td></tr>
<tr><td><p>3</p>
</td><td><p>Wed 21 Oct</p>
</td><td><p>Settings</p>
</td><td><p>Company profile, company visas, branches, departments and jobs, shifts and attendance policies, leave types and accrual plans, public holidays, salary rules and structures with UAE defaults, approval settings</p>
</td><td><p>All Settings screens save and load</p>
</td></tr>
<tr><td><p>4</p>
</td><td><p>Thu 22 Oct</p>
</td><td><p>Employees</p>
</td><td><p>Employee list, 7-tab profile with salary history, new employee setup with HR verification and the Active check, contract versions, secure documents with owners, bank and WPS details, History</p>
</td><td><p>Gate 2: demo company fully configured with test employees</p>
</td></tr>
<tr><td><p>5</p>
</td><td><p>Fri 23 Oct</p>
</td><td><p>Attendance</p>
</td><td><p>Biometric import with device mapping and duplicate checks; daily grid; exception flags; late and early-out penalty steps</p>
</td><td><p>A month of punches imported and graded</p>
</td></tr>
<tr><td><p>6</p>
</td><td><p>Mon 26 Oct</p>
</td><td><p>Time off and OT</p>
</td><td><p>Missing Punch Queue; overtime requests from import and from employees, approval (normal, night, rest day, holiday or substitute day); manager and HR attendance review; leave requests with balance check, three-step approval, pay bands, balance update and accruals</p>
</td><td><p>Confirmed attendance and approved items flow into monthly inputs</p>
</td></tr>
<tr><td><p>7</p>
</td><td><p>Tue 27 Oct</p>
</td><td><p>Payroll engine</p>
</td><td><p>Salary rule engine; worked days; BASIC to NET; absence, sick bands, GPSSA; salary adjustments with approval (loans, advances, deductions, bonuses)</p>
</td><td><p>Engine tests pass for every rule in Section 8.1</p>
</td></tr>
<tr><td><p>8</p>
</td><td><p>Wed 28 Oct</p>
</td><td><p>Pay runs</p>
</td><td><p>Pay run per company visa; cut-off; input validation; Draft → Calculated → Validated → Locked → Paid; variance review; HR Manager and GM approval; correction payslips</p>
</td><td><p>A pay run is validated, approved and locked</p>
</td></tr>
<tr><td><p>9</p>
</td><td><p>Thu 29 Oct</p>
</td><td><p>Payroll outputs</p>
</td><td><p>Payslip PDF and WPS SIF from the locked run with EDR/SCR checks; payroll register and variance report; self-service with requests and document upload; dashboard with payroll status and exceptions</p>
</td><td><p>Gate 3: first pay run locked; SIF and payslips produced</p>
</td></tr>
<tr><td><p>10</p>
</td><td><p>Fri 30 Oct</p>
</td><td><p>MVP test and demo</p>
</td><td><p>End-to-end test with two demo companies; fix defects; client demo</p>
</td><td><p>Gate 4: MVP ready</p>
</td></tr>
<tr><td><p>11</p>
</td><td><p>Mon 2 Nov</p>
</td><td><p>Offboarding</p>
</td><td><p>Resignation and termination with approval, clearance checklist by department, notice shortfall, gratuity with 5-year step and cap, leave encashment, loan and training-cost recovery</p>
</td><td><p>Gratuity and clearance tests pass</p>
</td></tr>
<tr><td><p>12</p>
</td><td><p>Tue 3 Nov</p>
</td><td><p>Final settlement</p>
</td><td><p>Settlement snapshot, final-settlement structure and payslip, HR Manager and GM approval, access deactivation, cancellation tasks</p>
</td><td><p>One settlement approved, paid and access switched off</p>
</td></tr>
<tr><td><p>13</p>
</td><td><p>Wed 4 Nov</p>
</td><td><p>Compliance, reports and audit</p>
</td><td><p>Nightly expiry job, reminders to owners and HR at 90/60/30 days, expiry tracker; attendance and leave reports; gratuity provision, leave liability, headcount, accounting CSV; Audit History screen</p>
</td><td><p>Alerts, reports and audit history produced</p>
</td></tr>
<tr><td><p>14</p>
</td><td><p>Thu 5 Nov</p>
</td><td><p>Hardening and handover</p>
</td><td><p>Full regression, security and performance checks, deploy to UAE staging, user guides, recorded demo</p>
</td><td><p>Gate 5: submitted</p>
</td></tr>
</tbody></table>

<p><strong>How the work is run</strong></p>
<ul><li><strong>Daily:</strong> a 15-minute plan in the morning and a short progress note at the end of the day: done, blocked, next.</li>
<li><strong>Gates:</strong> each gate is a short demo to the project lead. If a gate slips, scope is cut from the end of the plan, never from testing.</li>
<li><strong>Definition of done:</strong> the feature works in English and Arabic, respects roles, writes to the audit log and has passing tests.</li>
<li><strong>Sprint review:</strong> a client demo on Day 10 and Day 14.</li>
</ul>

<p><strong>If time runs short</strong></p>
<p>The MVP on Day 10 stands on its own. If Sprint 2 is squeezed, the accounting CSV and the headcount dashboard move to a later release first; offboarding and the WPS checks never do.</p>
<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>15. Testing plan</h2>

<p><strong>In simple words:</strong> Before we call anything finished, we prove the numbers are right. Each test is a small example with a known answer, like a sum in a maths book. The computer runs them all every time the code changes.</p>
<p>Release 1 is accepted when all 37 acceptance tests pass on two fictitious demo companies.</p>
<p><strong>Test levels</strong></p>
<table><thead><tr><th><p>Level</p>
</th><th><p>What is tested</p>
</th><th><p>Tool</p>
</th><th><p>When</p>
</th></tr>
</thead><tbody><tr><td><p>Unit</p>
</td><td><p>Every salary rule, gratuity, accrual and penalty step</p>
</td><td><p>Jest</p>
</td><td><p>Every commit</p>
</td></tr>
<tr><td><p>API</p>
</td><td><p>Login, roles, company isolation, salary privacy</p>
</td><td><p>Jest + Supertest</p>
</td><td><p>Every build</p>
</td></tr>
<tr><td><p>Acceptance</p>
</td><td><p>The 37 cases below</p>
</td><td><p>Jest</p>
</td><td><p>Every build</p>
</td></tr>
<tr><td><p>End-to-end</p>
</td><td><p>Onboarding, a payroll month, a final settlement</p>
</td><td><p>Playwright</p>
</td><td><p>Days 10 and 14</p>
</td></tr>
<tr><td><p>User acceptance</p>
</td><td><p>Walk-through by HR, payroll, GM and finance users</p>
</td><td><p>Checklist</p>
</td><td><p>Days 10 and 14</p>
</td></tr>
</tbody></table>

<p><strong>Acceptance tests</strong> (basic 5,000 and gross 8,000 unless stated)</p>
<table><thead><tr><th><p>#</p>
</th><th><p>Given</p>
</th><th><p>Expected</p>
</th></tr>
</thead><tbody><tr><td><p>T1</p>
</td><td><p>Platform admin creates Company B</p>
</td><td><p>Company B starts with UAE defaults; its admin is invited</p>
</td></tr>
<tr><td><p>T2</p>
</td><td><p>A Company A user asks for a Company B employee</p>
</td><td><p>Refused and logged</p>
</td></tr>
<tr><td><p>T3</p>
</td><td><p>Department Manager opens a team member's profile</p>
</td><td><p>Salary and bank tabs are hidden</p>
</td></tr>
<tr><td><p>T4</p>
</td><td><p>Biometric file imported twice</p>
</td><td><p>No duplicate punches</p>
</td></tr>
<tr><td><p>T5</p>
</td><td><p>Day with check-in only</p>
</td><td><p>Appears in the Missing Punch Queue</p>
</td></tr>
<tr><td><p>T6</p>
</td><td><p>3 approved OT hours, normal day</p>
</td><td><p>AED 78.13</p>
</td></tr>
<tr><td><p>T7</p>
</td><td><p>2 OT hours between 10 pm and midnight</p>
</td><td><p>AED 62.50 at 1.5×</p>
</td></tr>
<tr><td><p>T8</p>
</td><td><p>8 hours on a public holiday, paid</p>
</td><td><p>AED 250.00</p>
</td></tr>
<tr><td><p>T9</p>
</td><td><p>Same holiday, substitute day chosen</p>
</td><td><p>No pay; one substitute day added</p>
</td></tr>
<tr><td><p>T10</p>
</td><td><p>OT not approved by cut-off</p>
</td><td><p>Not paid; carried to next month's inputs</p>
</td></tr>
<tr><td><p>T11</p>
</td><td><p>2 days unpaid absence, ÷ 30 policy</p>
</td><td><p>AED 533.33 deducted</p>
</td></tr>
<tr><td><p>T12</p>
</td><td><p>Same, × 12 ÷ 365 policy</p>
</td><td><p>AED 526.03 deducted</p>
</td></tr>
<tr><td><p>T13</p>
</td><td><p>Sick days 16–20 of the year</p>
</td><td><p>AED 666.67 deducted (half pay)</p>
</td></tr>
<tr><td><p>T14</p>
</td><td><p>Sick day 46 of the year</p>
</td><td><p>Full day deducted</p>
</td></tr>
<tr><td><p>T15</p>
</td><td><p>Leave request on a flagged type</p>
</td><td><p>Needs manager, HR and GM approval before it reaches payroll</p>
</td></tr>
<tr><td><p>T16</p>
</td><td><p>Employee with 4 months' service applies for annual leave</p>
</td><td><p>No accrued balance yet; request blocked or unpaid per policy</p>
</td></tr>
<tr><td><p>T17</p>
</td><td><p>Employee with 8 months' service</p>
</td><td><p>16 annual leave days (2 for each month of service, once past 6 months)</p>
</td></tr>
<tr><td><p>T18</p>
</td><td><p>Loan 6,000 at 500 a month, third month</p>
</td><td><p>AED 500 deducted; balance AED 4,500</p>
</td></tr>
<tr><td><p>T19</p>
</td><td><p>Ahmed's month (T6, T11, T18)</p>
</td><td><p>Net AED 7,044.80</p>
</td></tr>
<tr><td><p>T20</p>
</td><td><p>Locked run, then a mistake found</p>
</td><td><p>Payslip cannot be edited; an approved correction payslip in a later run, linked to the original and shown in the audit history</p>
</td></tr>
<tr><td><p>T21</p>
</td><td><p>Gratuity, basic 5,000, 3 years 6 months</p>
</td><td><p>AED 12,082.19</p>
</td></tr>
<tr><td><p>T22</p>
</td><td><p>Gratuity, basic 6,000, 7 years</p>
</td><td><p>AED 32,547.95</p>
</td></tr>
<tr><td><p>T23</p>
</td><td><p>Gratuity, 11 months' service</p>
</td><td><p>Not eligible; AED 0</p>
</td></tr>
<tr><td><p>T24</p>
</td><td><p>Leave encashment, 12 days, basic 6,000</p>
</td><td><p>AED 2,367.12</p>
</td></tr>
<tr><td><p>T25</p>
</td><td><p>Visa expiring in 85 days</p>
</td><td><p>Status Expiring Soon; reminder sent to the document owner and HR</p>
</td></tr>
<tr><td><p>T26</p>
</td><td><p>SIF for one company visa</p>
</td><td><p>SCR total equals the sum of EDR lines; each EDR matches its payslip</p>
</td></tr>
<tr><td><p>T27</p>
</td><td><p>New employee with no bank account</p>
</td><td><p>Cannot be set to Active</p>
</td></tr>
<tr><td><p>T28</p>
</td><td><p>Pay run with one employee missing an IBAN</p>
</td><td><p>Validation lists the error; the run cannot be calculated until it is fixed</p>
</td></tr>
<tr><td><p>T29</p>
</td><td><p>Employee's net is 25% higher than last month, threshold 10%</p>
</td><td><p>Shown in the variance report; the run cannot be validated until a reason is entered</p>
</td></tr>
<tr><td><p>T30</p>
</td><td><p>Ask for the SIF of a run that is Validated but not Locked</p>
</td><td><p>Refused; the SIF is made only from a locked run</p>
</td></tr>
<tr><td><p>T31</p>
</td><td><p>Annual leave Monday to Friday with a public holiday on Wednesday</p>
</td><td><p>4 days taken from the balance</p>
</td></tr>
<tr><td><p>T32</p>
</td><td><p>Approved 5-day leave is cancelled</p>
</td><td><p>Balance goes back up by 5 days</p>
</td></tr>
<tr><td><p>T33</p>
</td><td><p>Employee requests 2 OT hours in self-service; manager approves as normal OT</p>
</td><td><p>AED 52.08 in the next pay run inputs</p>
</td></tr>
<tr><td><p>T34</p>
</td><td><p>Department manager has not confirmed the team's attendance at cut-off</p>
</td><td><p>Those days are held for next month; validation shows them</p>
</td></tr>
<tr><td><p>T35</p>
</td><td><p>Settlement with the laptop item not cleared</p>
</td><td><p>Settlement cannot be approved</p>
</td></tr>
<tr><td><p>T36</p>
</td><td><p>Settlement approved and the final working date has passed</p>
</td><td><p>Login refused; status Archived</p>
</td></tr>
<tr><td><p>T37</p>
</td><td><p>Salary adjustment entered but not approved</p>
</td><td><p>Not used by the pay run</p>
</td></tr>
</tbody></table>

<p><strong>Exit criteria:</strong> all 37 tests pass, both demo companies complete a payroll month and a final settlement, and there are no open critical defects.</p>
<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>16. Deployment, risks and open questions</h2>

<p><strong>In simple words:</strong> Where the software will run, what we hand over at the end, what could go wrong and how we'll deal with it, and the questions the client still needs to answer.</p>
<p>Release 1 is deployed to a UAE-hosted staging environment on Day 14 and handed over with demo companies, guides and a recorded demo.</p>
<p><strong>Environments</strong></p>
<table><thead><tr><th><p>Environment</p>
</th><th><p>Purpose</p>
</th><th><p>Data</p>
</th></tr>
</thead><tbody><tr><td><p>Development</p>
</td><td><p>Building and unit tests</p>
</td><td><p>Fictitious demo companies</p>
</td></tr>
<tr><td><p>Staging (UAE region)</p>
</td><td><p>Demos, client review, user testing</p>
</td><td><p>Fictitious demo companies</p>
</td></tr>
<tr><td><p>Production (UAE region)</p>
</td><td><p>Live use after a trial month</p>
</td><td><p>Real client companies</p>
</td></tr>
</tbody></table>

<p><strong>Handover package</strong></p>
<ul><li>☐ Source code with setup guide</li>
<li>☐ This document</li>
<li>☐ API documentation (Swagger)</li>
<li>☐ Test report with all 37 acceptance tests</li>
<li>☐ User guides for platform admin, company admin, HR, payroll, managers, GM and finance</li>
<li>☐ Recorded demo: company setup, a payroll month and a final settlement</li>
</ul>

<p><strong>Path to go-live for each client company</strong></p>
<ol><li>Nextal creates the company; the company admin configures it.</li>
<li>One trial month runs alongside the company's current payroll.</li>
<li>The bank or exchange house checks a test WPS SIF file.</li>
<li>Go-live once every difference is explained and signed off.</li>
</ol>

<p><strong>Risks</strong></p>
<table><thead><tr><th><p>Risk</p>
</th><th><p>Effect</p>
</th><th><p>How we handle it</p>
</th></tr>
</thead><tbody><tr><td><p>14 days is tight for this scope</p>
</td><td><p>Features thin or late</p>
</td><td><p>MVP first; Sprint 2 items ordered so the least critical drop first</p>
</td></tr>
<tr><td><p>A company's policy is not yet a setting</p>
</td><td><p>Code change for one client</p>
</td><td><p>Rules engine with formulas; new options added as settings, never one-off code</p>
</td></tr>
<tr><td><p>Bank rejects the SIF</p>
</td><td><p>Salaries paid late</p>
</td><td><p>Built-in EDR/SCR checks; test file with each bank before go-live</p>
</td></tr>
<tr><td><p>Device export formats differ</p>
</td><td><p>Import fails</p>
</td><td><p>Device-code mapping per company; test with each company's file during onboarding</p>
</td></tr>
<tr><td><p>Wrong rule rate entered</p>
</td><td><p>Wrong pay</p>
</td><td><p>Dated, logged settings; trial month; HR and GM review before payment</p>
</td></tr>
<tr><td><p>Legal rates change (e.g. GPSSA)</p>
</td><td><p>Wrong deductions</p>
</td><td><p>Rates held in Settings and reviewed at each change of law</p>
</td></tr>
<tr><td><p>Single developer</p>
</td><td><p>Delays</p>
</td><td><p>Daily progress notes; gates with the project lead</p>
</td></tr>
</tbody></table>

<p><strong>Open questions for the client</strong></p>
<ul><li>☐ Late and early-out penalty steps: what does each company's policy say?</li>
<li>☐ Absence divisor: ÷ 30 or × 12 ÷ 365?</li>
<li>☐ Rest-day and holiday work: substitute day or paid overtime by default?</li>
<li>☐ Which leave types and lengths need GM approval?</li>
<li>☐ Carry-over limits and expiry for annual leave?</li>
<li>☐ Current GPSSA contribution rates and contribution salary definition?</li>
<li>☐ Training-cost recovery rules on resignation?</li>
<li>☐ Which banks or exchange houses receive the WPS files?</li>
<li>☐ Is a CSV journal enough at first, and which accounting system follows?</li>
</ul>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>Appendix A. Database design</h2>

<p><strong>In simple words:</strong> A database is a set of tables, a bit like spreadsheets. Each row is one thing (one employee, one leave request) and each column is one fact about it. Tables point to each other by ID, the same way a paper leave form names the employee it belongs to. This appendix shows every table the software needs, every column in it, why the table exists and how the tables connect.</p>
<p>The database has 43 tables in 7 groups, built in PostgreSQL 16 through Prisma. Table and column names are written exactly as they will be created.</p>
<p><strong>A.1 How to read this appendix</strong></p>
<p>Each group has a picture with one card per table, followed by a short note on each table (why it exists and what it is used for), its full column list, and a table explaining how the group's tables connect.</p>
<table><thead><tr><th><p>Mark</p>
</th><th><p>Name</p>
</th><th><p>Meaning</p>
</th></tr>
</thead><tbody><tr><td><p>PK</p>
</td><td><p>Primary key</p>
</td><td><p>The column that identifies each row; no two rows share it. Almost always id</p>
</td></tr>
<tr><td><p>FK</p>
</td><td><p>Foreign key</p>
</td><td><p>A column that points to a row in another table, shown as → table. The database refuses an ID that does not exist</p>
</td></tr>
<tr><td><p>UK</p>
</td><td><p>Unique</p>
</td><td><p>No two rows may hold the same value (within the company, or across the platform; see rule 7)</p>
</td></tr>
</tbody></table>

<table><thead><tr><th><p>Type</p>
</th><th><p>What it stores</p>
</th></tr>
</thead><tbody><tr><td><p>uuid</p>
</td><td><p>A random ID such as 3f2a… Used for every id and every FK</p>
</td></tr>
<tr><td><p>varchar(n) / text</p>
</td><td><p>Text, up to n characters / any length</p>
</td></tr>
<tr><td><p>numeric(12,2)</p>
</td><td><p>Money and amounts as exact decimals, never floating point</p>
</td></tr>
<tr><td><p>smallint / integer / bigserial</p>
</td><td><p>Whole numbers; bigserial counts up by itself, for very large tables</p>
</td></tr>
<tr><td><p>date / time / timestamptz</p>
</td><td><p>A day / a clock time / an exact moment, stored in UTC and shown in UAE time</p>
</td></tr>
<tr><td><p>boolean</p>
</td><td><p>True or false</p>
</td></tr>
<tr><td><p>jsonb</p>
</td><td><p>A small structured block, for settings that vary (pay bands, permissions, snapshots)</p>
</td></tr>
<tr><td><p>smallint[] / text[]</p>
</td><td><p>A short list of values in one column</p>
</td></tr>
<tr><td><p>inet</p>
</td><td><p>An IP address</p>
</td></tr>
</tbody></table>

<p><strong>Columns every table has (not repeated on the cards)</strong></p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>company_id</p>
</td><td><p>uuid → companies</p>
</td><td><p>The company the row belongs to. On every table except companies and roles; empty on users only for Nextal platform admins</p>
</td></tr>
<tr><td><p>created_at</p>
</td><td><p>timestamptz</p>
</td><td><p>When the row was created</p>
</td></tr>
<tr><td><p>created_by</p>
</td><td><p>uuid → users</p>
</td><td><p>Who created it</p>
</td></tr>
<tr><td><p>updated_at</p>
</td><td><p>timestamptz</p>
</td><td><p>When it last changed</p>
</td></tr>
<tr><td><p>updated_by</p>
</td><td><p>uuid → users</p>
</td><td><p>Who last changed it</p>
</td></tr>
</tbody></table>

<p><strong>Rules that apply to every table</strong></p>
<ol><li>Every read and write is filtered by the company_id of the logged-in user. PostgreSQL row-level security is switched on as a second lock.</li>
<li>Money is always numeric(12,2). Rounding happens only on the final amount of a payslip line.</li>
<li>Rows that payroll has used are never deleted. Records are archived or closed instead, and every foreign key uses ON DELETE RESTRICT.</li>
<li>Locked pay runs, their payslips and lines, and approved final settlements are read-only. The API refuses changes and a database trigger blocks them too.</li>
<li>Every insert, update and delete writes a row to audit_logs with the old and new values.</li>
<li>Status columns accept only the values listed in their description (a CHECK constraint).</li>
<li>Codes are unique within a company, not across the platform: employee_code, device_code, leave_types.code and salary_structures.code, so their unique index includes company_id. roles.code, users.email and the UAE identifiers (trade_license_no, mol_establishment_id) are unique across the platform.</li>
<li>Every FK column has an index, so lists and joins stay fast.</li>
</ol>

<p><strong>A.2 How the groups connect</strong></p>
<p>[IMAGE]</p>
<p>database overview · 43 tables in 7 groups, linked through the employee</p>
<p>The employee is the centre of the design. Organisation tables describe where the employee sits; attendance, leave, payroll and offboarding tables record what happens to the employee; and approval tables record who agreed to it.</p>
<p><strong>All connections in one table</strong></p>
<p>Every foreign key in the database, by group. The common company_id, created_by and updated_by links are left out.</p>
<table><thead><tr><th><p>From table</p>
</th><th><p>Column</p>
</th><th><p>To table</p>
</th><th><p>Relationship</p>
</th></tr>
</thead><tbody><tr><td><p>branches</p>
</td><td><p>company_visa_id</p>
</td><td><p>company_visas</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>departments</p>
</td><td><p>parent_id</p>
</td><td><p>departments</p>
</td><td><p>Many to one (self)</p>
</td></tr>
<tr><td><p>departments</p>
</td><td><p>manager_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>jobs</p>
</td><td><p>department_id</p>
</td><td><p>departments</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>users</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>One to one</p>
</td></tr>
<tr><td><p>user_roles</p>
</td><td><p>user_id</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>user_roles</p>
</td><td><p>role_id</p>
</td><td><p>roles</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>support_access_grants</p>
</td><td><p>platform_user_id</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>support_access_grants</p>
</td><td><p>granted_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>approval_flow_steps</p>
</td><td><p>flow_id</p>
</td><td><p>approval_flows</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>approval_flow_steps</p>
</td><td><p>role_id</p>
</td><td><p>roles</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>approval_requests</p>
</td><td><p>flow_id</p>
</td><td><p>approval_flows</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>approval_requests</p>
</td><td><p>requested_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>approval_actions</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>approval_actions</p>
</td><td><p>acted_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>audit_logs</p>
</td><td><p>user_id</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>company_visa_id</p>
</td><td><p>company_visas</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>branch_id</p>
</td><td><p>branches</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>manager_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one (self)</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>hr_manager_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one (self)</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>leave_approver_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one (self)</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>verified_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>job_id</p>
</td><td><p>jobs</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>department_id</p>
</td><td><p>departments</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>shift_id</p>
</td><td><p>shifts</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>attendance_policy_id</p>
</td><td><p>attendance_policies</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>structure_id</p>
</td><td><p>salary_structures</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>employee_documents</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>employee_documents</p>
</td><td><p>owner_id</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>employee_documents</p>
</td><td><p>uploaded_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>employee_documents</p>
</td><td><p>verified_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>bank_accounts</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>penalty_steps</p>
</td><td><p>policy_id</p>
</td><td><p>attendance_policies</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>device_mappings</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>biometric_imports</p>
</td><td><p>imported_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>punches</p>
</td><td><p>import_id</p>
</td><td><p>biometric_imports</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>punches</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>shift_id</p>
</td><td><p>shifts</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>public_holiday_id</p>
</td><td><p>public_holidays</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>leave_request_id</p>
</td><td><p>leave_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>manager_confirmed_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>hr_confirmed_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>attendance_requests</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>attendance_requests</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>overtime_requests</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>overtime_requests</p>
</td><td><p>attendance_day_id</p>
</td><td><p>attendance_days</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>overtime_requests</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>overtime_requests</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>public_holidays</p>
</td><td><p>branch_id</p>
</td><td><p>branches</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>accrual_plans</p>
</td><td><p>leave_type_id</p>
</td><td><p>leave_types</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>leave_allocations</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>leave_allocations</p>
</td><td><p>leave_type_id</p>
</td><td><p>leave_types</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>leave_allocations</p>
</td><td><p>accrual_plan_id</p>
</td><td><p>accrual_plans</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>leave_type_id</p>
</td><td><p>leave_types</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>leave_allocation_id</p>
</td><td><p>leave_allocations</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>salary_rules</p>
</td><td><p>structure_id</p>
</td><td><p>salary_structures</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>pay_runs</p>
</td><td><p>company_visa_id</p>
</td><td><p>company_visas</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>pay_runs</p>
</td><td><p>validated_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>pay_runs</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>pay_runs</p>
</td><td><p>locked_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>pay_run_issues</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>pay_run_issues</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>payslips</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>payslips</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>payslips</p>
</td><td><p>contract_id</p>
</td><td><p>contracts</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>payslips</p>
</td><td><p>corrects_payslip_id</p>
</td><td><p>payslips</p>
</td><td><p>Many to one (self)</p>
</td></tr>
<tr><td><p>payslip_lines</p>
</td><td><p>payslip_id</p>
</td><td><p>payslips</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>payslip_lines</p>
</td><td><p>salary_rule_id</p>
</td><td><p>salary_rules</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>salary_adjustments</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>salary_adjustments</p>
</td><td><p>corrects_payslip_id</p>
</td><td><p>payslips</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>salary_adjustments</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>separations</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>separations</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>clearance_items</p>
</td><td><p>separation_id</p>
</td><td><p>separations</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>clearance_items</p>
</td><td><p>department_id</p>
</td><td><p>departments</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>clearance_items</p>
</td><td><p>owner_user_id</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>clearance_items</p>
</td><td><p>cleared_by</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>final_settlements</p>
</td><td><p>separation_id</p>
</td><td><p>separations</p>
</td><td><p>One to one</p>
</td></tr>
<tr><td><p>final_settlements</p>
</td><td><p>payslip_id</p>
</td><td><p>payslips</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>final_settlements</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>separation_tasks</p>
</td><td><p>separation_id</p>
</td><td><p>separations</p>
</td><td><p>Many to one</p>
</td></tr>
<tr><td><p>separation_tasks</p>
</td><td><p>assigned_to</p>
</td><td><p>users</p>
</td><td><p>Many to one</p>
</td></tr>
</tbody></table>

<p><strong>A.3 Organisation and access</strong></p>
<p><strong>In simple words:</strong> Who the company is, how it is organised, and who may log in and do what.</p>
<p>[IMAGE]</p>
<p>organisation and access · 9 tables with every column</p>
<p><strong>A.3.1 companies</strong></p>
<p><em>Why it exists:</em> One row for each client company on the platform. It is the top of the tree: every other company-owned row points back here through company_id, which is how one company can never see another company's data. <em>Used for:</em> Created by the Nextal platform admin. Holds the company profile and the company-wide payroll and alert settings.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID of the company</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Company name in English</p>
</td></tr>
<tr><td><p>name_ar</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Company name in Arabic</p>
</td></tr>
<tr><td><p>trade_license_no</p>
</td><td><p>varchar(50)</p>
</td><td><p>UK</p>
</td><td><p>Trade licence number; no two companies share one</p>
</td></tr>
<tr><td><p>logo_url</p>
</td><td><p>text</p>
</td><td></td><td><p>Where the logo file is stored</p>
</td></tr>
<tr><td><p>default_language</p>
</td><td><p>varchar(2)</p>
</td><td></td><td><p>en or ar</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Active or Suspended; suspended companies cannot log in</p>
</td></tr>
<tr><td><p>default_cutoff_day</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Day of the month payroll inputs close</p>
</td></tr>
<tr><td><p>variance_threshold_pct</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Change from last month that needs a reason in the variance review</p>
</td></tr>
<tr><td><p>alert_days</p>
</td><td><p>smallint[]</p>
</td><td></td><td><p>Days before expiry to send document reminders, default 90, 60, 30</p>
</td></tr>
</tbody></table>

<p><strong>A.3.2 company_visas</strong></p>
<p><em>Why it exists:</em> In the UAE one company can hold several establishment IDs with MOHRE. Each one needs its own WPS file and its own pay run, so it gets its own row. <em>Used for:</em> Chosen on every employee and every pay run; its employer ID and routing code go into the SIF file.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Name shown on screens, e.g. the licence name</p>
</td></tr>
<tr><td><p>mol_establishment_id</p>
</td><td><p>varchar(20)</p>
</td><td><p>UK</p>
</td><td><p>MOHRE employer ID written on the SCR line of the SIF</p>
</td></tr>
<tr><td><p>bank_routing_code</p>
</td><td><p>varchar(9)</p>
</td><td></td><td><p>Routing code of the employer's bank or exchange house</p>
</td></tr>
<tr><td><p>emirate</p>
</td><td><p>varchar(30)</p>
</td><td></td><td><p>Emirate of the establishment</p>
</td></tr>
</tbody></table>

<p><strong>A.3.3 branches</strong></p>
<p><em>Why it exists:</em> Companies group staff by location for reports, approvals and branch-only public holidays. <em>Used for:</em> Linked from employees, public_holidays and user_roles (to limit a role to one branch).</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>company_visa_id</p>
</td><td><p>uuid → company_visas</p>
</td><td><p>FK</p>
</td><td><p>The company visa the branch belongs to</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Branch name in English</p>
</td></tr>
<tr><td><p>name_ar</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Branch name in Arabic</p>
</td></tr>
<tr><td><p>emirate</p>
</td><td><p>varchar(30)</p>
</td><td></td><td><p>Emirate of the branch</p>
</td></tr>
</tbody></table>

<p><strong>A.3.4 departments</strong></p>
<p><em>Why it exists:</em> Holds the department tree and who manages each department. The manager is the first leave and overtime approver. <em>Used for:</em> Linked from contracts, jobs, clearance_items and user_roles; cost_centre is used by the accounting export.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>parent_id</p>
</td><td><p>uuid → departments</p>
</td><td><p>FK</p>
</td><td><p>Parent department; empty for a top-level department</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Department name in English</p>
</td></tr>
<tr><td><p>name_ar</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Department name in Arabic</p>
</td></tr>
<tr><td><p>manager_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee who manages the department</p>
</td></tr>
<tr><td><p>cost_centre</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Cost centre code for the accounting journal</p>
</td></tr>
</tbody></table>

<p><strong>A.3.5 jobs</strong></p>
<p><em>Why it exists:</em> A list of job titles, so titles are typed once and stay consistent. <em>Used for:</em> Chosen on each contract version.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>department_id</p>
</td><td><p>uuid → departments</p>
</td><td><p>FK</p>
</td><td><p>Department the job normally sits in</p>
</td></tr>
<tr><td><p>title</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Job title in English</p>
</td></tr>
<tr><td><p>title_ar</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Job title in Arabic</p>
</td></tr>
<tr><td><p>grade</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Grade or band, used for OT eligibility and reports</p>
</td></tr>
</tbody></table>

<p><strong>A.3.6 users</strong></p>
<p><em>Why it exists:</em> A login account. It is separate from employees because not every user is an employee (Nextal platform admins) and an employee may never log in. <em>Used for:</em> Login, lockout and deactivation; every audit_logs row and approval action points to the user who did it.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK, unique</p>
</td><td><p>The employee this login belongs to; empty for platform admins</p>
</td></tr>
<tr><td><p>email</p>
</td><td><p>varchar(255)</p>
</td><td><p>UK</p>
</td><td><p>Login email</p>
</td></tr>
<tr><td><p>password_hash</p>
</td><td><p>varchar(255)</p>
</td><td></td><td><p>bcrypt hash; the password itself is never stored</p>
</td></tr>
<tr><td><p>is_platform_admin</p>
</td><td><p>boolean</p>
</td><td></td><td><p>True only for Nextal platform admins (company_id is empty for them)</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Invited, Active, Locked or Disabled</p>
</td></tr>
<tr><td><p>failed_logins</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Wrong passwords in a row; 5 locks the account</p>
</td></tr>
<tr><td><p>locked_until</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When a lockout ends</p>
</td></tr>
<tr><td><p>last_login_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>Last successful login</p>
</td></tr>
<tr><td><p>deactivated_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When access was switched off, e.g. after an exit</p>
</td></tr>
</tbody></table>

<p><strong>A.3.7 roles</strong></p>
<p><em>Why it exists:</em> The fixed list of roles (Employee, Dept Manager, HR Officer, Payroll Officer, HR Manager, GM, Finance, Company Admin) and what each may do. It is shared by all companies, so it has no company_id. <em>Used for:</em> Read on every request to check permissions; approval steps name a role from here.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>code</p>
</td><td><p>varchar(30)</p>
</td><td><p>UK</p>
</td><td><p>Short code, e.g. HR_MANAGER</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Name shown on screens</p>
</td></tr>
<tr><td><p>sees_salary</p>
</td><td><p>boolean</p>
</td><td></td><td><p>True for Payroll Officer, HR Manager, GM and Finance</p>
</td></tr>
<tr><td><p>permissions</p>
</td><td><p>jsonb</p>
</td><td></td><td><p>Which screens and actions the role may use</p>
</td></tr>
</tbody></table>

<p><strong>A.3.8 user_roles</strong></p>
<p><em>Why it exists:</em> A user can hold more than one role, and a role can be limited to one company visa, branch or department. A link table is the clean way to store that. <em>Used for:</em> Checked on every request together with company_id.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>user_id</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>The user</p>
</td></tr>
<tr><td><p>role_id</p>
</td><td><p>uuid → roles</p>
</td><td><p>FK</p>
</td><td><p>The role given</p>
</td></tr>
<tr><td><p>scope_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Company, CompanyVisa, Branch or Department</p>
</td></tr>
<tr><td><p>scope_id</p>
</td><td><p>uuid</p>
</td><td></td><td><p>ID of the visa, branch or department when the role is limited</p>
</td></tr>
</tbody></table>

<p><strong>A.3.9 support_access_grants</strong></p>
<p><em>Why it exists:</em> Nextal cannot see a company's employee or salary data unless the company allows it for a limited time (FR-PL3). Each permission is recorded here. <em>Used for:</em> Checked whenever a platform admin opens company data; expired or revoked grants give no access.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>platform_user_id</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>The Nextal user who may look</p>
</td></tr>
<tr><td><p>granted_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>The company admin who allowed it</p>
</td></tr>
<tr><td><p>reason</p>
</td><td><p>text</p>
</td><td></td><td><p>Why access is needed</p>
</td></tr>
<tr><td><p>starts_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>Access starts</p>
</td></tr>
<tr><td><p>ends_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>Access ends automatically</p>
</td></tr>
<tr><td><p>revoked_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>Set if the company ends it early</p>
</td></tr>
</tbody></table>

<p><strong>How the organisation and access tables connect</strong></p>
<table><thead><tr><th><p>From</p>
</th><th><p>Column</p>
</th><th><p>To</p>
</th><th><p>In simple words</p>
</th></tr>
</thead><tbody><tr><td><p>branches</p>
</td><td><p>company_visa_id</p>
</td><td><p>company_visas</p>
</td><td><p>The company visa the branch belongs to. One company_visas row can have many branches rows.</p>
</td></tr>
<tr><td><p>departments</p>
</td><td><p>parent_id</p>
</td><td><p>departments</p>
</td><td><p>Parent department; empty for a top-level department. Points to another row in the same table.</p>
</td></tr>
<tr><td><p>departments</p>
</td><td><p>manager_id</p>
</td><td><p>employees</p>
</td><td><p>Employee who manages the department. One employees row can have many departments rows.</p>
</td></tr>
<tr><td><p>jobs</p>
</td><td><p>department_id</p>
</td><td><p>departments</p>
</td><td><p>Department the job normally sits in. One departments row can have many jobs rows.</p>
</td></tr>
<tr><td><p>users</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>The employee this login belongs to; empty for platform admins. At most one users row for each employees row.</p>
</td></tr>
<tr><td><p>user_roles</p>
</td><td><p>user_id</p>
</td><td><p>users</p>
</td><td><p>The user. One users row can have many user_roles rows.</p>
</td></tr>
<tr><td><p>user_roles</p>
</td><td><p>role_id</p>
</td><td><p>roles</p>
</td><td><p>The role given. One roles row can have many user_roles rows.</p>
</td></tr>
<tr><td><p>support_access_grants</p>
</td><td><p>platform_user_id</p>
</td><td><p>users</p>
</td><td><p>The Nextal user who may look. One users row can have many support_access_grants rows.</p>
</td></tr>
<tr><td><p>support_access_grants</p>
</td><td><p>granted_by</p>
</td><td><p>users</p>
</td><td><p>The company admin who allowed it. One users row can have many support_access_grants rows.</p>
</td></tr>
</tbody></table>

<p><strong>A.4 Approvals and audit</strong></p>
<p><strong>In simple words:</strong> Who approves each kind of request, every decision taken, and the record of every change.</p>
<p>[IMAGE]</p>
<p>approvals and audit · 5 tables with every column</p>
<p><strong>A.4.1 approval_flows</strong></p>
<p><em>Why it exists:</em> Each company decides who approves what. Instead of hard-coding approvers, each kind of request has a flow stored as data, edited on the Approval Settings screen. <em>Used for:</em> When a request is submitted, the system picks the matching flow.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>request_type</p>
</td><td><p>varchar(30)</p>
</td><td></td><td><p>EmployeeVerification, Contract, Leave, Overtime, AttendanceRequest, SalaryAdjustment, PayRun, Separation or FinalSettlement</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Name shown on screens</p>
</td></tr>
<tr><td><p>condition</p>
</td><td><p>jsonb</p>
</td><td></td><td><p>When this flow applies, e.g. leave type or more than 10 days</p>
</td></tr>
<tr><td><p>priority</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Which flow wins when two match</p>
</td></tr>
<tr><td><p>is_active</p>
</td><td><p>boolean</p>
</td><td></td><td><p>Only active flows are used</p>
</td></tr>
</tbody></table>

<p><strong>A.4.2 approval_flow_steps</strong></p>
<p><em>Why it exists:</em> A flow has several steps in order (manager, then HR, then GM). Each step is one row. <em>Used for:</em> Tells the system who must act next.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>flow_id</p>
</td><td><p>uuid → approval_flows</p>
</td><td><p>FK</p>
</td><td><p>The flow this step belongs to</p>
</td></tr>
<tr><td><p>step_no</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Order of the step, 1 first</p>
</td></tr>
<tr><td><p>role_id</p>
</td><td><p>uuid → roles</p>
</td><td><p>FK</p>
</td><td><p>Role that approves this step</p>
</td></tr>
<tr><td><p>approver_rule</p>
</td><td><p>varchar(30)</p>
</td><td></td><td><p>LineManager, DepartmentManager or AnyUserWithRole</p>
</td></tr>
</tbody></table>

<p><strong>A.4.3 approval_requests</strong></p>
<p><em>Why it exists:</em> One row for every item waiting for approval, whatever it is. This gives one Approval Inbox and one way of approving for the whole system. <em>Used for:</em> Leave, overtime, attendance requests, adjustments, contracts, pay runs, separations and settlements each point here through approval_request_id.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>flow_id</p>
</td><td><p>uuid → approval_flows</p>
</td><td><p>FK</p>
</td><td><p>Flow being followed</p>
</td></tr>
<tr><td><p>request_type</p>
</td><td><p>varchar(30)</p>
</td><td></td><td><p>Same list as approval_flows.request_type</p>
</td></tr>
<tr><td><p>record_id</p>
</td><td><p>uuid</p>
</td><td></td><td><p>ID of the leave request, pay run etc. being approved</p>
</td></tr>
<tr><td><p>current_step</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Step waiting for action</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Pending, Approved, Refused or Cancelled</p>
</td></tr>
<tr><td><p>requested_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Who submitted it</p>
</td></tr>
<tr><td><p>requested_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When it was submitted</p>
</td></tr>
<tr><td><p>completed_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When the last step was taken</p>
</td></tr>
</tbody></table>

<p><strong>A.4.4 approval_actions</strong></p>
<p><em>Why it exists:</em> Keeps every decision on every step, so anyone can see who approved or refused and why. <em>Used for:</em> Shown on the Approval tab of each record and in the audit history.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>approval_request_id</p>
</td><td><p>uuid → approval_requests</p>
</td><td><p>FK</p>
</td><td><p>The request acted on</p>
</td></tr>
<tr><td><p>step_no</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Step acted on</p>
</td></tr>
<tr><td><p>acted_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Who acted</p>
</td></tr>
<tr><td><p>action</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Approved, Refused or Returned</p>
</td></tr>
<tr><td><p>comment</p>
</td><td><p>text</p>
</td><td></td><td><p>Reason or note</p>
</td></tr>
<tr><td><p>acted_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When</p>
</td></tr>
</tbody></table>

<p><strong>A.4.5 audit_logs</strong></p>
<p><em>Why it exists:</em> The read-only history of every change, approval, login, document view and export. Rows are only ever added, never changed or deleted. <em>Used for:</em> Feeds the Audit History screen and the History tab on each employee.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>bigserial</p>
</td><td><p>PK</p>
</td><td><p>Running number; this table grows fast</p>
</td></tr>
<tr><td><p>user_id</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Who did it</p>
</td></tr>
<tr><td><p>action</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Create, Update, Delete, Approve, Login, View or Export</p>
</td></tr>
<tr><td><p>table_name</p>
</td><td><p>varchar(60)</p>
</td><td></td><td><p>Table that changed</p>
</td></tr>
<tr><td><p>record_id</p>
</td><td><p>uuid</p>
</td><td></td><td><p>Row that changed</p>
</td></tr>
<tr><td><p>old_values</p>
</td><td><p>jsonb</p>
</td><td></td><td><p>Values before the change</p>
</td></tr>
<tr><td><p>new_values</p>
</td><td><p>jsonb</p>
</td><td></td><td><p>Values after the change</p>
</td></tr>
<tr><td><p>ip_address</p>
</td><td><p>inet</p>
</td><td></td><td><p>Where the request came from</p>
</td></tr>
<tr><td><p>created_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When it happened</p>
</td></tr>
</tbody></table>

<p><strong>How the approvals and audit tables connect</strong></p>
<table><thead><tr><th><p>From</p>
</th><th><p>Column</p>
</th><th><p>To</p>
</th><th><p>In simple words</p>
</th></tr>
</thead><tbody><tr><td><p>approval_flow_steps</p>
</td><td><p>flow_id</p>
</td><td><p>approval_flows</p>
</td><td><p>The flow this step belongs to. One approval_flows row can have many approval_flow_steps rows.</p>
</td></tr>
<tr><td><p>approval_flow_steps</p>
</td><td><p>role_id</p>
</td><td><p>roles</p>
</td><td><p>Role that approves this step. One roles row can have many approval_flow_steps rows.</p>
</td></tr>
<tr><td><p>approval_requests</p>
</td><td><p>flow_id</p>
</td><td><p>approval_flows</p>
</td><td><p>Flow being followed. One approval_flows row can have many approval_requests rows.</p>
</td></tr>
<tr><td><p>approval_requests</p>
</td><td><p>requested_by</p>
</td><td><p>users</p>
</td><td><p>Who submitted it. One users row can have many approval_requests rows.</p>
</td></tr>
<tr><td><p>approval_actions</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>The request acted on. One approval_requests row can have many approval_actions rows.</p>
</td></tr>
<tr><td><p>approval_actions</p>
</td><td><p>acted_by</p>
</td><td><p>users</p>
</td><td><p>Who acted. One users row can have many approval_actions rows.</p>
</td></tr>
<tr><td><p>audit_logs</p>
</td><td><p>user_id</p>
</td><td><p>users</p>
</td><td><p>Who did it. One users row can have many audit_logs rows.</p>
</td></tr>
</tbody></table>

<p>The link also runs the other way: contracts, attendance_requests, overtime_requests, leave_requests, salary_adjustments, pay_runs, separations and final_settlements each hold an approval_request_id that points to their approval here. approval_requests.record_id stores the same link back, so the Approval Inbox can open the right record.</p>
<p><strong>A.5 Employees</strong></p>
<p><strong>In simple words:</strong> The person, their dated contracts, their documents and their bank accounts.</p>
<p>↗ employees · 4 tables with every column</p>
<p><strong>A.5.1 employees</strong></p>
<p><em>Why it exists:</em> The employee master: one row per person who works, or worked, for the company. Salary is not stored here, because it changes over time; it lives in contracts. <em>Used for:</em> Almost every other table points to an employee.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_code</p>
</td><td><p>varchar(20)</p>
</td><td><p>UK</p>
</td><td><p>Company's own staff number, unique within the company</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Name in English</p>
</td></tr>
<tr><td><p>arabic_name</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Name in Arabic, printed on the payslip</p>
</td></tr>
<tr><td><p>legal_name</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Name exactly as on the passport</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Pre-Joined, New Joined, Active, Suspended, Transferred or Archived</p>
</td></tr>
<tr><td><p>joining_date</p>
</td><td><p>date</p>
</td><td></td><td><p>First working day; service for gratuity counts from here</p>
</td></tr>
<tr><td><p>residency_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>UAENational or Expat; decides GPSSA</p>
</td></tr>
<tr><td><p>nationality</p>
</td><td><p>varchar(60)</p>
</td><td></td><td><p>Nationality</p>
</td></tr>
<tr><td><p>gender</p>
</td><td><p>varchar(10)</p>
</td><td></td><td><p>Male or Female; maternity leave applies to Female</p>
</td></tr>
<tr><td><p>birth_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Date of birth</p>
</td></tr>
<tr><td><p>mohre_person_id</p>
</td><td><p>varchar(14)</p>
</td><td></td><td><p>Labour card / person ID written on the employee's EDR line</p>
</td></tr>
<tr><td><p>company_visa_id</p>
</td><td><p>uuid → company_visas</p>
</td><td><p>FK</p>
</td><td><p>Visa the employee is under; decides which WPS file pays them</p>
</td></tr>
<tr><td><p>branch_id</p>
</td><td><p>uuid → branches</p>
</td><td><p>FK</p>
</td><td><p>Work location</p>
</td></tr>
<tr><td><p>manager_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Line manager</p>
</td></tr>
<tr><td><p>hr_manager_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>HR manager responsible for the employee</p>
</td></tr>
<tr><td><p>leave_approver_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>First leave approver, if not the line manager</p>
</td></tr>
<tr><td><p>work_email</p>
</td><td><p>varchar(255)</p>
</td><td></td><td><p>Work email</p>
</td></tr>
<tr><td><p>mobile</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Mobile number</p>
</td></tr>
<tr><td><p>emergency_contact_name</p>
</td><td><p>varchar(200)</p>
</td><td></td><td><p>Emergency contact</p>
</td></tr>
<tr><td><p>emergency_contact_phone</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Emergency contact number</p>
</td></tr>
<tr><td><p>verified_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>HR Manager who verified the record</p>
</td></tr>
<tr><td><p>verified_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When it was verified</p>
</td></tr>
<tr><td><p>activated_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When the status became Active</p>
</td></tr>
</tbody></table>

<p><strong>A.5.2 contracts</strong></p>
<p><em>Why it exists:</em> Holds the job and salary as dated versions. A raise or job change adds a new row from an effective date and the old one stays, so salary history is never lost and an old month can be recalculated correctly. <em>Used for:</em> The pay run reads the version that applied in the month; the Salary History tab lists every version.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>The employee</p>
</td></tr>
<tr><td><p>version_no</p>
</td><td><p>smallint</p>
</td><td></td><td><p>1, 2, 3 ... for this employee</p>
</td></tr>
<tr><td><p>effective_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Date this version starts; unique per employee</p>
</td></tr>
<tr><td><p>contract_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Limited or Unlimited</p>
</td></tr>
<tr><td><p>start_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Contract start</p>
</td></tr>
<tr><td><p>end_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Contract end (Limited only)</p>
</td></tr>
<tr><td><p>probation_end</p>
</td><td><p>date</p>
</td><td></td><td><p>End of probation</p>
</td></tr>
<tr><td><p>job_id</p>
</td><td><p>uuid → jobs</p>
</td><td><p>FK</p>
</td><td><p>Job title</p>
</td></tr>
<tr><td><p>department_id</p>
</td><td><p>uuid → departments</p>
</td><td><p>FK</p>
</td><td><p>Department</p>
</td></tr>
<tr><td><p>shift_id</p>
</td><td><p>uuid → shifts</p>
</td><td><p>FK</p>
</td><td><p>Working hours</p>
</td></tr>
<tr><td><p>attendance_policy_id</p>
</td><td><p>uuid → attendance_policies</p>
</td><td><p>FK</p>
</td><td><p>Late, early-out and OT rules</p>
</td></tr>
<tr><td><p>structure_id</p>
</td><td><p>uuid → salary_structures</p>
</td><td><p>FK</p>
</td><td><p>Set of salary rules used for this employee</p>
</td></tr>
<tr><td><p>basic</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Basic salary per month (AED)</p>
</td></tr>
<tr><td><p>housing</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Housing allowance</p>
</td></tr>
<tr><td><p>transport</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Transport allowance</p>
</td></tr>
<tr><td><p>other_allowances</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Other allowances</p>
</td></tr>
<tr><td><p>gross</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Calculated: basic + all allowances</p>
</td></tr>
<tr><td><p>annual_leave_days</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Annual leave days per year</p>
</td></tr>
<tr><td><p>gratuity_rule</p>
</td><td><p>varchar(30)</p>
</td><td></td><td><p>Gratuity policy; default UAE labour law</p>
</td></tr>
<tr><td><p>notice_days_employee</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Notice the employee must give</p>
</td></tr>
<tr><td><p>notice_days_employer</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Notice the company must give</p>
</td></tr>
<tr><td><p>training_cost</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Training cost that may be recovered on early exit</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Draft, Approved, Superseded or Ended</p>
</td></tr>
<tr><td><p>approval_request_id</p>
</td><td><p>uuid → approval_requests</p>
</td><td><p>FK</p>
</td><td><p>Approval of this salary version</p>
</td></tr>
</tbody></table>

<p><strong>A.5.3 employee_documents</strong></p>
<p><em>Why it exists:</em> UAE documents expire and must be renewed on time. Each document is its own row with its dates, its file and the person responsible for renewing it. <em>Used for:</em> Read by the nightly expiry job, the Document Expiry Tracker and the reminders; files open only for permitted roles.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Whose document</p>
</td></tr>
<tr><td><p>doc_type</p>
</td><td><p>varchar(30)</p>
</td><td></td><td><p>Passport, Visa, EmiratesID, LabourCard, MOHREContract or Insurance</p>
</td></tr>
<tr><td><p>doc_number</p>
</td><td><p>varchar(50)</p>
</td><td></td><td><p>Document number</p>
</td></tr>
<tr><td><p>issue_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Issue date</p>
</td></tr>
<tr><td><p>expiry_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Expiry date checked every night</p>
</td></tr>
<tr><td><p>file_url</p>
</td><td><p>text</p>
</td><td></td><td><p>Key of the encrypted file in storage</p>
</td></tr>
<tr><td><p>owner_id</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Person responsible for renewing it</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Valid, ExpiringSoon, Expired or MissingData</p>
</td></tr>
<tr><td><p>last_alert_days</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Last reminder step sent: 90, 60 or 30</p>
</td></tr>
<tr><td><p>last_alert_sent_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When that reminder went out</p>
</td></tr>
<tr><td><p>verification_status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Pending, Verified or Rejected (for employee uploads)</p>
</td></tr>
<tr><td><p>uploaded_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Who uploaded the file</p>
</td></tr>
<tr><td><p>verified_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>HR user who verified it</p>
</td></tr>
</tbody></table>

<p><strong>A.5.4 bank_accounts</strong></p>
<p><em>Why it exists:</em> Salary is paid by WPS into a bank account. An employee may split salary across two accounts, so accounts are kept in their own table. <em>Used for:</em> Read by validation (every employee needs an IBAN) and by the SIF export.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Account holder</p>
</td></tr>
<tr><td><p>bank_name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Bank or exchange house</p>
</td></tr>
<tr><td><p>iban</p>
</td><td><p>varchar(23)</p>
</td><td></td><td><p>UAE IBAN (23 characters)</p>
</td></tr>
<tr><td><p>routing_code</p>
</td><td><p>varchar(9)</p>
</td><td></td><td><p>Bank routing code for the EDR line</p>
</td></tr>
<tr><td><p>salary_split_pct</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Share of net pay to this account</p>
</td></tr>
<tr><td><p>is_primary</p>
</td><td><p>boolean</p>
</td><td></td><td><p>Main account</p>
</td></tr>
<tr><td><p>is_active</p>
</td><td><p>boolean</p>
</td><td></td><td><p>Closed accounts are kept but not used</p>
</td></tr>
</tbody></table>

<p><strong>How the employees tables connect</strong></p>
<table><thead><tr><th><p>From</p>
</th><th><p>Column</p>
</th><th><p>To</p>
</th><th><p>In simple words</p>
</th></tr>
</thead><tbody><tr><td><p>employees</p>
</td><td><p>company_visa_id</p>
</td><td><p>company_visas</p>
</td><td><p>Visa the employee is under; decides which WPS file pays them. One company_visas row can have many employees rows.</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>branch_id</p>
</td><td><p>branches</p>
</td><td><p>Work location. One branches row can have many employees rows.</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>manager_id</p>
</td><td><p>employees</p>
</td><td><p>Line manager. Points to another row in the same table.</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>hr_manager_id</p>
</td><td><p>employees</p>
</td><td><p>HR manager responsible for the employee. Points to another row in the same table.</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>leave_approver_id</p>
</td><td><p>employees</p>
</td><td><p>First leave approver, if not the line manager. Points to another row in the same table.</p>
</td></tr>
<tr><td><p>employees</p>
</td><td><p>verified_by</p>
</td><td><p>users</p>
</td><td><p>HR Manager who verified the record. One users row can have many employees rows.</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>The employee. One employees row can have many contracts rows (one per version).</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>job_id</p>
</td><td><p>jobs</p>
</td><td><p>Job title. One jobs row can have many contracts rows.</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>department_id</p>
</td><td><p>departments</p>
</td><td><p>Department. One departments row can have many contracts rows.</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>shift_id</p>
</td><td><p>shifts</p>
</td><td><p>Working hours. One shifts row can have many contracts rows.</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>attendance_policy_id</p>
</td><td><p>attendance_policies</p>
</td><td><p>Late, early-out and OT rules. One attendance_policies row can have many contracts rows.</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>structure_id</p>
</td><td><p>salary_structures</p>
</td><td><p>Set of salary rules used for this employee. One salary_structures row can have many contracts rows.</p>
</td></tr>
<tr><td><p>contracts</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Approval of this salary version. Each approval belongs to one contract version.</p>
</td></tr>
<tr><td><p>employee_documents</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Whose document. One employees row can have many employee_documents rows.</p>
</td></tr>
<tr><td><p>employee_documents</p>
</td><td><p>owner_id</p>
</td><td><p>users</p>
</td><td><p>Person responsible for renewing it. One users row can have many employee_documents rows.</p>
</td></tr>
<tr><td><p>employee_documents</p>
</td><td><p>uploaded_by</p>
</td><td><p>users</p>
</td><td><p>Who uploaded the file. One users row can have many employee_documents rows.</p>
</td></tr>
<tr><td><p>employee_documents</p>
</td><td><p>verified_by</p>
</td><td><p>users</p>
</td><td><p>HR user who verified it. One users row can have many employee_documents rows.</p>
</td></tr>
<tr><td><p>bank_accounts</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Account holder. One employees row can have many bank_accounts rows.</p>
</td></tr>
</tbody></table>

<p>The employee's current job, department, shift and salary are always read from the contract version whose effective_date is the latest one on or before the day being looked at. Groups D to G link to employees through employee_id.</p>
<p><strong>A.6 Attendance and shifts</strong></p>
<p><strong>In simple words:</strong> From fingerprint punches to confirmed attendance days and approved overtime. Punches are the raw facts, attendance days are the judged result, and overtime requests are what a manager approves.</p>
<p>↗ attendance and shifts · 9 tables with every column</p>
<p><strong>A.6.1 shifts</strong></p>
<p><em>Why it exists:</em> Working hours differ by team and change in Ramadan. A shift is defined once and given to many employees. <em>Used for:</em> Each contract points to a shift; attendance_days uses it to judge late, early and overtime.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Shift name, e.g. Office 8 to 5</p>
</td></tr>
<tr><td><p>start_time</p>
</td><td><p>time</p>
</td><td></td><td><p>Start of the working day</p>
</td></tr>
<tr><td><p>end_time</p>
</td><td><p>time</p>
</td><td></td><td><p>End of the working day</p>
</td></tr>
<tr><td><p>break_minutes</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Break deducted from worked hours</p>
</td></tr>
<tr><td><p>grace_minutes</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Minutes allowed before lateness counts</p>
</td></tr>
<tr><td><p>weekly_off_days</p>
</td><td><p>smallint[]</p>
</td><td></td><td><p>Days off, e.g. 6 and 7 for Saturday and Sunday</p>
</td></tr>
<tr><td><p>ramadan_start_time</p>
</td><td><p>time</p>
</td><td></td><td><p>Start time during Ramadan</p>
</td></tr>
<tr><td><p>ramadan_end_time</p>
</td><td><p>time</p>
</td><td></td><td><p>End time during Ramadan</p>
</td></tr>
</tbody></table>

<p><strong>A.6.2 attendance_policies</strong></p>
<p><em>Why it exists:</em> Late and overtime rules are company policy, not law, so they are stored as settings that HR can change. <em>Used for:</em> Each contract points to a policy; penalty_steps hang under it.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Policy name</p>
</td></tr>
<tr><td><p>late_grace_minutes</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Late minutes ignored</p>
</td></tr>
<tr><td><p>early_out_grace_minutes</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Early-out minutes ignored</p>
</td></tr>
<tr><td><p>ot_eligible</p>
</td><td><p>boolean</p>
</td><td></td><td><p>Whether employees on this policy can earn overtime</p>
</td></tr>
<tr><td><p>ot_min_minutes</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Extra minutes needed before an overtime request is created</p>
</td></tr>
<tr><td><p>night_start</p>
</td><td><p>time</p>
</td><td></td><td><p>Start of night overtime, default 22:00</p>
</td></tr>
<tr><td><p>night_end</p>
</td><td><p>time</p>
</td><td></td><td><p>End of night overtime, default 04:00</p>
</td></tr>
</tbody></table>

<p><strong>A.6.3 penalty_steps</strong></p>
<p><em>Why it exists:</em> A policy has a scale of penalties (warning first, then hours, then part of a day). Each step is one row. <em>Used for:</em> Read when attendance_days are graded; the result feeds the LATE salary rule.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>policy_id</p>
</td><td><p>uuid → attendance_policies</p>
</td><td><p>FK</p>
</td><td><p>Policy the step belongs to</p>
</td></tr>
<tr><td><p>applies_to</p>
</td><td><p>varchar(10)</p>
</td><td></td><td><p>Late or EarlyOut</p>
</td></tr>
<tr><td><p>occurrence_from</p>
</td><td><p>smallint</p>
</td><td></td><td><p>From which time in the month this step applies</p>
</td></tr>
<tr><td><p>min_minutes</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Minutes late before this step applies</p>
</td></tr>
<tr><td><p>penalty_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Warning, Hours or DayFraction</p>
</td></tr>
<tr><td><p>penalty_value</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Hours, or fraction of a day, deducted</p>
</td></tr>
</tbody></table>

<p><strong>A.6.4 device_mappings</strong></p>
<p><em>Why it exists:</em> The fingerprint machine knows people by its own device code, not by employee code. This table translates one to the other. <em>Used for:</em> Used on every biometric import; unknown codes are flagged.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>device_code</p>
</td><td><p>varchar(30)</p>
</td><td><p>UK</p>
</td><td><p>Code used by the machine, unique within the company</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee it belongs to</p>
</td></tr>
</tbody></table>

<p><strong>A.6.5 biometric_imports</strong></p>
<p><em>Why it exists:</em> Keeps a record of each file imported, so HR can see what was loaded, when and with what result. <em>Used for:</em> Every punch points to the import it came from.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>file_url</p>
</td><td><p>text</p>
</td><td></td><td><p>The original file, kept for checking</p>
</td></tr>
<tr><td><p>period_from</p>
</td><td><p>date</p>
</td><td></td><td><p>First day in the file</p>
</td></tr>
<tr><td><p>period_to</p>
</td><td><p>date</p>
</td><td></td><td><p>Last day in the file</p>
</td></tr>
<tr><td><p>rows_total</p>
</td><td><p>integer</p>
</td><td></td><td><p>Rows in the file</p>
</td></tr>
<tr><td><p>rows_imported</p>
</td><td><p>integer</p>
</td><td></td><td><p>New punches saved</p>
</td></tr>
<tr><td><p>rows_duplicate</p>
</td><td><p>integer</p>
</td><td></td><td><p>Rows skipped as duplicates</p>
</td></tr>
<tr><td><p>rows_unmapped</p>
</td><td><p>integer</p>
</td><td></td><td><p>Rows with an unknown device code</p>
</td></tr>
<tr><td><p>imported_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Who imported it</p>
</td></tr>
<tr><td><p>imported_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When</p>
</td></tr>
</tbody></table>

<p><strong>A.6.6 punches</strong></p>
<p><em>Why it exists:</em> The raw check-ins and check-outs exactly as the machine recorded them. They are kept unchanged so attendance can always be rebuilt and checked. <em>Used for:</em> Grouped by employee and day to build attendance_days.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>bigserial</p>
</td><td><p>PK</p>
</td><td><p>Running number; many rows</p>
</td></tr>
<tr><td><p>import_id</p>
</td><td><p>uuid → biometric_imports</p>
</td><td><p>FK</p>
</td><td><p>File it came from</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee</p>
</td></tr>
<tr><td><p>punched_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>Exact time; unique per employee, which stops duplicates</p>
</td></tr>
<tr><td><p>direction</p>
</td><td><p>varchar(10)</p>
</td><td></td><td><p>In, Out or Unknown</p>
</td></tr>
</tbody></table>

<p><strong>A.6.7 attendance_days</strong></p>
<p><em>Why it exists:</em> One row per employee per day: the judged result of the punches against the shift, leave and holidays. This is what managers and HR confirm and what payroll reads. <em>Used for:</em> Daily Attendance Grid, exceptions, monthly review, attendance report and the pay run.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee; unique with work_date</p>
</td></tr>
<tr><td><p>work_date</p>
</td><td><p>date</p>
</td><td></td><td><p>The day</p>
</td></tr>
<tr><td><p>shift_id</p>
</td><td><p>uuid → shifts</p>
</td><td><p>FK</p>
</td><td><p>Shift that applied that day</p>
</td></tr>
<tr><td><p>check_in</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>First punch in</p>
</td></tr>
<tr><td><p>check_out</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>Last punch out</p>
</td></tr>
<tr><td><p>worked_hours</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Hours between check-in and check-out</p>
</td></tr>
<tr><td><p>break_deducted</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Break hours taken off</p>
</td></tr>
<tr><td><p>net_hours</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Worked hours minus break</p>
</td></tr>
<tr><td><p>late_minutes</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Minutes late after grace</p>
</td></tr>
<tr><td><p>early_out_minutes</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Minutes left early after grace</p>
</td></tr>
<tr><td><p>late_penalty_days</p>
</td><td><p>numeric(4,2)</p>
</td><td></td><td><p>Penalty from the policy steps</p>
</td></tr>
<tr><td><p>day_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>WorkDay, WeeklyOff, PublicHoliday or Leave</p>
</td></tr>
<tr><td><p>public_holiday_id</p>
</td><td><p>uuid → public_holidays</p>
</td><td><p>FK</p>
</td><td><p>Holiday that day, if any</p>
</td></tr>
<tr><td><p>leave_request_id</p>
</td><td><p>uuid → leave_requests</p>
</td><td><p>FK</p>
</td><td><p>Approved leave that day, if any</p>
</td></tr>
<tr><td><p>pay_band</p>
</td><td><p>varchar(10)</p>
</td><td></td><td><p>Full, Half or None for leave days</p>
</td></tr>
<tr><td><p>exception_codes</p>
</td><td><p>text[]</p>
</td><td></td><td><p>MissingPunch, Late, EarlyOut, Absent, RestDayWork, UnknownDevice</p>
</td></tr>
<tr><td><p>review_status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Open, ManagerConfirmed or HRConfirmed</p>
</td></tr>
<tr><td><p>manager_confirmed_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Manager who confirmed</p>
</td></tr>
<tr><td><p>manager_confirmed_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When</p>
</td></tr>
<tr><td><p>hr_confirmed_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>HR user who confirmed</p>
</td></tr>
<tr><td><p>hr_confirmed_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When</p>
</td></tr>
<tr><td><p>edit_reason</p>
</td><td><p>text</p>
</td><td></td><td><p>Reason for a manual change</p>
</td></tr>
<tr><td><p>pay_run_id</p>
</td><td><p>uuid → pay_runs</p>
</td><td><p>FK</p>
</td><td><p>Pay run that used this day</p>
</td></tr>
</tbody></table>

<p><strong>A.6.8 attendance_requests</strong></p>
<p><em>Why it exists:</em> Employees can ask HR to fix a missing punch from self-service. The request needs its own row so it can be approved and tracked. <em>Used for:</em> Shown in My Requests and the Missing Punch Queue; on approval the attendance day is updated.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Who asked</p>
</td></tr>
<tr><td><p>work_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Day to fix</p>
</td></tr>
<tr><td><p>request_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>MissingPunch</p>
</td></tr>
<tr><td><p>requested_time</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>The missing in or out time</p>
</td></tr>
<tr><td><p>reason</p>
</td><td><p>text</p>
</td><td></td><td><p>Why it was missed</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Pending, Approved or Refused</p>
</td></tr>
<tr><td><p>approval_request_id</p>
</td><td><p>uuid → approval_requests</p>
</td><td><p>FK</p>
</td><td><p>Its approval</p>
</td></tr>
</tbody></table>

<p><strong>A.6.9 overtime_requests</strong></p>
<p><em>Why it exists:</em> Overtime is paid only when approved. Each block of extra hours becomes a request, whether found in attendance or asked for by the employee. <em>Used for:</em> Overtime Requests screen; approved rows feed the OT_NORMAL, OT_NIGHT and OT_REST rules.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee</p>
</td></tr>
<tr><td><p>attendance_day_id</p>
</td><td><p>uuid → attendance_days</p>
</td><td><p>FK</p>
</td><td><p>Day the hours were worked</p>
</td></tr>
<tr><td><p>work_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Day</p>
</td></tr>
<tr><td><p>hours</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Hours asked for</p>
</td></tr>
<tr><td><p>source</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Attendance or Employee</p>
</td></tr>
<tr><td><p>ot_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Normal, Night, RestDay or Holiday</p>
</td></tr>
<tr><td><p>rate</p>
</td><td><p>numeric(4,2)</p>
</td><td></td><td><p>1.25 or 1.5, copied at approval</p>
</td></tr>
<tr><td><p>compensation</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Pay or SubstituteDay</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Pending, Approved or Refused</p>
</td></tr>
<tr><td><p>approval_request_id</p>
</td><td><p>uuid → approval_requests</p>
</td><td><p>FK</p>
</td><td><p>Its approval</p>
</td></tr>
<tr><td><p>pay_run_id</p>
</td><td><p>uuid → pay_runs</p>
</td><td><p>FK</p>
</td><td><p>Pay run that paid it</p>
</td></tr>
</tbody></table>

<p><strong>How the attendance and shifts tables connect</strong></p>
<table><thead><tr><th><p>From</p>
</th><th><p>Column</p>
</th><th><p>To</p>
</th><th><p>In simple words</p>
</th></tr>
</thead><tbody><tr><td><p>penalty_steps</p>
</td><td><p>policy_id</p>
</td><td><p>attendance_policies</p>
</td><td><p>Policy the step belongs to. One attendance_policies row can have many penalty_steps rows.</p>
</td></tr>
<tr><td><p>device_mappings</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee it belongs to. One employees row can have many device_mappings rows.</p>
</td></tr>
<tr><td><p>biometric_imports</p>
</td><td><p>imported_by</p>
</td><td><p>users</p>
</td><td><p>Who imported it. One users row can have many biometric_imports rows.</p>
</td></tr>
<tr><td><p>punches</p>
</td><td><p>import_id</p>
</td><td><p>biometric_imports</p>
</td><td><p>File it came from. One biometric_imports row can have many punches rows.</p>
</td></tr>
<tr><td><p>punches</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee. One employees row can have many punches rows.</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee; unique with work_date. One employees row can have many attendance_days rows.</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>shift_id</p>
</td><td><p>shifts</p>
</td><td><p>Shift that applied that day. One shifts row can have many attendance_days rows.</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>public_holiday_id</p>
</td><td><p>public_holidays</p>
</td><td><p>Holiday that day, if any. One public_holidays row can have many attendance_days rows.</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>leave_request_id</p>
</td><td><p>leave_requests</p>
</td><td><p>Approved leave that day, if any. One leave_requests row can have many attendance_days rows.</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>manager_confirmed_by</p>
</td><td><p>users</p>
</td><td><p>Manager who confirmed. One users row can have many attendance_days rows.</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>hr_confirmed_by</p>
</td><td><p>users</p>
</td><td><p>HR user who confirmed. One users row can have many attendance_days rows.</p>
</td></tr>
<tr><td><p>attendance_days</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Pay run that used this day. One pay_runs row can have many attendance_days rows.</p>
</td></tr>
<tr><td><p>attendance_requests</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Who asked. One employees row can have many attendance_requests rows.</p>
</td></tr>
<tr><td><p>attendance_requests</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Its approval. Each approval belongs to one attendance_requests row.</p>
</td></tr>
<tr><td><p>overtime_requests</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee. One employees row can have many overtime_requests rows.</p>
</td></tr>
<tr><td><p>overtime_requests</p>
</td><td><p>attendance_day_id</p>
</td><td><p>attendance_days</p>
</td><td><p>Day the hours were worked. One attendance_days row can have many overtime_requests rows.</p>
</td></tr>
<tr><td><p>overtime_requests</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Its approval. Each approval belongs to one overtime_requests row.</p>
</td></tr>
<tr><td><p>overtime_requests</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Pay run that paid it. One pay_runs row can have many overtime_requests rows.</p>
</td></tr>
</tbody></table>

<p>The flow through these tables follows Section 7.3: biometric_imports brings in punches, punches build attendance_days, extra hours become overtime_requests, and the manager and HR confirm attendance_days before payroll reads them.</p>
<p><strong>A.7 Leave and holidays</strong></p>
<p><strong>In simple words:</strong> Leave rules, balances, requests and the public holiday calendar. Leave types and accrual plans are the rules, allocations are the balance, and requests are what employees ask for.</p>
<p>↗ leave and holidays · 5 tables with every column</p>
<p><strong>A.7.1 public_holidays</strong></p>
<p><em>Why it exists:</em> Official holidays change every year and some apply only to one branch. They are kept as dates, not code. <em>Used for:</em> Leave day counts skip them; attendance marks them; work on them becomes holiday overtime.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>branch_id</p>
</td><td><p>uuid → branches</p>
</td><td><p>FK</p>
</td><td><p>Branch, or empty for every branch</p>
</td></tr>
<tr><td><p>holiday_date</p>
</td><td><p>date</p>
</td><td></td><td><p>The date</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Holiday name in English</p>
</td></tr>
<tr><td><p>name_ar</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Holiday name in Arabic</p>
</td></tr>
<tr><td><p>year</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Calendar year, for quick lists</p>
</td></tr>
</tbody></table>

<p><strong>A.7.2 leave_types</strong></p>
<p><em>Why it exists:</em> Each kind of leave has its own rules (paid or not, pay bands, attachment, GM approval). Storing them as rows lets HR add a type without a programmer. <em>Used for:</em> Chosen on every leave request; pay bands decide SICK_HALF and SICK_NONE.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>code</p>
</td><td><p>varchar(20)</p>
</td><td><p>UK</p>
</td><td><p>Short code, e.g. ANNUAL, SICK</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Name in English</p>
</td></tr>
<tr><td><p>name_ar</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Name in Arabic</p>
</td></tr>
<tr><td><p>is_paid</p>
</td><td><p>boolean</p>
</td><td></td><td><p>Paid or unpaid leave</p>
</td></tr>
<tr><td><p>max_days_per_year</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Yearly limit, e.g. 90 for sick</p>
</td></tr>
<tr><td><p>pay_bands</p>
</td><td><p>jsonb</p>
</td><td></td><td><p>Day ranges at full, half and no pay</p>
</td></tr>
<tr><td><p>needs_attachment</p>
</td><td><p>boolean</p>
</td><td></td><td><p>e.g. medical certificate</p>
</td></tr>
<tr><td><p>needs_gm</p>
</td><td><p>boolean</p>
</td><td></td><td><p>Always needs GM approval</p>
</td></tr>
<tr><td><p>gm_after_days</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Needs GM approval when longer than this</p>
</td></tr>
</tbody></table>

<p><strong>A.7.3 accrual_plans</strong></p>
<p><em>Why it exists:</em> Annual leave is earned month by month. The plan stores how fast, from when and how much may carry over. <em>Used for:</em> A monthly job adds days to leave_allocations from the plan.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>leave_type_id</p>
</td><td><p>uuid → leave_types</p>
</td><td><p>FK</p>
</td><td><p>Leave type earned</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Plan name</p>
</td></tr>
<tr><td><p>days_per_month</p>
</td><td><p>numeric(4,2)</p>
</td><td></td><td><p>e.g. 2 days a month</p>
</td></tr>
<tr><td><p>start_after_months</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Waiting period, e.g. 6 months</p>
</td></tr>
<tr><td><p>yearly_cap</p>
</td><td><p>smallint</p>
</td><td></td><td><p>e.g. 30 days a year</p>
</td></tr>
<tr><td><p>carry_over_max</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Days that may move to next year</p>
</td></tr>
<tr><td><p>carry_over_expiry_months</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Months before carried days expire</p>
</td></tr>
</tbody></table>

<p><strong>A.7.4 leave_allocations</strong></p>
<p><em>Why it exists:</em> Holds how many days of each leave type an employee has and has used in a period. The balance is days_allocated plus carry_over_days minus days_taken. <em>Used for:</em> Checked when leave is requested; updated when it is approved, refused or cancelled; shown in Leave Balances and the leave report.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee</p>
</td></tr>
<tr><td><p>leave_type_id</p>
</td><td><p>uuid → leave_types</p>
</td><td><p>FK</p>
</td><td><p>Leave type</p>
</td></tr>
<tr><td><p>allocation_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Regular or Accrual</p>
</td></tr>
<tr><td><p>accrual_plan_id</p>
</td><td><p>uuid → accrual_plans</p>
</td><td><p>FK</p>
</td><td><p>Plan, for accrual allocations</p>
</td></tr>
<tr><td><p>days_allocated</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Days given or earned</p>
</td></tr>
<tr><td><p>days_taken</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Days used by approved leave</p>
</td></tr>
<tr><td><p>valid_from</p>
</td><td><p>date</p>
</td><td></td><td><p>Period start</p>
</td></tr>
<tr><td><p>valid_to</p>
</td><td><p>date</p>
</td><td></td><td><p>Period end</p>
</td></tr>
<tr><td><p>carry_over_days</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Days brought from last year</p>
</td></tr>
<tr><td><p>carry_over_expiry</p>
</td><td><p>date</p>
</td><td></td><td><p>When carried days expire</p>
</td></tr>
</tbody></table>

<p><strong>A.7.5 leave_requests</strong></p>
<p><em>Why it exists:</em> Each leave application with its dates, days and status. Only approved requests change the balance and reach payroll. <em>Used for:</em> Leave screens, approval inbox, attendance (day_type Leave) and the pay run.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee</p>
</td></tr>
<tr><td><p>leave_type_id</p>
</td><td><p>uuid → leave_types</p>
</td><td><p>FK</p>
</td><td><p>Leave type</p>
</td></tr>
<tr><td><p>leave_allocation_id</p>
</td><td><p>uuid → leave_allocations</p>
</td><td><p>FK</p>
</td><td><p>Allocation the days come from</p>
</td></tr>
<tr><td><p>date_from</p>
</td><td><p>date</p>
</td><td></td><td><p>First day</p>
</td></tr>
<tr><td><p>date_to</p>
</td><td><p>date</p>
</td><td></td><td><p>Last day</p>
</td></tr>
<tr><td><p>half_day</p>
</td><td><p>varchar(5)</p>
</td><td></td><td><p>None, AM or PM</p>
</td></tr>
<tr><td><p>days</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Days counted, without holidays and weekly off</p>
</td></tr>
<tr><td><p>reason</p>
</td><td><p>text</p>
</td><td></td><td><p>Reason</p>
</td></tr>
<tr><td><p>attachment_url</p>
</td><td><p>text</p>
</td><td></td><td><p>Certificate or other file</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Draft, Pending, Approved, Refused or Cancelled</p>
</td></tr>
<tr><td><p>approval_request_id</p>
</td><td><p>uuid → approval_requests</p>
</td><td><p>FK</p>
</td><td><p>Its approval</p>
</td></tr>
<tr><td><p>pay_run_id</p>
</td><td><p>uuid → pay_runs</p>
</td><td><p>FK</p>
</td><td><p>Pay run that used it</p>
</td></tr>
</tbody></table>

<p><strong>How the leave and holidays tables connect</strong></p>
<table><thead><tr><th><p>From</p>
</th><th><p>Column</p>
</th><th><p>To</p>
</th><th><p>In simple words</p>
</th></tr>
</thead><tbody><tr><td><p>public_holidays</p>
</td><td><p>branch_id</p>
</td><td><p>branches</p>
</td><td><p>Branch, or empty for every branch. One branches row can have many public_holidays rows.</p>
</td></tr>
<tr><td><p>accrual_plans</p>
</td><td><p>leave_type_id</p>
</td><td><p>leave_types</p>
</td><td><p>Leave type earned. One leave_types row can have many accrual_plans rows.</p>
</td></tr>
<tr><td><p>leave_allocations</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee. One employees row can have many leave_allocations rows.</p>
</td></tr>
<tr><td><p>leave_allocations</p>
</td><td><p>leave_type_id</p>
</td><td><p>leave_types</p>
</td><td><p>Leave type. One leave_types row can have many leave_allocations rows.</p>
</td></tr>
<tr><td><p>leave_allocations</p>
</td><td><p>accrual_plan_id</p>
</td><td><p>accrual_plans</p>
</td><td><p>Plan, for accrual allocations. One accrual_plans row can have many leave_allocations rows.</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee. One employees row can have many leave_requests rows.</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>leave_type_id</p>
</td><td><p>leave_types</p>
</td><td><p>Leave type. One leave_types row can have many leave_requests rows.</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>leave_allocation_id</p>
</td><td><p>leave_allocations</p>
</td><td><p>Allocation the days come from. One leave_allocations row can have many leave_requests rows.</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Its approval. Each approval belongs to one leave_requests row.</p>
</td></tr>
<tr><td><p>leave_requests</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Pay run that used it. One pay_runs row can have many leave_requests rows.</p>
</td></tr>
</tbody></table>

<p>When a request is approved, days_taken on its allocation goes up and each day is marked on attendance_days with day_type Leave and its pay band. Cancelling reverses both.</p>
<p><strong>A.8 Payroll</strong></p>
<p><strong>In simple words:</strong> Salary rules are the maths, a pay run is one month for one company visa, a payslip is one employee's result, and payslip lines show where every amount came from. Adjustments hold loans, advances, bonuses and corrections.</p>
<p>↗ payroll · 7 tables with every column</p>
<p><strong>A.8.1 salary_structures</strong></p>
<p><em>Why it exists:</em> Groups the salary rules used for a set of employees, with a separate structure for final settlement. <em>Used for:</em> Each contract points to a structure; salary_rules hang under it.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>code</p>
</td><td><p>varchar(20)</p>
</td><td><p>UK</p>
</td><td><p>Short code, e.g. MONTHLY, FINAL</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Name</p>
</td></tr>
<tr><td><p>unpaid_entry_types</p>
</td><td><p>text[]</p>
</td><td></td><td><p>Day types that reduce paid days, so a day is never deducted twice</p>
</td></tr>
<tr><td><p>is_final_settlement</p>
</td><td><p>boolean</p>
</td><td></td><td><p>True for the exit structure</p>
</td></tr>
</tbody></table>

<p><strong>A.8.2 salary_rules</strong></p>
<p><em>Why it exists:</em> Every payslip line (BASIC, OT_NORMAL, LOAN ...) is a row with a formula, so rates change in Settings, not in code. <em>Used for:</em> The payroll engine runs them in sequence for each employee.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>structure_id</p>
</td><td><p>uuid → salary_structures</p>
</td><td><p>FK</p>
</td><td><p>Structure; code is unique within it</p>
</td></tr>
<tr><td><p>code</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>e.g. BASIC, OT_NIGHT, NET</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Name on the payslip</p>
</td></tr>
<tr><td><p>category</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Basic, Allowance, Gross, Earning, Deduction or Net</p>
</td></tr>
<tr><td><p>sequence</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Order of calculation</p>
</td></tr>
<tr><td><p>condition</p>
</td><td><p>text</p>
</td><td></td><td><p>When the rule applies</p>
</td></tr>
<tr><td><p>amount_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Fixed, Percent, Input or Formula</p>
</td></tr>
<tr><td><p>formula</p>
</td><td><p>text</p>
</td><td></td><td><p>e.g. basic / 30 / 8 * 1.25 * ot_hours</p>
</td></tr>
<tr><td><p>appears_on_payslip</p>
</td><td><p>boolean</p>
</td><td></td><td><p>Shown to the employee or hidden</p>
</td></tr>
<tr><td><p>debit_account</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Ledger account for the accounting export</p>
</td></tr>
<tr><td><p>credit_account</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Ledger account for the accounting export</p>
</td></tr>
</tbody></table>

<p><strong>A.8.3 pay_runs</strong></p>
<p><em>Why it exists:</em> One month of payroll for one company visa. Its status walks Draft, Calculated, Validated, Locked, Paid, and nothing is edited after Locked. <em>Used for:</em> Pay Runs screens, approval, the SIF file and the payroll register.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>company_visa_id</p>
</td><td><p>uuid → company_visas</p>
</td><td><p>FK</p>
</td><td><p>Which WPS employer</p>
</td></tr>
<tr><td><p>run_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Regular or FinalSettlement</p>
</td></tr>
<tr><td><p>period_month</p>
</td><td><p>date</p>
</td><td></td><td><p>First day of the month paid</p>
</td></tr>
<tr><td><p>cutoff_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Inputs approved after this go to next month</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Draft, Calculated, Validated, Locked or Paid</p>
</td></tr>
<tr><td><p>calculated_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>Last calculation</p>
</td></tr>
<tr><td><p>validated_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>HR Manager who validated</p>
</td></tr>
<tr><td><p>validated_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When</p>
</td></tr>
<tr><td><p>approval_request_id</p>
</td><td><p>uuid → approval_requests</p>
</td><td><p>FK</p>
</td><td><p>GM approval</p>
</td></tr>
<tr><td><p>locked_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Who locked it</p>
</td></tr>
<tr><td><p>locked_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When; after this no edits</p>
</td></tr>
<tr><td><p>sif_file_url</p>
</td><td><p>text</p>
</td><td></td><td><p>SIF file made from the locked run</p>
</td></tr>
<tr><td><p>payment_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Date salaries were paid</p>
</td></tr>
<tr><td><p>paid_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When Finance marked it Paid</p>
</td></tr>
</tbody></table>

<p><strong>A.8.4 pay_run_issues</strong></p>
<p><em>Why it exists:</em> Validation finds problems before calculation (no IBAN, unconfirmed attendance). Each problem is one row, so the list can be worked through and cleared. <em>Used for:</em> Validation tab of Pay Run Detail and the dashboard exceptions tile.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>pay_run_id</p>
</td><td><p>uuid → pay_runs</p>
</td><td><p>FK</p>
</td><td><p>Pay run checked</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee with the problem</p>
</td></tr>
<tr><td><p>issue_code</p>
</td><td><p>varchar(40)</p>
</td><td></td><td><p>e.g. MISSING_IBAN, ATTENDANCE_NOT_CONFIRMED</p>
</td></tr>
<tr><td><p>message</p>
</td><td><p>text</p>
</td><td></td><td><p>Plain-language description</p>
</td></tr>
<tr><td><p>severity</p>
</td><td><p>varchar(10)</p>
</td><td></td><td><p>Blocking or Warning</p>
</td></tr>
<tr><td><p>resolved_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When it was fixed</p>
</td></tr>
</tbody></table>

<p><strong>A.8.5 payslips</strong></p>
<p><em>Why it exists:</em> One employee's pay for one pay run, with the totals and the comparison with last month. <em>Used for:</em> Payslip PDF, payroll register, variance report, SIF lines and self-service.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>pay_run_id</p>
</td><td><p>uuid → pay_runs</p>
</td><td><p>FK</p>
</td><td><p>Pay run; one payslip per employee per run</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee</p>
</td></tr>
<tr><td><p>contract_id</p>
</td><td><p>uuid → contracts</p>
</td><td><p>FK</p>
</td><td><p>Contract version used</p>
</td></tr>
<tr><td><p>period_from</p>
</td><td><p>date</p>
</td><td></td><td><p>First day paid</p>
</td></tr>
<tr><td><p>period_to</p>
</td><td><p>date</p>
</td><td></td><td><p>Last day paid</p>
</td></tr>
<tr><td><p>paid_days</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Days paid in the month</p>
</td></tr>
<tr><td><p>worked_days</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Days worked</p>
</td></tr>
<tr><td><p>basic</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Basic for the period</p>
</td></tr>
<tr><td><p>gross</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Gross for the period</p>
</td></tr>
<tr><td><p>total_deductions</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>All deductions</p>
</td></tr>
<tr><td><p>net</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Net paid by WPS</p>
</td></tr>
<tr><td><p>previous_net</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Net last month, for the variance review</p>
</td></tr>
<tr><td><p>variance_pct</p>
</td><td><p>numeric(6,2)</p>
</td><td></td><td><p>Change from last month</p>
</td></tr>
<tr><td><p>variance_reason</p>
</td><td><p>text</p>
</td><td></td><td><p>Reason when above the threshold</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Draft, Calculated, Locked or Paid</p>
</td></tr>
<tr><td><p>is_final_settlement</p>
</td><td><p>boolean</p>
</td><td></td><td><p>True for an exit payslip</p>
</td></tr>
<tr><td><p>corrects_payslip_id</p>
</td><td><p>uuid → payslips</p>
</td><td><p>FK</p>
</td><td><p>Original payslip this one corrects</p>
</td></tr>
<tr><td><p>pdf_url</p>
</td><td><p>text</p>
</td><td></td><td><p>Generated PDF</p>
</td></tr>
</tbody></table>

<p><strong>A.8.6 payslip_lines</strong></p>
<p><em>Why it exists:</em> The lines of a payslip, one per salary rule, each pointing to the record it came from. This is what makes every amount traceable. <em>Used for:</em> Payslip detail, accounting export and audits.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>payslip_id</p>
</td><td><p>uuid → payslips</p>
</td><td><p>FK</p>
</td><td><p>Payslip</p>
</td></tr>
<tr><td><p>salary_rule_id</p>
</td><td><p>uuid → salary_rules</p>
</td><td><p>FK</p>
</td><td><p>Rule that produced the line</p>
</td></tr>
<tr><td><p>code</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Rule code, copied</p>
</td></tr>
<tr><td><p>name</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>Rule name, copied</p>
</td></tr>
<tr><td><p>quantity</p>
</td><td><p>numeric(8,2)</p>
</td><td></td><td><p>Hours or days</p>
</td></tr>
<tr><td><p>rate</p>
</td><td><p>numeric(12,4)</p>
</td><td></td><td><p>Rate per hour or day</p>
</td></tr>
<tr><td><p>amount</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Line amount</p>
</td></tr>
<tr><td><p>source_type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Contract, Attendance, Overtime, Leave, Adjustment or Settlement</p>
</td></tr>
<tr><td><p>source_id</p>
</td><td><p>uuid</p>
</td><td></td><td><p>ID of the source row</p>
</td></tr>
</tbody></table>

<p><strong>A.8.7 salary_adjustments</strong></p>
<p><em>Why it exists:</em> Loans, advances, recurring deductions, bonuses and corrections are agreed outside the monthly routine and must be approved before payroll uses them. <em>Used for:</em> Salary Adjustments screen; approved rows feed LOAN, ADV and other rules each month until the balance is zero.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee</p>
</td></tr>
<tr><td><p>type</p>
</td><td><p>varchar(30)</p>
</td><td></td><td><p>Loan, Advance, RecurringDeduction, Bonus or Correction</p>
</td></tr>
<tr><td><p>total_amount</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Total agreed</p>
</td></tr>
<tr><td><p>monthly_amount</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Amount per month</p>
</td></tr>
<tr><td><p>start_month</p>
</td><td><p>date</p>
</td><td></td><td><p>First month used</p>
</td></tr>
<tr><td><p>balance</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Amount still to recover or pay</p>
</td></tr>
<tr><td><p>reason</p>
</td><td><p>text</p>
</td><td></td><td><p>Why</p>
</td></tr>
<tr><td><p>corrects_payslip_id</p>
</td><td><p>uuid → payslips</p>
</td><td><p>FK</p>
</td><td><p>Locked payslip being corrected, for type Correction</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Pending, Approved, Active, Closed or Refused</p>
</td></tr>
<tr><td><p>approval_request_id</p>
</td><td><p>uuid → approval_requests</p>
</td><td><p>FK</p>
</td><td><p>Its approval</p>
</td></tr>
</tbody></table>

<p><strong>How the payroll tables connect</strong></p>
<table><thead><tr><th><p>From</p>
</th><th><p>Column</p>
</th><th><p>To</p>
</th><th><p>In simple words</p>
</th></tr>
</thead><tbody><tr><td><p>salary_rules</p>
</td><td><p>structure_id</p>
</td><td><p>salary_structures</p>
</td><td><p>Structure; code is unique within it. One salary_structures row can have many salary_rules rows.</p>
</td></tr>
<tr><td><p>pay_runs</p>
</td><td><p>company_visa_id</p>
</td><td><p>company_visas</p>
</td><td><p>Which WPS employer. One company_visas row can have many pay_runs rows.</p>
</td></tr>
<tr><td><p>pay_runs</p>
</td><td><p>validated_by</p>
</td><td><p>users</p>
</td><td><p>HR Manager who validated. One users row can have many pay_runs rows.</p>
</td></tr>
<tr><td><p>pay_runs</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>GM approval. Each approval belongs to one pay_runs row.</p>
</td></tr>
<tr><td><p>pay_runs</p>
</td><td><p>locked_by</p>
</td><td><p>users</p>
</td><td><p>Who locked it. One users row can have many pay_runs rows.</p>
</td></tr>
<tr><td><p>pay_run_issues</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Pay run checked. One pay_runs row can have many pay_run_issues rows.</p>
</td></tr>
<tr><td><p>pay_run_issues</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee with the problem. One employees row can have many pay_run_issues rows.</p>
</td></tr>
<tr><td><p>payslips</p>
</td><td><p>pay_run_id</p>
</td><td><p>pay_runs</p>
</td><td><p>Pay run; one payslip per employee per run. One pay_runs row can have many payslips rows.</p>
</td></tr>
<tr><td><p>payslips</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee. One employees row can have many payslips rows.</p>
</td></tr>
<tr><td><p>payslips</p>
</td><td><p>contract_id</p>
</td><td><p>contracts</p>
</td><td><p>Contract version used. One contracts row can have many payslips rows.</p>
</td></tr>
<tr><td><p>payslips</p>
</td><td><p>corrects_payslip_id</p>
</td><td><p>payslips</p>
</td><td><p>Original payslip this one corrects. Points to another row in the same table.</p>
</td></tr>
<tr><td><p>payslip_lines</p>
</td><td><p>payslip_id</p>
</td><td><p>payslips</p>
</td><td><p>Payslip. One payslips row can have many payslip_lines rows.</p>
</td></tr>
<tr><td><p>payslip_lines</p>
</td><td><p>salary_rule_id</p>
</td><td><p>salary_rules</p>
</td><td><p>Rule that produced the line. One salary_rules row can have many payslip_lines rows.</p>
</td></tr>
<tr><td><p>salary_adjustments</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee. One employees row can have many salary_adjustments rows.</p>
</td></tr>
<tr><td><p>salary_adjustments</p>
</td><td><p>corrects_payslip_id</p>
</td><td><p>payslips</p>
</td><td><p>Locked payslip being corrected, for type Correction. One payslips row can have many salary_adjustments rows.</p>
</td></tr>
<tr><td><p>salary_adjustments</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Its approval. Each approval belongs to one salary_adjustments row.</p>
</td></tr>
</tbody></table>

<p>How a correction is stored: the locked payslip stays as it is. A salary_adjustments row of type Correction points to it through corrects_payslip_id and is approved; next month's payslip carries the correction line, and its own corrects_payslip_id points back to the original. Attendance days, overtime requests and leave requests record the pay_run_id that used them, so nothing is paid twice.</p>
<p><strong>A.9 Offboarding</strong></p>
<p><strong>In simple words:</strong> An employee leaving: the exit itself, the clearance checklist, the frozen final settlement and the follow-up tasks for HR.</p>
<p>↗ offboarding · 4 tables with every column</p>
<p><strong>A.9.1 separations</strong></p>
<p><em>Why it exists:</em> Records that an employee is leaving, why and when. Everything about the exit hangs from this row. <em>Used for:</em> Resignation / Termination screen; clearance, settlement and tasks point to it.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>employee_id</p>
</td><td><p>uuid → employees</p>
</td><td><p>FK</p>
</td><td><p>Employee leaving</p>
</td></tr>
<tr><td><p>type</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Resignation, Termination or EndOfContract</p>
</td></tr>
<tr><td><p>reason</p>
</td><td><p>text</p>
</td><td></td><td><p>Reason</p>
</td></tr>
<tr><td><p>notice_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Date notice was given</p>
</td></tr>
<tr><td><p>last_working_day</p>
</td><td><p>date</p>
</td><td></td><td><p>Final working date</p>
</td></tr>
<tr><td><p>notice_shortfall_days</p>
</td><td><p>smallint</p>
</td><td></td><td><p>Notice days not served</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Pending, Approved, Clearance, Settled or Closed</p>
</td></tr>
<tr><td><p>approval_request_id</p>
</td><td><p>uuid → approval_requests</p>
</td><td><p>FK</p>
</td><td><p>Its approval</p>
</td></tr>
<tr><td><p>access_deactivated_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When the login was switched off</p>
</td></tr>
</tbody></table>

<p><strong>A.9.2 clearance_items</strong></p>
<p><em>Why it exists:</em> Before an employee is paid out, each department confirms nothing is outstanding. Each item is a row with its owner. <em>Used for:</em> Clearance Checklist; open items block settlement approval; amounts due feed the settlement.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>separation_id</p>
</td><td><p>uuid → separations</p>
</td><td><p>FK</p>
</td><td><p>The exit</p>
</td></tr>
<tr><td><p>department_id</p>
</td><td><p>uuid → departments</p>
</td><td><p>FK</p>
</td><td><p>Department that clears it</p>
</td></tr>
<tr><td><p>owner_user_id</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Person who clears it</p>
</td></tr>
<tr><td><p>item</p>
</td><td><p>varchar(100)</p>
</td><td></td><td><p>e.g. Laptop, ID card, Loan, Visa</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Pending, Cleared or Waived</p>
</td></tr>
<tr><td><p>amount_due</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Amount to recover, if any</p>
</td></tr>
<tr><td><p>cleared_by</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>Who cleared it</p>
</td></tr>
<tr><td><p>cleared_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When</p>
</td></tr>
<tr><td><p>note</p>
</td><td><p>text</p>
</td><td></td><td><p>Note</p>
</td></tr>
</tbody></table>

<p><strong>A.9.3 final_settlements</strong></p>
<p><em>Why it exists:</em> Freezes every exit amount once approved, so later rule changes cannot alter what the employee was owed. <em>Used for:</em> Final Settlement screen; produces the final-settlement payslip.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>separation_id</p>
</td><td><p>uuid → separations</p>
</td><td><p>FK, unique</p>
</td><td><p>The exit; one settlement each</p>
</td></tr>
<tr><td><p>salary_due</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Salary to the last day</p>
</td></tr>
<tr><td><p>gratuity</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>End-of-service benefit</p>
</td></tr>
<tr><td><p>leave_encashment_days</p>
</td><td><p>numeric(5,2)</p>
</td><td></td><td><p>Unused leave days paid</p>
</td></tr>
<tr><td><p>leave_encashment</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Days x basic daily wage</p>
</td></tr>
<tr><td><p>notice_recovery</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Notice shortfall recovered</p>
</td></tr>
<tr><td><p>loan_recovery</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Loan and advance balance</p>
</td></tr>
<tr><td><p>training_recovery</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Training cost recovered</p>
</td></tr>
<tr><td><p>clearance_recovery</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Amounts due from clearance</p>
</td></tr>
<tr><td><p>other_recovery</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Other agreed amounts</p>
</td></tr>
<tr><td><p>net_payable</p>
</td><td><p>numeric(12,2)</p>
</td><td></td><td><p>Final amount paid</p>
</td></tr>
<tr><td><p>snapshot</p>
</td><td><p>jsonb</p>
</td><td></td><td><p>All inputs and figures frozen at approval</p>
</td></tr>
<tr><td><p>payslip_id</p>
</td><td><p>uuid → payslips</p>
</td><td><p>FK</p>
</td><td><p>Final-settlement payslip</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Draft, Calculated, Approved or Paid</p>
</td></tr>
<tr><td><p>approval_request_id</p>
</td><td><p>uuid → approval_requests</p>
</td><td><p>FK</p>
</td><td><p>Its approval</p>
</td></tr>
</tbody></table>

<p><strong>A.9.4 separation_tasks</strong></p>
<p><em>Why it exists:</em> Visa and labour card cancellation must be done by HR after the exit. Each task is tracked so it is not forgotten. <em>Used for:</em> Task list for HR on the exit record.</p>
<table><thead><tr><th><p>Column</p>
</th><th><p>Type</p>
</th><th><p>Key</p>
</th><th><p>What it holds</p>
</th></tr>
</thead><tbody><tr><td><p>id</p>
</td><td><p>uuid</p>
</td><td><p>PK</p>
</td><td><p>Unique ID</p>
</td></tr>
<tr><td><p>separation_id</p>
</td><td><p>uuid → separations</p>
</td><td><p>FK</p>
</td><td><p>The exit</p>
</td></tr>
<tr><td><p>task_type</p>
</td><td><p>varchar(30)</p>
</td><td></td><td><p>VisaCancellation or LabourCardCancellation</p>
</td></tr>
<tr><td><p>assigned_to</p>
</td><td><p>uuid → users</p>
</td><td><p>FK</p>
</td><td><p>HR user responsible</p>
</td></tr>
<tr><td><p>due_date</p>
</td><td><p>date</p>
</td><td></td><td><p>Due date</p>
</td></tr>
<tr><td><p>status</p>
</td><td><p>varchar(20)</p>
</td><td></td><td><p>Open or Done</p>
</td></tr>
<tr><td><p>completed_at</p>
</td><td><p>timestamptz</p>
</td><td></td><td><p>When it was done</p>
</td></tr>
</tbody></table>

<p><strong>How the offboarding tables connect</strong></p>
<table><thead><tr><th><p>From</p>
</th><th><p>Column</p>
</th><th><p>To</p>
</th><th><p>In simple words</p>
</th></tr>
</thead><tbody><tr><td><p>separations</p>
</td><td><p>employee_id</p>
</td><td><p>employees</p>
</td><td><p>Employee leaving. One employees row can have many separations rows (for example after a rehire).</p>
</td></tr>
<tr><td><p>separations</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Its approval. Each approval belongs to one separations row.</p>
</td></tr>
<tr><td><p>clearance_items</p>
</td><td><p>separation_id</p>
</td><td><p>separations</p>
</td><td><p>The exit. One separations row can have many clearance_items rows.</p>
</td></tr>
<tr><td><p>clearance_items</p>
</td><td><p>department_id</p>
</td><td><p>departments</p>
</td><td><p>Department that clears it. One departments row can have many clearance_items rows.</p>
</td></tr>
<tr><td><p>clearance_items</p>
</td><td><p>owner_user_id</p>
</td><td><p>users</p>
</td><td><p>Person who clears it. One users row can have many clearance_items rows.</p>
</td></tr>
<tr><td><p>clearance_items</p>
</td><td><p>cleared_by</p>
</td><td><p>users</p>
</td><td><p>Who cleared it. One users row can have many clearance_items rows.</p>
</td></tr>
<tr><td><p>final_settlements</p>
</td><td><p>separation_id</p>
</td><td><p>separations</p>
</td><td><p>The exit; one settlement each. At most one final_settlements row for each separations row.</p>
</td></tr>
<tr><td><p>final_settlements</p>
</td><td><p>payslip_id</p>
</td><td><p>payslips</p>
</td><td><p>Final-settlement payslip. Each settlement has its own payslip, placed in a pay run of run_type FinalSettlement.</p>
</td></tr>
<tr><td><p>final_settlements</p>
</td><td><p>approval_request_id</p>
</td><td><p>approval_requests</p>
</td><td><p>Its approval. Each approval belongs to one final_settlements row.</p>
</td></tr>
<tr><td><p>separation_tasks</p>
</td><td><p>separation_id</p>
</td><td><p>separations</p>
</td><td><p>The exit. One separations row can have many separation_tasks rows.</p>
</td></tr>
<tr><td><p>separation_tasks</p>
</td><td><p>assigned_to</p>
</td><td><p>users</p>
</td><td><p>HR user responsible. One users row can have many separation_tasks rows.</p>
</td></tr>
</tbody></table>

<p>When the settlement is paid, users.deactivated_at and separations.access_deactivated_at are set, and the employee's status becomes Archived. The employee row itself is kept, because payslips, documents and the audit history still point to it.</p>
<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<h2>17. Sign-off</h2>

<table><thead><tr><th><p>Role</p>
</th><th><p>Name</p>
</th><th><p>Signature</p>
</th><th><p>Date</p>
</th></tr>
</thead><tbody><tr><td><p>Prepared by</p>
</td><td><p>Mohamed Imran, AI/ML Developer</p>
</td><td></td><td></td></tr>
<tr><td><p>Reviewed by</p>
</td><td></td><td></td><td></td></tr>
<tr><td><p>Approved by</p>
</td><td></td><td></td><td></td></tr>
</tbody></table>

<p><em>Nextal Technologies · HR &amp; Payroll Software · Prepared by Mohamed Imran</em></p>
<p><em>© 2026 Nextal Technologies. Confidential — for internal and client review only.</em></p>
