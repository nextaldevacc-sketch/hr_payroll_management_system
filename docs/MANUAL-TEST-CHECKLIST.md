# Nextal HR & Payroll Platform - Manual Testing Checklist

> **Version**: v1.0.0-rc3  
> **Target Audience**: QA Engineers, Security Auditors, Client Stakeholders  
> **Specification Reference**: `docs/spec.md` (Sections 1, 5.3, 7.1–7.7, 8.1–8.4, 9, 15)  
> **Environment**: Web App `http://localhost:3100` & Backend API `http://localhost:5000`

---

## 1. Persona Accounts & Access Credentials

All demo user accounts share the common password: **`Nextal@2026!`**

| Persona | Email | Primary Responsibilities | Statutory Scope | Sees Salary |
|---------|-------|--------------------------|-----------------|:-----------:|
| **Platform Administrator** | `platform@nextal.ae` | Multi-tenant company onboarding, tenant licensing | **Phase 2 (Deferred)**. Disabled via `FEATURE_PLATFORM_ADMIN=false`. Provisioning via CLI: `node scripts/create-company.js`. | — |
| **Company Administrator** | `admin@gulftech.ae` | Organizational setup, department/shift/policy configuration, user accounts, audit view | Company 1 (`Gulf Tech Logistics LLC`) | **No** (Salary masked) |
| **General Manager (GM)** | `gm@gulftech.ae` | Pay run locking/approval, final settlement sign-off, extended leave approvals | Company 1 (Executive approval) | **Yes** |
| **HR Manager** | `hr.mgr@gulftech.ae` | Full HR lifecycle, contracts, attendance sign-off, leave approval, pay run validation | Company 1 (Full HR oversight) | **Yes** |
| **HR Officer** | `hr.officer@gulftech.ae` | Employee creation, document verification, biometric import, cancellation tasks | Company 1 (Company-wide HR) | **No** (Salary masked) |
| **HR Officer (DIFC Scoped)** | `hr.difc@gulftech.ae` | Scoped HR administration for DIFC Freezone Visa 02 | Scoped to Visa 02 only | **No** (Salary masked) |
| **Payroll Officer** | `payroll@gulftech.ae` | Pay run calculation, variance justification, contract creation, settlement preparation | Company 1 (Payroll execution) | **Yes** |
| **Finance Officer** | `finance@gulftech.ae` | WPS SIF export, payment execution (`Mark as Paid`), GL export, settlement disbursement | Company 1 (Disbursement & accounting) | **Yes** |
| **Department Manager** | `dept.mgr@gulftech.ae` | Operations team attendance review, overtime approvals, 1st step leave approvals | Scoped to Operations team | **No** (Salary masked) |
| **Employee Self-Service (Ahmed)** | `employee@gulftech.ae` | Personal self-service (`/me/*`), bilingual payslips (own data only), leave submission | Linked to Ahmed Al-Mansoori (`EMP-DXB-043`) | **No** (Own payslip only) |

### Employee Self-Service Logins (Gulf Tech Logistics LLC)
All 45 employees in Company 1 have individual active logins: `<employee_code_lowercase>@gulftech.ae` with password `Nextal@2026!`:
- `emp-dxb-001@gulftech.ae` (Tariq Al-Falasi) … `emp-dxb-045@gulftech.ae` (Tariq Mansoor)
- Spec benchmark employees:
  - `emp-dxb-040@gulftech.ae` (Zaid Al-Harbi, 11-month service)
  - `emp-dxb-041@gulftech.ae` (Khalid Al-Marzouqi, resignation test joiner)
  - `emp-dxb-042@gulftech.ae` (Omar Al-Hashimi, separated leaver)
  - `emp-dxb-043@gulftech.ae` & `employee@gulftech.ae` (Ahmed Al-Mansoori, October Net AED 7,044.80)
  - `emp-dxb-044@gulftech.ae` (Sara Al-Nuaimi, separation in progress, Gratuity AED 12,082.19)
  - `emp-dxb-045@gulftech.ae` (Tariq Mansoor, joins Nov 2026 without bank account for T28)

---

## 2. Key Spec Benchmark Figures (Ready to Verify)

These exact figures are seeded into Gulf Tech Logistics LLC and must be verified during manual testing:

