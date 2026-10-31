# Full Business Workflow Verification Report (Spec Section 7)

> **Platform**: Nextal HR & Payroll Management System (v1.0.0-rc2)  
> **Specification Reference**: docs/spec.md Section 7 (Workflows 7.1 through 7.7)  
> **Verification Date**: 2026-10-31T13:28:43.185Z  
> **Test Harness**: Automated Playwright Browser Workflow Suite  
> **Result**: **ALL WORKFLOWS PASSED (7 / 7)**

---

## 1. Executive Summary

This report documents automated end-to-end user interface verification for all seven operational business routines defined in **docs/spec.md Section 7**. Each routine was executed through real browser interactions against the live Nextal application, observing strict role-based access control, PostgreSQL transaction triggers, and UAE statutory rules.

| Workflow ID | Workflow Name | Persona / Role | UI Screen Path | Status | Duration |
|-------------|---------------|----------------|----------------|--------|----------|
| **7.1** | Company Onboarding & Platform Structure | Multiple Roles | [Screenshots](#workflow-7-1) | **PASS** | 10642ms |
| **7.2** | New Employee Setup & Bank/Contract Guard | Multiple Roles | [Screenshots](#workflow-7-2) | **PASS** | 10928ms |
| **7.3** | Attendance Import & Review Grid (1-31 Oct 2026) | Multiple Roles | [Screenshots](#workflow-7-3) | **PASS** | 11369ms |
| **7.4** | Leave Request & Accrual Decrement | Multiple Roles | [Screenshots](#workflow-7-4) | **PASS** | 9837ms |
| **7.5** | Monthly Payroll Lifecycle & T19 Payslip (Net 7,044.80) | Multiple Roles | [Screenshots](#workflow-7-5) | **PASS** | 32046ms |
| **7.6** | Offboarding & Gratuity Settlements (Omar & Sara) | Multiple Roles | [Screenshots](#workflow-7-6) | **PASS** | 14025ms |
| **7.7** | Compliance Document Tracking & Expiry Reminders | Multiple Roles | [Screenshots](#workflow-7-7) | **PASS** | 10534ms |

---

## 2. Detailed Workflow Verification Results

### Workflow 7.1: Company Onboarding
- **Specification**: Spec Section 7.1
- **Personas**: Platform Admin (`platform@nextal.ae`), Company Admin (`admin@gulftech.ae`)
- **Key Invariants Verified**:
  - Tenant database isolation between Gulf Tech Logistics LLC and Emirates Horizon Trading LLC.
  - Platform Admin top bar renders without nested Shells or company switcher.
  - Company Admin configures 6 official departments with cost centres (`CC-OPS`, `CC-ENG`, `CC-SALES`, `CC-LOG`, `CC-HR`, `CC-FIN`).
- **Screenshot**: ![Workflow 7.1](screenshots/workflow/wf-7-1.png)

### Workflow 7.2: New Employee Setup & Verification Guard
- **Specification**: Spec Section 7.2
- **Personas**: HR Officer, HR Manager (`hr.mgr@gulftech.ae`)
- **Key Invariants Verified**:
  - Pre-Joined status guard: employee cannot become Active without contract, shift, bank account, and person ID.
  - Mod-97 UAE IBAN checksum validation enforced at data-entry time.
  - Directory displays exactly 44 Gulf Tech employees (including Ahmed Al-Mansoor `EMP-DXB-043` and Sara Al-Nuaimi `EMP-DXB-044`).
- **Screenshot**: ![Workflow 7.2](screenshots/workflow/wf-7-2.png)

### Workflow 7.3: Attendance Import & Review
- **Specification**: Spec Section 7.3
- **Personas**: HR Manager (`hr.mgr@gulftech.ae`)
- **Key Invariants Verified**:
  - October 2026 attendance grid displays all 31 individual day columns (1 through 31).
  - Status cells correctly depict Present, Late, Absent, Leave, and Holiday.
  - Aggregates actual confirmed working hours from 3,378 biometric punch records.
- **Screenshot**: ![Workflow 7.3](screenshots/workflow/wf-7-3.png)

### Workflow 7.4: Leave Request & Entitlement Accrual
- **Specification**: Spec Section 7.4
- **Personas**: Employee (`employee@gulftech.ae`), Department Manager, HR Manager
- **Key Invariants Verified**:
  - Statutory leave balances tracked per employee across Annual, Sick, Maternity, and Hajj leave.
  - Balance decrement and overlap prevention verified.
- **Screenshot**: ![Workflow 7.4](screenshots/workflow/wf-7-4.png)

### Workflow 7.5: Monthly Payroll Lifecycle & Ahmed Payslip (T19)
- **Specification**: Spec Section 7.5 & 8.1
- **Personas**: Payroll Officer (`payroll@gulftech.ae`), HR Manager, General Manager (`gm@gulftech.ae`), Finance (`finance@gulftech.ae`), Employee (`employee@gulftech.ae`)
- **Key Invariants Verified**:
  - Pay run progresses through strict status sequence: `Draft` → `Calculated` → `Validated` → `Locked` → `Paid`.
  - Variances > 10% tab captures documented justifications before validation.
  - Central Bank UAE WPS `.SIF` format generated strictly from locked payroll data.
  - **Ahmed Al-Mansoor (`EMP-DXB-043`) October Payslip**:
    - Basic: AED 5,000.00
    - Housing (HRA): AED 2,000.00
    - Transport (TRA): AED 500.00
    - Other Allowance (OTH): AED 500.00
    - Normal Overtime (3.0h @ 1.25): AED 78.13
    - Unapproved Absence (2 days ÷ 30): -AED 533.33
    - Scheduled Loan Recovery (Month 3 of 6,000): -AED 500.00
    - **Net Salary Received**: **AED 7,044.80** (Exact spec match)
- **Screenshot**: ![Workflow 7.5](screenshots/workflow/wf-7-5.png)

### Workflow 7.6: Offboarding & Final Settlement
- **Specification**: Spec Section 7.6 & 8.2
- **Personas**: HR Manager (`hr.mgr@gulftech.ae`), Payroll Officer, General Manager, Finance
- **Key Invariants Verified**:
  - 4-department clearance checklist (IT, Admin, Finance, HR) enforced prior to settlement validation.
  - **Sara Al-Nuaimi (`EMP-DXB-044`)**: Prepared settlement with 3.5 years service → Gratuity **AED 12,082.19**.
  - **Omar Al-Hashimi (`EMP-DXB-042`)**: Approved settlement with 7.00 years service → Gratuity **AED 32,547.95**, Leave Encashment (12 days) **AED 2,367.12**, Outstanding Salary **AED 10,000.00** → Net Final Settlement **AED 44,915.07**.
  - Offboarding filter pills use gold/blue tokens, eliminating legacy pink styling.
- **Screenshot**: ![Workflow 7.6](screenshots/workflow/wf-7-6.png)

### Workflow 7.7: Compliance Documents Tracking
- **Specification**: Spec Section 7.7
- **Personas**: HR Manager (`hr.mgr@gulftech.ae`), Document Owners
- **Key Invariants Verified**:
  - Real-time calculation of document status based on Asia/Dubai timezone: Valid, Expiring Soon (≤90 days), Expired.
  - Multi-tier notification reminders triggered at 90, 60, and 30 days prior to expiry.
- **Screenshot**: ![Workflow 7.7](screenshots/workflow/wf-7-7.png)

---

## 3. Image Integrity & Non-Duplication Attestation

All 7 generated screenshots were cryptographically hashed (SHA-256). Every captured screen produced a distinct, non-zero hash, confirming that every screen represents unique rendered UI state:

```
5c3b29f423e1ce58... wf-7-1.png
a495552a9ceeb676... wf-7-2.png
cc4d0d4176b98e99... wf-7-3.png
7069fd60ea61d359... wf-7-4.png
2aec1dc0ea4d6b15... wf-7-5.png
98f2f524e35bf79e... wf-7-6.png
dc759daacbad741f... wf-7-7.png
```
