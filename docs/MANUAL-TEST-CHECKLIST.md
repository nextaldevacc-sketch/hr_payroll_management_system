# Nextal HR & Payroll Platform - Manual Testing Checklist

> **Version**: v1.0.0-rc2  
> **Target Audience**: QA Engineers, Auditors, Client Stakeholders  
> **Specification Reference**: `docs/spec.md` (Sections 1, 7.1–7.7, 8.1–8.4, 15)  
> **Environment**: `http://localhost:3100` (Frontend) & `http://localhost:5000` (API)

---

## 1. Persona Accounts & Access Credentials

All demo user accounts share the common password: **`Nextal@2026!`**

| Persona | Email | Primary Responsibilities | Statutory Scope |
|---------|-------|--------------------------|-----------------|
| **Platform Administrator** | `platform@nextal.ae` | Multi-tenant company onboarding, tenant licensing | Platform wide (No company employee view) |
| **Company Administrator** | `admin@gulftech.ae` | Organizational setup, department/shift/policy configuration | Company 1 (`Gulf Tech Logistics LLC`) |
| **General Manager (GM)** | `gm@gulftech.ae` | Pay run locking/approval, final settlement sign-off | Company 1 (Full salary & audit visibility) |
| **HR Manager** | `hr.mgr@gulftech.ae` | Attendance sign-off, leave approval, pay run validation | Company 1 (Full HR & employee data) |
| **HR Officer** | `hr.officer@gulftech.ae` | Employee creation, document verification, biometric import | Company 1 (No salary visibility) |
| **Payroll Officer** | `payroll@gulftech.ae` | Pay run calculation, variance justification, settlement prep | Company 1 (Full salary & payslip access) |
| **Finance Officer** | `finance@gulftech.ae` | WPS SIF export, payment execution (Mark Paid), GL export | Company 1 (Payment & disbursement only) |
| **Department Manager** | `dept.mgr@gulftech.ae` | Team attendance & leave review (Operations department) | Scoped to Operations team (Salary hidden) |
| **Employee Self-Service** | `employee@gulftech.ae` | View payslips, request leave, punch missing punch | Linked to Ahmed Al-Mansoor (`EMP-DXB-043`) |

---

## 2. Key Spec Benchmark Figures (Ready to Verify)

These exact figures are seeded into Gulf Tech Logistics LLC and must be verified during manual testing:

### A. Ahmed Al-Mansoor (`EMP-DXB-043`) - October Payslip (Spec T19)
- **Position**: Operations Lead | **Residency**: Expat (EGY) | **Visa**: Visa 1 (Main Mainland Visa)
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
- **Position**: Senior Operations Associate | **Joining Date**: 2023-05-01 | **LWD**: 2026-10-31
- **Tenure**: Exactly 3 Years, 6 Months (3.50 years)
- **Basic Salary**: AED 5,000.00
- **Gratuity Formula**: `3.50 * 21 * (5000 * 12 / 365)` = `73.5 * 164.38356`
- **Expected Gratuity**: **`AED 12,082.19`**
- **Settlement Status**: `Prepared` | **Employee Status**: `Separated`

### C. Omar Al-Hashimi (`EMP-DXB-042`) - Approved Settlement (Spec T22 & T24)
- **Position**: Fleet Operations Manager | **Joining Date**: 2019-10-01 | **LWD**: 2026-10-31
- **Tenure**: Exactly 7.00 Years (5 yrs @ 21 days + 2 yrs @ 30 days = 165 days)
- **Basic Salary**: AED 6,000.00 | **Gross Salary**: AED 10,000.00
- **Daily Wage**: `6000 * 12 / 365` = `AED 197.26027`
- **Expected Gratuity**: **`AED 32,547.95`** `(165 * 197.26027)`
- **Unused Leave Encashment (12 days)**: **`AED 2,367.12`** `(12 * 197.26027)`
- **October Salary Due (Full Month)**: **`AED 10,000.00`**
- **Net Final Settlement**: **`AED 44,915.07`**
- **Settlement Status**: `Approved` | **Employee Status**: `Separated`

### D. Company Employee Headcount
- **Gulf Tech Logistics LLC**: Exactly **44** employees (42 active in October pay runs + 2 separated: Omar & Sara).
- **Emirates Horizon Trading LLC**: Exactly **10** employees.

---

## 3. Step-by-Step Verification Procedures (Workflows 7.1 – 7.7)

