# Payroll Officer User Guide

> **Role Code**: `PAYROLL_OFFICER`  
> **Target Audience**: Payroll Specialists, Compensation & Benefits Officers  
> **Default Demo Login**: `payroll@gulftech.ae` / `Nextal@2026!`

---

## 1. Overview & Responsibilities
The **Payroll Officer** is responsible for executing the monthly payroll cycle, calculating pay runs, adjusting variable inputs (bonuses, deductions, loan repayments), analyzing variances against previous runs, and generating payslips.

### Key Capabilities:
- Create monthly pay run batches per company visa.
- Ingest approved attendance data (worked days, overtime, unpaid absences).
- Enter variable adjustments (ad-hoc allowances, discretionary bonuses, deductions).
- Execute the UAE-compliant payroll calculation engine.
- Analyze variance against prior periods and supply mandatory explanations for variances > 5%.
- Lock approved runs and generate bilingual PDF payslips.

---

## 2. Navigation & Interface
- **Payroll (`/payroll`)**: Pay run list, lifecycle status badges (`Draft`, `Calculated`, `Validated`, `Approved`, `Locked`, `Paid`), and run creation.
- **Pay Run Detail (`/payroll/[id]`)**: Employee payslip list, summary cards (Total Gross, Net Pay, Employer Cost), and variance analysis.
- **Attendance (`/attendance`)**: View confirmed attendance inputs before calculating payroll.
- **Reports (`/reports`)**: Payroll Register, WPS preview, and variance summaries.

---

## 3. Step-by-Step Workflows

### 3.1 The Monthly Payroll Execution Cycle

```
[Create Draft Run] ──> [Import Approved Attendance] ──> [Calculate Run]
                                                              │
[Submit to HR] <── [Document Variance Explanations] <── [Variance Check]
```

#### Step 1: Create a Pay Run
1. Navigate to **Payroll** (`/payroll`) and click **New Pay Run**.
2. Select:
   - **Company Visa**: Choose entity (e.g., `Gulf Technologies LLC - Main Mainland Visa`).
   - **Period**: Year and Month (e.g. `2026-10`).
   - **Cut-off Range**: e.g., `2026-09-26` to `2026-10-25` (or calendar month).
3. Click **Create Pay Run**. The status is initialized to `Draft`.

#### Step 2: Calculate the Pay Run
1. Click **Calculate Pay Run**.
2. The engine executes the full calculation pipeline:
   - Base earnings: Basic salary, HRA, Transport, Other allowances.
   - Attendance inputs: Paid days vs worked days, unapproved absences (`DIV_30` or `DAYS_365`), approved overtime (125% and 150%).
   - Active loan repayments and salary advances.
   - Statutory pension contributions for UAE Nationals (GPSSA 11% employee / 15% employer).
3. Status moves to `Calculated`.

#### Step 3: Variance Analysis & Documentation
1. Review the **Variance Analysis** tab.
2. The system compares current pay with the previous finalized run (e.g. September vs October).
3. **Mandatory Action**: Any employee with net pay variance exceeding **5%** is highlighted with an amber alert.
4. Click **Add Variance Reason** on flagged rows:
   - Select category: `New Joiner`, `Overtime Increase`, `Unpaid Leave`, `Loan Deduction`, `Salary Increment`.
   - Provide supporting notes.
5. Once all variances are documented, click **Submit to HR for Validation**.

#### Step 4: Finalize & Generate Payslips
1. After the General Manager approves the run (`Approved` status), click **Lock Pay Run**.
2. The database trigger locks all payslips and payslip lines against future mutation.
3. Click **Generate PDF Payslips**:
   - Generates individual bilingual (English / Arabic) PDFs.
   - Distributes notification emails with portal download links to employee self-service.

---

## 4. Troubleshooting & FAQ
- **Why is an employee missing from the pay run?**  
  Verify the employee's `joining_date` is on or before the period end date, their status is `Active` (not `Draft` or `Separated`), and their contract is assigned to the selected `company_visa_id`.
- **Can I recalculate a pay run after making an adjustment?**  
  Yes, as long as the run is in `Draft` or `Calculated` status. Click **Recalculate**. Once a run is `Validated`, `Approved`, or `Locked`, database guards prevent arbitrary recalculation without HR rejection.