### A. Ahmed Al-Mansoori (`EMP-DXB-043`) - October Payslip (Spec T19)
- **Position**: Operations Specialist | **Residency**: Expat (EGY) | **Visa**: Visa 01 (MOHRE Dubai)
- **Contract Earnings**:
  - Basic Salary: **AED 5,000.00**
  - Housing Allowance (HRA): **AED 2,000.00**
  - Transport Allowance (TRA): **AED 500.00**
  - Other Allowance (OTH): **AED 500.00**
  - **Contract Gross**: **AED 8,000.00**
- **October Adjustments**:
  - Overtime (3.0 hrs normal @ 1.25): **+AED 78.13** `((5000 / 240) * 1.25 * 3)`
  - Unapproved Absence (2 days ÷ 30): **-AED 533.33** `((8000 / 30) * 2)`
  - Loan Deduction (Month 3 of 6,000): **-AED 500.00**
- **Expected October Net Salary**: **`AED 7,044.80`**
- **Expected Remaining Loan Balance**: **`AED 4,500.00`**

### B. Sara Al-Nuaimi (`EMP-DXB-044`) - Separation in Progress (Spec T21)
- **Position**: Account Manager | **Joining Date**: 2023-05-01 | **LWD**: 2026-10-31
- **Tenure**: Exactly 3 Years, 6 Months (3.50 years)
- **Basic Salary**: AED 5,000.00
- **Gratuity Formula**: `3.50 * 21 * (5000 * 12 / 365)` = `73.5 * 164.38356`
- **Expected Gratuity**: **`AED 12,082.19`**
- **Settlement Status**: `Prepared` | **Employee Status**: `In Progress`

### C. Omar Al-Hashimi (`EMP-DXB-042`) - Approved Settlement (Spec T22 & T24)
- **Position**: Operations Specialist | **Joining Date**: 2019-11-03 | **LWD**: 2026-10-31
- **Tenure**: Exactly 7.00 Years (5 yrs @ 21 days + 2 yrs @ 30 days = 165 days)
- **Basic Salary**: AED 6,000.00 | **Gross Salary**: AED 10,000.00
- **Daily Wage**: `6000 * 12 / 365` = `AED 197.26027`
- **Expected Gratuity**: **`AED 32,547.95`** `(165 * 197.26027)`
- **Unused Leave Encashment (12 days)**: **`AED 2,367.12`** `(12 * 197.26027)`
- **October Salary Due (Full Month)**: **`AED 10,000.00`**
- **Net Final Settlement**: **`AED 44,915.07`**
- **Settlement Status**: `Approved` | **Employee Status**: `Archived`

### D. Zaid Al-Harbi (`EMP-DXB-040`) - 11-Month Tenure Separation (Spec T23)
- **Tenure**: 11 Months (Joining Date: 2025-11-30, LWD: 2026-10-31)
- **Article 51 Gratuity**: **`AED 0.00`** (Under 1 year of continuous service yields zero gratuity)

---

## 3. Step-by-Step Verification Procedures (Workflows 7.1 – 7.7 & VB)

### Workflow 7.1: Company Onboarding
1. **CLI Company Provisioning**:
   - Run in terminal: `node scripts/create-company.js --name "Test Onboarding LLC" --nameAr "شركة تجريبية" --tradeLicense "TL-TEST-99" --adminEmail "admin@testonboarding.ae"`
   - Expected: Output displays generated company ID and invite URL.
2. **Company Administrator Invite Acceptance**:
   - Open browser at invite URL.
   - Enter new password `Nextal@2026!` and submit.
   - Expected: Account activated, redirects to `/login`.
3. **Company Profile & Organizational Structure**:
   - Log in as `admin@gulftech.ae`.
   - Open `/settings`.
   - Update Trade License number or company address. Save and reload page.
   - Expected: Values persist. Audit log record generated.
4. **Visas & Branches**:
   - In `/settings`, navigate to **Visas** tab: verify `Visa 01 (MOHRE Dubai)` and `Visa 02 (DIFC Freezone)`.
   - In **Branches** tab: verify `Dubai Headquarters` (Visa 01), `Abu Dhabi Branch` (Visa 01), `DIFC FinTech Hub` (Visa 02).
   - Expected: Every branch links to exactly one visa.
5. **Departments, Jobs & Shifts**:
   - In `/settings`, verify 6 departments with cost centers (`CC-OPS`, `CC-ENG`, etc.).
   - Verify shift configurations (Morning Standard 08:00–17:00, 15m grace period).
6. **Salary Rules & Approval Settings**:
   - In `/settings`, verify the 17 Section 8.1 statutory salary rules.
   - Verify multi-step approval chains for Leave, Overtime, and Pay Runs.