### Workflow 7.1: Company Onboarding & Multi-Tenant Setup
1. **Platform Admin Tenant Isolation**:
   - Open browser at `http://localhost:3100/login`
   - Log in as `platform@nextal.ae` / `Nextal@2026!`
   - Verify you land on `/platform/companies`
   - Verify the top bar has **no company switcher** and the sidebar has **no self-service links**
   - Check both client companies are listed:
     - `Gulf Tech Logistics LLC` (MOHRE ID: `734921`)
     - `Emirates Horizon Trading LLC` (MOHRE ID: `849204`)
   - Click **Log Out**
2. **Company Admin Organizational Setup**:
   - Log in as `admin@gulftech.ae` / `Nextal@2026!`
   - Navigate to **Settings** (`/settings`)
   - Verify Company Profile: Legal Name, Trade License, Cut-Off Day (25th), Absence Divisor (`÷30`)
   - Click **Organization** tab:
     - Verify 6 departments: `Operations` (CC-OPS), `Engineering` (CC-ENG), `Sales & Support` (CC-SALES), `Logistics & Fleet` (CC-LOG), `HR & Admin` (CC-HR), `Finance` (CC-FIN)
     - Verify 2 company visas: `Main Mainland Visa` (MOHRE 734921) & `Tech Freezone Visa` (DIFC)

---

### Workflow 7.2: New Employee Setup & Bank Guard
1. **Directory & Pre-Joined Verification**:
   - Log in as `hr.mgr@gulftech.ae` / `Nextal@2026!`
   - Navigate to **Employees** (`/employees`)
   - Verify total count is **44 employees**
   - Verify Ahmed Al-Mansoor (`EMP-DXB-043`), Omar Al-Hashimi (`EMP-DXB-042`), and Sara Al-Nuaimi (`EMP-DXB-044`) are listed
2. **Mod-97 UAE IBAN Validation Test**:
   - Click on any active employee and open the **Bank Account** tab
   - Verify the displayed IBAN starts with `AE` and has 23 alphanumeric characters
   - Note: The system strictly validates `mod-97 == 1` per ISO 13616 before any bank record can be saved.

---

### Workflow 7.3: Attendance Import & Monthly Grid
1. **October 2026 Grid Verification**:
   - Log in as `hr.mgr@gulftech.ae` / `Nextal@2026!`
   - Navigate to **Attendance** (`/attendance`)
   - Ensure period selector is set to **October 2026**
   - Verify the table renders all **31 individual day columns (1 through 31)**
   - Check that cells show appropriate status badges (Green = Present, Amber = Late, Red = Absent, Blue = Leave, Purple = Holiday)
   - Scroll to Ahmed Al-Mansoor (`EMP-DXB-043`):
     - Verify Day 6 has **3.0h Overtime**
     - Verify Days 21 & 22 are flagged as **Unapproved Absence**
   - Check the total hours column reflects actual biometric punch durations.

---

### Workflow 7.4: Leave Request & Entitlement Accrual
1. **Employee Leave Balance Check**:
   - Log in as `employee@gulftech.ae` / `Nextal@2026!`
   - Navigate to **My Leave** (`/me/leave`)
   - Verify statutory balances: Annual Leave, Sick Leave, Maternity/Paternity
2. **Department Manager Team Scope**:
   - Log in as `dept.mgr@gulftech.ae` / `Nextal@2026!`
   - Navigate to **Leave** (`/leave`)
   - Verify that only Operations department staff are visible; team salaries are completely hidden.

---

### Workflow 7.5: Monthly Payroll Lifecycle & Payslip Release
1. **Payroll Officer Calculation & Variances**:
   - Log in as `payroll@gulftech.ae` / `Nextal@2026!`
   - Navigate to **Pay Runs** (`/payroll`)
   - Click on the **October 2026 Regular** pay run for **Main Mainland Visa**
   - Click on the **Variances > 10%** tab
   - Verify variance justifications are populated (Shift & overtime adjustments)
2. **HR Manager Validation**:
   - Log in as `hr.mgr@gulftech.ae` / `Nextal@2026!`
   - Navigate to the pay run detail and click **Validate Run**
   - Status changes from `Calculated` → `Validated`
3. **GM Approval & Locking**:
   - Log in as `gm@gulftech.ae` / `Nextal@2026!`
   - Navigate to the pay run detail and click **Lock Pay Run**
   - Status changes to `Locked`. PostgreSQL triggers ensure payslip lines are immutable.
