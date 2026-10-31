# HR Manager User Guide

> **Role Code**: `HR_MANAGER`  
> **Target Audience**: Human Resources Managers, People Operations Specialists  
> **Default Demo Login**: `hr@gulftech.ae` / `Nextal@2026!`

---

## 1. Overview & Responsibilities
The **HR Manager** oversees the full employee lifecycle, compliance adherence, leave administration, attendance verification, and separation clearance.

### Key Capabilities:
- Onboard new hires, manage employee contracts, salaries, and visa allocations.
- Monitor document expiry (visas, passports, Emirates IDs, labour cards) and ensure regulatory compliance.
- Review and sign off company-wide monthly attendance before payroll processing.
- Manage leave requests, track accruals, and validate special leave types (maternity, sick, hajj).
- Validate payroll runs calculated by the Payroll Officer before submission to GM.
- Initiate employee separations, manage clearance checklists, and validate Article 51 final settlements.

---

## 2. Navigation & Interface
- **Dashboard (`/`)**: Real-time HR overview (headcount, upcoming document expirations, attendance sign-off status, leave requests).
- **Employees (`/employees`)**: Employee directory, profile updates, and contract setup.
- **Attendance (`/attendance`)**: Monthly timecards, punch records, OT approvals, and HR sign-off.
- **Leave (`/leave`)**: Leave approval inbox, calendar, and employee balance ledgers.
- **Payroll (`/payroll`)**: Review calculated pay runs, inspect variance reasons, and click **Validate**.
- **Offboarding (`/offboarding`)**: Resignation/termination tracking, clearance workflows, and settlement preparation.
- **Compliance (`/compliance`)**: Expiry tracker, renewal status, and statutory reports.

---

## 3. Step-by-Step Workflows

### 3.1 Onboarding a New Employee
1. Navigate to **Employees** (`/employees`) and click **Add Employee**.
2. **Personal Information**: Full English & Arabic legal names, DOB, Gender, Nationality (ISO format e.g. `ARE`, `GBR`, `IND`), Marital Status.
3. **Employment Details**:
   - Employee ID/Code (e.g., `EMP-DXB-043`).
   - Joining Date.
   - Sponsoring Company Visa (Mainland vs Freezone).
   - Department and Designation.
   - Reporting Line Manager.
4. **Contract & Salary Setup**:
   - Contract Type: Limited (Fixed-term) or Unlimited.
   - Salary Breakdown: Basic Salary, Housing Allowance (HRA), Transport Allowance (TRA), Other Allowances (OTH).
   - Bank Details: Employee IBAN (must be valid 23-char UAE IBAN) and 9-digit Bank Routing Code.
5. **Document Upload**: Upload copies of Passport, Visa, Emirates ID, and Labour Card with their respective issue and expiry dates.

### 3.2 Monthly Attendance Verification & Sign-off
1. Navigate to **Attendance** (`/attendance`).
2. Select the current payroll period (e.g. `October 2026`).
3. Check the **Attendance Dashboard**:
   - Verify that Department Managers have completed team reviews.
   - Inspect exceptions: unapproved absences, tardiness penalties, and overtime hours.
   - Ensure approved overtime matches operational needs (standard 125% vs rest-day 150%).
4. Click **HR Sign-Off**. This locks the attendance data and makes it available to the Payroll Engine.

### 3.3 Validating a Payroll Run
1. Navigate to **Payroll** (`/payroll`).
2. Open the pay run in `Calculated` status.
3. Review the **Variance Summary**:
   - Verify that any variance > 5% has an HR-documented explanation.
   - Check total earnings, gross salary, deductions, and net payouts.
4. Click **Validate Pay Run**. Status transitions to `Validated` and notifies the General Manager for final sign-off.

### 3.4 Managing Offboarding & Final Settlement
1. Navigate to **Offboarding** (`/offboarding`).
2. Click **Initiate Separation**:
   - Select Employee.
   - Specify Separation Type: `Resignation` or `Termination`.
   - Specify Notice Period and Last Working Day.
3. **Track Clearance Checklist**:
   - Assets/IT: Laptop, access cards, credentials handed over.
   - Finance: Company credit cards returned, travel advances cleared.
   - Operations: Handover of projects and files complete.
   - HR: Medical insurance cancelled, original documents returned.
4. **Prepare Settlement**:
   - System calculates Article 51 End-of-Service Gratuity, unused leave encashment, pending salary, and loan deductions.
   - Click **Validate Settlement** to pass to GM for approval.