7. **User Invitation & Role Delegation**:
   - In `/settings/users`, invite an HR Specialist.
   - Expected: User account created, invite email dispatched to dev mailer.

---

### Workflow 7.2: New Employee Setup & Bank Guard
1. **Create Pre-Joined Employee**:
   - Log in as `hr.officer@gulftech.ae`.
   - Navigate to `/employees` and open **Add Employee** modal.
   - Fill personal and job fields for a new hire. Submit.
   - Expected: Employee created with status `Pre-Joined`.
2. **HR Officer Verification Blocked (Dual Control)**:
   - While logged in as `hr.officer@gulftech.ae`, attempt to verify the employee.
   - Expected: Verify action is absent or returns 403 `FORBIDDEN` (HR Manager only).
3. **HR Manager Review & Send-Back**:
   - Log in as `hr.mgr@gulftech.ae`.
   - Open employee profile. Click **Send Back** with comment *"Please recheck passport expiry"*.
   - Expected: Status becomes `Draft/Returned`. Audit log captures comment.
4. **Contract Versioning**:
   - Log in as `payroll@gulftech.ae`.
   - Open employee profile -> **Contracts** tab. Create Contract Version 1 (Basic, Housing, Transport). Submit.
   - Expected: Contract created with status `Pending`.
   - Log in as `hr.mgr@gulftech.ae` -> click **Approve Contract**.
   - Expected: Contract status transitions to `Approved`.
5. **Compliance Documents Upload**:
   - Log in as `hr.officer@gulftech.ae`.
   - Upload Passport, Visa, Emirates ID, and Labour Card.
   - Expected: Files stored encrypted with `NEXTAL_ENC_V1` header.
6. **Statutory Bank Account Guard (Spec T27)**:
   - Attempt to activate employee without a bank account.
   - Expected: System blocks activation with error `BANK_ACCOUNT_MISSING`.
7. **Mod-97 UAE IBAN Validation**:
   - Log in as `payroll@gulftech.ae`.
   - Add bank account with invalid checksum `AE000331000000000000000`.
   - Expected: Blocked with error `INVALID_UAE_IBAN`.
   - Enter valid mod-97 IBAN `AE070331000000000000001`. Save.
   - Expected: Bank account successfully saved.
8. **Activation & Self-Service Login**:
   - Log in as `hr.mgr@gulftech.ae` -> click **Activate Employee**.
   - Expected: Status transitions to `Active`. Invite email generated.
   - Employee opens invite, sets password, and logs in to `/me`.

---

### Workflow 7.3: Attendance Biometric Import & Review
1. **Biometric File Import**:
   - Log in as `hr.officer@gulftech.ae`.
   - Navigate to `/attendance` -> click **Import CSV**.
   - Upload October 2026 biometric punches.
   - Expected: Import summary shows total processed, valid punches, and exceptions.
2. **Idempotent Re-Import Protection (Spec T4)**:
   - Upload the identical CSV file a second time.
   - Expected: Import rejected with `DUPLICATE_IMPORT` or processed with 0 duplicate rows created.
3. **Monthly Timecard Grid & Exceptions**:
   - Inspect attendance grid for October 2026.
   - Expected: Grid renders 31 days with color badges (Present, Late, Absent, Leave, Holiday).
4. **Fix Missing Punch with Mandatory Reason**:
   - Click on an employee missing punch cell. Enter punch time `17:02` and reason *"Card forgotten at security gate"*.
   - Expected: Cell updates to resolved. Audit log records user, timestamp, and mandatory reason.
5. **Overtime Review & Segregation**:
   - Log in as `dept.mgr@gulftech.ae`.
   - Navigate to `/approvals`.
   - Review pending overtime: approve 3.0h standard OT for Ahmed Al-Mansoori. Refuse unapproved request.
   - Expected: Approved OT reflects in payroll inputs; refused OT is marked rejected.
6. **Dual Confirmation for Payroll Cut-Off**:
   - Dept Manager clicks **Confirm Team Month**.
   - Log in as `hr.officer@gulftech.ae` -> clicks **Confirm HR Attendance**.
   - Expected: Attendance locked for the period. Unconfirmed teams are held from payroll (T34).

---

