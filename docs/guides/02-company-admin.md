# Company Admin User Guide

> **Role Code**: `COMPANY_ADMIN`  
> **Target Audience**: Corporate Operations Directors, IT Managers, HR Directors  
> **Default Demo Login**: `admin@gulftech.ae` / `Nextal@2026!`

---

## 1. Overview & Responsibilities
The **Company Admin** is the primary tenant administrator for an enterprise. This role manages organizational structure, company-wide settings, user accounts and role assignments, corporate visas, cost centres, and working calendars.

### Key Capabilities:
- Configure company profile, legal trade license details, and corporate visas.
- Define departments, designations, and cost centres.
- Manage company users and assign roles (`HR_MANAGER`, `PAYROLL_OFFICER`, `FINANCE`, `GM`, `DEPT_MANAGER`).
- Configure working hours, shifts, attendance grace periods, and holiday calendars.
- Set salary rule formulas, pension scheme parameters, and offboarding policy settings.

---

## 2. Navigation & Interface
- **Dashboard (`/`)**: High-level enterprise summary (headcount, active pay runs, pending approvals, compliance alerts).
- **Organization (`/organization`)**: Departments, designations, shifts, and company visas.
- **Employees (`/employees`)**: Employee master directory and onboarding.
- **Settings (`/settings`)**: Company-wide rules, payroll parameters, and notification policies.
- **Users & Roles (`/users`)**: Internal user permissions and access control.
- **Audit Logs (`/audit`)**: Tenant-specific security and operational audit trail.

---

## 3. Step-by-Step Workflows

### 3.1 Setting Up Organizational Hierarchy
1. Navigate to **Organization** (`/organization`).
2. **Departments**: Click **Add Department**. Provide:
   - **Department Name**: Bilingual name (e.g. `Engineering` / `الهندسة`).
   - **Cost Centre Code**: Financial GL tracking code (e.g., `CC-ENG`, `CC-OPS`).
3. **Designations (Job Titles)**: Click **Add Designation**. Link to the corresponding department and specify standard grade/level.
4. **Company Visas**: Define sponsoring corporate entities (e.g. `Main Mainland Visa` vs `Tech Freezone Visa`) with their respective MOHRE Establishment IDs and Bank Routing Codes.

### 3.2 Defining Work Shifts & Attendance Rules
1. Navigate to **Organization > Shifts**.
2. Click **Add Shift**:
   - **Shift Name**: (e.g. `Standard Day Shift`).
   - **Start & End Time**: e.g., `09:00` to `18:00` (9 hours inclusive of 1 hour break).
   - **Grace Period**: Minutes allowed before marking tardy (default: `15 minutes`).
   - **Working Days**: Monday through Friday (standard UAE 4.5 or 5-day week).
3. Set holiday calendar and Ramadan hours reduction policies if applicable.

### 3.3 Configuring Company Policies
1. Navigate to **Settings** (`/settings`).
2. **Payroll Parameters**:
   - **Cut-off Day**: Default 25th of the month.
   - **Absence Divisor**: Select `DIV_30` (Gross / 30) or `DAYS_365` (Gross * 12 / 365).
   - **Overtime Rates**: Weekday OT (125%), Rest Day / Night OT (150%).
3. **Pension Scheme Configuration**:
   - GPSSA rates for UAE Nationals (11% Employee, 15% Employer).
   - ADPF parameters for Abu Dhabi visa holders.
4. **End of Service Gratuity Cap**: Set statutory ceiling basis (`Basic * 24` or `Gross * 24`).

### 3.4 Managing User Access & Roles
1. Navigate to **Users & Roles** (`/users`).
2. Click **Invite User**. Enter name, email address, and select appropriate role:
   - `HR_MANAGER`: Full HR lifecycle, contracts, attendance sign-off, leave.
   - `PAYROLL_OFFICER`: Pay run calculation, input entry, variance analysis.
   - `FINANCE`: WPS download, accounting export, pay run payment confirmation.
   - `GM`: Final pay run approval, high-value adjustment and extended leave approval.
   - `DEPT_MANAGER`: Team leave and attendance approval.
3. Users receive an activation link to set up their secure password.