4. **Finance Disbursement & SIF Export**:
   - Log in as `finance@gulftech.ae` / `Nextal@2026!`
   - Navigate to pay run detail and click **Export WPS SIF**
   - Verify downloaded file has valid 16-field EDR rows with correct 14-digit Labour IDs and 9-digit routing codes
   - Click **Mark as Paid**. Status changes to `Paid`.
5. **Employee Self-Service Verification (Ahmed Al-Mansoor)**:
   - Log in as `employee@gulftech.ae` / `Nextal@2026!`
   - Navigate to **My Payslips** (`/me/payslips`)
   - Verify October 2026 payslip shows **Net Pay: AED 7,044.80**
   - Click **Breakdown** button:
     - Basic: `5,000.00`
     - Housing (HRA): `2,000.00`
     - Transport (TRA): `500.00`
     - Other (OTH): `500.00`
     - Overtime: `78.13`
     - Absence Deduction: `-533.33`
     - Loan Recovery: `-500.00`
     - Total Net: `7,044.80`

---

### Workflow 7.6: Offboarding & End-of-Service Settlements
1. **Offboarding Separations Review**:
   - Log in as `hr.mgr@gulftech.ae` / `Nextal@2026!`
   - Navigate to **Offboarding** (`/offboarding`)
   - Verify filter pill uses **Gold/Blue** design tokens (no pink/rose)
   - Verify two records appear:
     1. **Sara Al-Nuaimi** (`EMP-DXB-044`): Clearance partially done (2/4 cleared), Settlement **Prepared**
     2. **Omar Al-Hashimi** (`EMP-DXB-042`): Clearance 4/4 cleared, Settlement **Approved**
2. **Omar Settlement Breakdown Verification**:
   - Click on **Omar Al-Hashimi** and select **Settlement** tab
   - Verify Gratuity: **AED 32,547.95** (Article 51: 7.00 years)
   - Verify Leave Encashment: **AED 2,367.12** (12 days)
   - Verify Outstanding Salary: **AED 10,000.00**
   - Verify Net Payable: **AED 44,915.07**
3. **Sara Settlement Preparation Verification**:
   - Click on **Sara Al-Nuaimi** and select **Settlement** tab
   - Verify Gratuity: **AED 12,082.19** (3.50 years)
   - Status shows `Prepared` pending clearance completion.

---

### Workflow 7.7: Compliance Documents Tracking
1. **Compliance Dashboard & Expiry Calculation**:
   - Log in as `hr.mgr@gulftech.ae` / `Nextal@2026!`
   - Navigate to **Compliance** (`/compliance`)
   - Verify 132 tracked statutory documents (Passport, Visa, Emirates ID, Labour Card)
   - Check real-time expiry calculation:
     - `Valid`: > 90 days remaining
     - `Expiring Soon`: ≤ 90 days remaining
     - `Expired`: Expiry date < current date (Asia/Dubai)
2. **Audit Log Inspection**:
   - Log in as `admin@gulftech.ae` / `Nextal@2026!`
   - Navigate to **Audit** (`/audit`)
   - Verify immutable history records for user logins, pay run updates, and settlement approvals with `old_values` and `new_values`.

---

## 4. Pass / Fail Acceptance Checklist

| Item | Assertion Requirement | Verified By | Result |
|------|------------------------|-------------|--------|
| 1 | Ahmed Al-Mansoor October Net Pay == AED 7,044.80 | Automated / Manual | [ ] PASS |
| 2 | Ahmed loan recovery == AED 500.00 with balance AED 4,500.00 | Automated / Manual | [ ] PASS |
| 3 | Sara Al-Nuaimi Gratuity == AED 12,082.19 (3.5 years service) | Automated / Manual | [ ] PASS |
| 4 | Omar Al-Hashimi Gratuity == AED 32,547.95 (7.0 years service) | Automated / Manual | [ ] PASS |
| 5 | Omar Leave Encashment == AED 2,367.12 (12 unused days) | Automated / Manual | [ ] PASS |
| 6 | Omar Net Final Settlement == AED 44,915.07 | Automated / Manual | [ ] PASS |
| 7 | Total Gulf Tech Employees == exactly 44 (42 active + 2 separated) | Automated / Manual | [ ] PASS |
| 8 | Attendance grid renders all 31 days with confirmed hours | Automated / Manual | [ ] PASS |
| 9 | Pay run lifecycle follows Draft → Calculated → Validated → Locked → Paid | Automated / Manual | [ ] PASS |
| 10 | 100% of UAE IBANs pass ISO 13616 Mod-97 checksum validation | Automated / Manual | [ ] PASS |