### Workflow 7.4: Leave Request & Approval Chain
1. **Employee Leave Application (Spec T31)**:
   - Log in as `employee@gulftech.ae` (Ahmed).
   - Navigate to `/me/leave` -> click **Apply Leave**.
   - Apply for Mon–Fri (5 calendar days) where Wednesday is a seeded Public Holiday.
   - Expected: System automatically deducts holiday and weekend; displays **Net Deductible: 4.0 Days**.
2. **Overlap & Balance Protection**:
   - Attempt to submit a second leave request covering the same dates.
   - Expected: Blocked with `OVERLAPPING_LEAVE_REQUEST`.
3. **Approval Chain (Dept Mgr -> HR -> GM)**:
   - Step 1: Log in as `dept.mgr@gulftech.ae` -> **Approve**.
   - Step 2: Log in as `hr.mgr@gulftech.ae` -> **Approve**.
   - Step 3 (if flagged/extended leave, Spec T15): Log in as `gm@gulftech.ae` -> **Approve**.
   - Expected: Status transitions to `Approved`. Leave balance decremented immediately.
4. **Leave Cancellation Restores Balance (Spec T32)**:
   - Employee requests cancellation of an approved future leave request.
   - HR Manager approves cancellation.
   - Expected: Balance restored to previous ledger total.

---

### Workflow 7.5: Monthly Payroll Lifecycle & Payslip Release
1. **Validation & Missing Bank Guard (Spec T28)**:
   - Log in as `payroll@gulftech.ae`.
   - Navigate to `/payroll` -> open November 2026 pay run containing EMP-DXB-045 (no bank).
   - Click **Validate Run**.
   - Expected: Blocked with error highlighting missing IBAN for EMP-DXB-045.
2. **Calculate October 2026 Pay Run**:
   - Open October 2026 pay run for Visa 01. Click **Calculate**.
   - Expected: Status becomes `Calculated`. 33 payslips generated.
3. **Variance Threshold Enforcement (Spec T29)**:
   - Open **Variances** tab.
   - Any employee with net variance > 5% displays a required justification field.
   - Save documented variance reasons.
4. **Segregation of Duties in Pay Run Lifecycle**:
   - `payroll@gulftech.ae` attempts to validate: button absent / 403 `SEGREGATION_OF_DUTIES`.
   - Log in as `hr.mgr@gulftech.ae` -> clicks **Validate Pay Run** -> status `Validated`.
   - `hr.mgr@gulftech.ae` attempts to lock: button absent / 403 `SEGREGATION_OF_DUTIES`.
   - Log in as `gm@gulftech.ae` -> clicks **Lock Pay Run** -> status `Locked`. Database trigger freezes lines.
   - `gm@gulftech.ae` attempts to mark paid: button absent / 403 `SEGREGATION_OF_DUTIES`.
   - Log in as `finance@gulftech.ae` -> clicks **Mark as Paid** -> status `Paid`.
5. **WPS SIF Export (Spec T30)**:
   - While logged in as `finance@gulftech.ae`, click **Export WPS SIF**.
   - Expected: SIF file downloads. Field 8 total matches sum of net payslips exactly.
6. **Employee Self-Service Payslip (Ahmed, Spec T19)**:
   - Log in as `employee@gulftech.ae`.
   - Navigate to `/me/payslips`.
   - Open October 2026 payslip:
     - Basic: 5,000.00 | Housing: 2,000.00 | Transport: 500.00 | Other: 500.00
     - Overtime: +78.13 | Absence Deduction: -533.33 | Loan: -500.00
     - **Net Salary**: **`AED 7,044.80`**
   - Click **Download PDF**: bilingual PDF with valid `%PDF-` header downloads.

---

### Workflow 7.6: Offboarding & End-of-Service Settlements
1. **Record Resignation**:
   - Log in as `hr.officer@gulftech.ae`.
   - Navigate to `/offboarding` -> click **Record Separation**.
   - Select Khalid Al-Marzouqi (`EMP-DXB-041`), resignation notice 2026-09-30, LWD 2026-10-31.
   - Expected: Separation recorded with status `Pending`.
2. **Approve Separation**:
   - `hr.officer@gulftech.ae` attempts to approve: blocked (403 `FORBIDDEN`).
   - Log in as `hr.mgr@gulftech.ae` -> clicks **Approve Separation** -> status `Approved`.
