# Finance User Guide

> **Role Code**: `FINANCE`  
> **Target Audience**: Chief Financial Officers, Financial Controllers, Treasury & Payroll Accountants  
> **Default Demo Login**: `finance@gulftech.ae` / `Nextal@2026!`

---

## 1. Overview & Responsibilities
The **Finance** role is responsible for the financial disbursement of payroll, banking integration, statutory WPS file generation, accounting ledger export, and final settlement payments.

### Key Capabilities:
- Generate and download UAE Central Bank compliant Wages Protection System (WPS) `.SIF` files.
- Export double-entry General Ledger journal entries grouped by cost centre.
- Verify bank debit amounts and confirm salary disbursements (`Mark as Paid`).
- Disburse approved offboarding final settlements and archive separated employees.
- Audit corporate pension payables (GPSSA / ADPF) and loan repayment balances.

---

## 2. Navigation & Interface
- **Payroll (`/payroll`)**: View locked and approved pay runs, generate WPS SIF files, and confirm bank payout.
- **Offboarding (`/offboarding`)**: Access GM-approved final settlements, download settlement statements, and disburse gratuity/leave funds.
- **Reports (`/reports`)**:
  - **Accounting Export**: Download General Ledger journal CSV.
  - **Payroll Register**: Detailed spreadsheet of gross, net, allowances, and statutory costs.
- **Audit Logs (`/audit`)**: Financial transaction integrity records.

---

## 3. Step-by-Step Workflows

### 3.1 Generating & Submitting UAE WPS SIF Files
1. Navigate to **Payroll** (`/payroll`) and open a pay run in `Locked` status.
2. Click **Generate WPS SIF**.
3. The platform validates all records:
   - Employer MOL Code (13 digits).
   - Bank Routing Code (9 digits).
   - Employee Labour Card / Person ID (14 digits).
   - Mod-97 UAE IBAN validity.
   - Mathematical balancing: `SCR Total Salaries == Σ(Fixed + Variable) == Σ(Net Pay)`.
4. Click **Download .SIF File**.
5. Upload the file to your corporate banking portal (e.g., Emirates NBD smartBUSINESS, FAB Corporate, ADCB ProCash, Al Ansari Exchange).
6. Save the banking confirmation / reference number.

### 3.2 Marking Pay Run as Paid
1. Once the corporate bank confirms successful execution of the salary transfer:
2. Open the pay run in **Payroll** (`/payroll`).
3. Click **Mark as Paid**:
   - Enter Bank Payment Reference (e.g. `FT26305001928`).
   - Enter Value / Disbursement Date.
4. The pay run status transitions to `Paid`. Database state triggers ensure this status is terminal and permanent.

### 3.3 General Ledger Accounting Export
1. Navigate to **Reports > Accounting Export**.
2. Select the completed pay run period and click **Generate Journal CSV**.
3. **Journal Structure Verification**:
   - **Debits**:
     - Basic Salaries (`5001-01` per cost centre: `CC-OPS`, `CC-ENG`, `CC-SALES`, `CC-LOG`, `CC-HR`, `CC-FIN`).
     - Housing & Transport Allowances (`5001-02`, `5001-03`).
     - Overtime Expense (`5002-01`).
     - Employer Pension Contribution (`5005-01`).
   - **Credits**:
     - Net Salaries Payable (`2001-01`).
     - Employee & Employer GPSSA Pension Payable (`2002-01`, `2002-02`).
     - Employee Loan Clearing / Recovery (`1150-01`).
   - **Verification Rule**: Total Debit strictly equals Total Credit.

### 3.4 Disbursing Offboarding Settlements
1. Navigate to **Offboarding** (`/offboarding`).
2. Filter by status: `GM Approved`.
3. Open the employee settlement (e.g. Omar Al-Hashimi).
4. Review the breakdown: Gratuity (Article 51), Unused Leave Encashment, Final Month Salary, minus outstanding company deductions.
5. Execute the bank wire/cheque transfer.
6. Click **Mark Disbursed**:
   - Provide transaction reference and disbursement date.
7. System archives employee profile, records final audit log, and marks separation `Completed`.