3. **Multi-Department Clearance Checklist**:
   - Log in as `dept.mgr@gulftech.ae` -> clears Operations asset checklist.
   - Log in as `finance@gulftech.ae` -> enters loan recovery deduction `1500.00` and marks Cleared.
   - Pending IT laptop item left open.
   - Attempt GM settlement approval: blocked with error `CLEARANCE_ITEMS_PENDING` (Spec T35).
   - Log in as `hr.mgr@gulftech.ae` -> clears IT laptop item and remaining clearance tasks.
4. **Calculate Final Settlement (Spec T21, T22, T23)**:
   - Log in as `payroll@gulftech.ae`.
   - Calculate settlement:
     - Sara Al-Nuaimi: Gratuity **`AED 12,082.19`** (3.5 years, T21)
     - Omar Al-Hashimi: Gratuity **`AED 32,547.95`**, Leave **`AED 2,367.12`**, Net **`AED 44,915.07`** (7.0 years, T22/T24)
     - Zaid Al-Harbi: Gratuity **`AED 0.00`** (11 months, T23)
5. **Settlement Approval & Disbursement**:
   - HR Manager validates -> GM approves (snapshot frozen) -> Finance marks Paid.
6. **Deactivation & Cancellation Tasks (Spec T36)**:
   - Scheduled deactivation job runs (stands in for 01:30 cron).
   - Expected: Separated employee status becomes `Archived`.
   - Attempt login as leaver: refused with generic credentials error (no "archived" leak).
   - Visa and Labour card cancellation tasks appear for HR Officer.
   - HR Officer marks both tasks Done with reference IDs.
7. **Salary Leak Verification on Offboarding Views**:
   - Log in as `hr.officer@gulftech.ae`.
   - Open `/offboarding?tab=clearance` and `/offboarding?tab=settlement`.
   - Expected: Zero monetary figures (`AED \d`) visible. Settlement tab shows privacy banner `#settlement-restricted-notice`.

---

### Workflow 7.7: Compliance Documents Tracking & Audit
1. **Expiry Monitoring (Spec T25)**:
   - Log in as `hr.mgr@gulftech.ae`.
   - Navigate to `/compliance`.
   - Document on EMP-DXB-019 (85 days remaining) shows badge `Expiring Soon`.
   - Expiry job runs (stands in for 01:00 cron): reminder notification dispatched to employee and HR.
   - Re-running job produces **0 duplicate reminders** (idempotency verified).
2. **Employee Self-Service Document Renewal**:
   - Log in as `employee@gulftech.ae`.
   - Navigate to `/me/documents` -> upload renewed Emirates ID.
   - Expected: Document status becomes `Pending Verification`.
   - Employee attempts self-verification: blocked with 403 `SELF_VERIFICATION_FORBIDDEN`.
3. **HR Manager Verification**:
   - Log in as `hr.mgr@gulftech.ae` -> open compliance verification drawer.
   - Inspect uploaded document and click **Verify**.
   - Expected: Status becomes `Valid`. Historical document version preserved in audit history.
4. **Milestone Tracking & Missing Data**:
   - Documents at 89, 59, 29 days track milestone alerts (Spec 7.7.3).
   - Document on EMP-DXB-024 with no expiry date displays `Missing Data` badge (Spec 7.7.2).
5. **At-Rest Document Encryption**:
   - Storage files on disk verified to begin with `NEXTAL_ENC_V1` AES-256-GCM magic header. Download returns original plaintext.

---

### Workflow VB: Visa & Branch Scoping
1. **Visa & Branch Hierarchy**:
   - Log in as `admin@gulftech.ae`.
   - Open `/settings/visas` and `/settings/branches`.
   - Verify `Visa 01 (MOHRE Dubai)` owns `Dubai Headquarters` and `Abu Dhabi Branch`.
   - Verify `Visa 02 (DIFC Freezone)` owns `DIFC FinTech Hub`.
2. **Employee Branch vs Visa Consistency**:
   - Ensure employee's assigned branch belongs to their sponsoring visa. Cross-visa assignment blocked.
3. **Scoped User Role Isolation**:
   - Log in as `hr.difc@gulftech.ae` (scoped to Visa 02).
   - Navigate to `/employees`.
   - Expected: Only DIFC Freezone Visa 02 employees are visible. Visa 01 employees are completely absent from UI and API queries return 404.
4. **Fail-Closed Branch Change Workflow**:
   - Attempt branch change across visas: blocked with `TARGET_BRANCH_VISA_MISMATCH`.
   - Submit valid branch change within same visa: Dept Mgr requests -> GM approves -> future effective date applied by 01:30 scheduled job.
