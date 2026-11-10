# Nextal HR & Payroll — Scripted UI QA Sweep & Audit Report

> **Platform**: Nextal HR & Payroll Management System (UAE Labor & MOHRE Compliant)  
> **Sweep Timestamp**: 2026-11-10T08:54:50.381Z  
> **Engine**: Playwright Chromium (Automated Scripted Sweep)  
> **Total Visual Cells Tested**: 132 cells (33 pages × 4 viewport/theme variants)  
> **Passed**: **132 / 132** (100%) · **Failed**: **0**  

---

## 1. Automated Verification Matrix

| Page / Route | Role | light-en-1440 | dark-en-1440 | light-ar-1440 (RTL) | dark-ar-390 (Mobile RTL) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Dashboard**<br>`/` | `hr_manager` | [PASS](screenshots/qa/dashboard__light-en-1440.png) | [PASS](screenshots/qa/dashboard__dark-en-1440.png) | [PASS](screenshots/qa/dashboard__light-ar-1440.png) | [PASS](screenshots/qa/dashboard__dark-ar-390.png) |
| **Employee Directory**<br>`/employees` | `hr_manager` | [PASS](screenshots/qa/employees__light-en-1440.png) | [PASS](screenshots/qa/employees__dark-en-1440.png) | [PASS](screenshots/qa/employees__light-ar-1440.png) | [PASS](screenshots/qa/employees__dark-ar-390.png) |
| **New Employee Wizard**<br>`/employees/new` | `hr_manager` | [PASS](screenshots/qa/employee-new__light-en-1440.png) | [PASS](screenshots/qa/employee-new__dark-en-1440.png) | [PASS](screenshots/qa/employee-new__light-ar-1440.png) | [PASS](screenshots/qa/employee-new__dark-ar-390.png) |
| **Employee Profile**<br>`/employees/d39330af-ae2d-48c4-9be8-7b770746b00c` | `hr_manager` | [PASS](screenshots/qa/employee-detail__light-en-1440.png) | [PASS](screenshots/qa/employee-detail__dark-en-1440.png) | [PASS](screenshots/qa/employee-detail__light-ar-1440.png) | [PASS](screenshots/qa/employee-detail__dark-ar-390.png) |
| **Approvals Inbox**<br>`/approvals` | `hr_manager` | [PASS](screenshots/qa/approvals__light-en-1440.png) | [PASS](screenshots/qa/approvals__dark-en-1440.png) | [PASS](screenshots/qa/approvals__light-ar-1440.png) | [PASS](screenshots/qa/approvals__dark-ar-390.png) |
| **Attendance Register**<br>`/attendance` | `hr_manager` | [PASS](screenshots/qa/attendance__light-en-1440.png) | [PASS](screenshots/qa/attendance__dark-en-1440.png) | [PASS](screenshots/qa/attendance__light-ar-1440.png) | [PASS](screenshots/qa/attendance__dark-ar-390.png) |
| **Leave & Holidays**<br>`/leave` | `hr_manager` | [PASS](screenshots/qa/leave__light-en-1440.png) | [PASS](screenshots/qa/leave__dark-en-1440.png) | [PASS](screenshots/qa/leave__light-ar-1440.png) | [PASS](screenshots/qa/leave__dark-ar-390.png) |
| **Pay Runs & WPS**<br>`/payroll` | `hr_manager` | [PASS](screenshots/qa/payroll__light-en-1440.png) | [PASS](screenshots/qa/payroll__dark-en-1440.png) | [PASS](screenshots/qa/payroll__light-ar-1440.png) | [PASS](screenshots/qa/payroll__dark-ar-390.png) |
| **Salary Adjustments**<br>`/payroll/adjustments` | `hr_manager` | [PASS](screenshots/qa/payroll-adjustments__light-en-1440.png) | [PASS](screenshots/qa/payroll-adjustments__dark-en-1440.png) | [PASS](screenshots/qa/payroll-adjustments__light-ar-1440.png) | [PASS](screenshots/qa/payroll-adjustments__dark-ar-390.png) |
| **Pay Run Details**<br>`/payroll/bc5c8da4-824c-47c8-a272-0d9bfa0e2af5` | `hr_manager` | [PASS](screenshots/qa/payroll-detail__light-en-1440.png) | [PASS](screenshots/qa/payroll-detail__dark-en-1440.png) | [PASS](screenshots/qa/payroll-detail__light-ar-1440.png) | [PASS](screenshots/qa/payroll-detail__dark-ar-390.png) |
| **Offboarding & Settlements**<br>`/offboarding` | `hr_manager` | [PASS](screenshots/qa/offboarding__light-en-1440.png) | [PASS](screenshots/qa/offboarding__dark-en-1440.png) | [PASS](screenshots/qa/offboarding__light-ar-1440.png) | [PASS](screenshots/qa/offboarding__dark-ar-390.png) |
| **Compliance & Documents**<br>`/compliance` | `hr_manager` | [PASS](screenshots/qa/compliance__light-en-1440.png) | [PASS](screenshots/qa/compliance__dark-en-1440.png) | [PASS](screenshots/qa/compliance__light-ar-1440.png) | [PASS](screenshots/qa/compliance__dark-ar-390.png) |
| **Reports & Exports**<br>`/reports` | `hr_manager` | [PASS](screenshots/qa/reports__light-en-1440.png) | [PASS](screenshots/qa/reports__dark-en-1440.png) | [PASS](screenshots/qa/reports__light-ar-1440.png) | [PASS](screenshots/qa/reports__dark-ar-390.png) |
| **Company Settings**<br>`/settings` | `admin` | [PASS](screenshots/qa/settings__light-en-1440.png) | [PASS](screenshots/qa/settings__dark-en-1440.png) | [PASS](screenshots/qa/settings__light-ar-1440.png) | [PASS](screenshots/qa/settings__dark-ar-390.png) |
| **Users & Roles**<br>`/settings/users` | `admin` | [PASS](screenshots/qa/settings-users__light-en-1440.png) | [PASS](screenshots/qa/settings-users__dark-en-1440.png) | [PASS](screenshots/qa/settings-users__light-ar-1440.png) | [PASS](screenshots/qa/settings-users__dark-ar-390.png) |
| **Company Visas**<br>`/settings/visas` | `admin` | [PASS](screenshots/qa/settings-visas__light-en-1440.png) | [PASS](screenshots/qa/settings-visas__dark-en-1440.png) | [PASS](screenshots/qa/settings-visas__light-ar-1440.png) | [PASS](screenshots/qa/settings-visas__dark-ar-390.png) |
| **Branches**<br>`/settings/branches` | `admin` | [PASS](screenshots/qa/settings-branches__light-en-1440.png) | [PASS](screenshots/qa/settings-branches__dark-en-1440.png) | [PASS](screenshots/qa/settings-branches__light-ar-1440.png) | [PASS](screenshots/qa/settings-branches__dark-ar-390.png) |
| **Audit Trail**<br>`/audit` | `admin` | [PASS](screenshots/qa/audit__light-en-1440.png) | [PASS](screenshots/qa/audit__dark-en-1440.png) | [PASS](screenshots/qa/audit__light-ar-1440.png) | [PASS](screenshots/qa/audit__dark-ar-390.png) |
| **Employee Self-Service**<br>`/me` | `employee` | [PASS](screenshots/qa/me__light-en-1440.png) | [PASS](screenshots/qa/me__dark-en-1440.png) | [PASS](screenshots/qa/me__light-ar-1440.png) | [PASS](screenshots/qa/me__dark-ar-390.png) |
| **Employee Payslips**<br>`/me/payslips` | `employee` | [PASS](screenshots/qa/me-payslips__light-en-1440.png) | [PASS](screenshots/qa/me-payslips__dark-en-1440.png) | [PASS](screenshots/qa/me-payslips__light-ar-1440.png) | [PASS](screenshots/qa/me-payslips__dark-ar-390.png) |
| **Leave Application Modal**<br>`/me/leave?action=apply` | `employee` | [PASS](screenshots/qa/leave-apply__light-en-1440.png) | [PASS](screenshots/qa/leave-apply__dark-en-1440.png) | [PASS](screenshots/qa/leave-apply__light-ar-1440.png) | [PASS](screenshots/qa/leave-apply__dark-ar-390.png) |
| **Leave Approval Drawer**<br>`/leave?drawer=approval` | `hr_manager` | [PASS](screenshots/qa/leave-drawer__light-en-1440.png) | [PASS](screenshots/qa/leave-drawer__dark-en-1440.png) | [PASS](screenshots/qa/leave-drawer__light-ar-1440.png) | [PASS](screenshots/qa/leave-drawer__dark-ar-390.png) |
| **Pay Run Validation Tab**<br>`/payroll/bc5c8da4-824c-47c8-a272-0d9bfa0e2af5?tab=validation` | `hr_manager` | [PASS](screenshots/qa/payroll-validation__light-en-1440.png) | [PASS](screenshots/qa/payroll-validation__dark-en-1440.png) | [PASS](screenshots/qa/payroll-validation__light-ar-1440.png) | [PASS](screenshots/qa/payroll-validation__dark-ar-390.png) |
| **Pay Run Variances Tab**<br>`/payroll/bc5c8da4-824c-47c8-a272-0d9bfa0e2af5?tab=variances` | `hr_manager` | [PASS](screenshots/qa/payroll-variances__light-en-1440.png) | [PASS](screenshots/qa/payroll-variances__dark-en-1440.png) | [PASS](screenshots/qa/payroll-variances__light-ar-1440.png) | [PASS](screenshots/qa/payroll-variances__dark-ar-390.png) |
| **Pay Run Payslips Tab**<br>`/payroll/bc5c8da4-824c-47c8-a272-0d9bfa0e2af5?tab=payslips` | `hr_manager` | [PASS](screenshots/qa/payroll-payslips__light-en-1440.png) | [PASS](screenshots/qa/payroll-payslips__dark-en-1440.png) | [PASS](screenshots/qa/payroll-payslips__light-ar-1440.png) | [PASS](screenshots/qa/payroll-payslips__dark-ar-390.png) |
| **Pay Run SIF Tab**<br>`/payroll/bc5c8da4-824c-47c8-a272-0d9bfa0e2af5?tab=sif` | `hr_manager` | [PASS](screenshots/qa/payroll-sif__light-en-1440.png) | [PASS](screenshots/qa/payroll-sif__dark-en-1440.png) | [PASS](screenshots/qa/payroll-sif__light-ar-1440.png) | [PASS](screenshots/qa/payroll-sif__dark-ar-390.png) |
| **My Payslip Detail**<br>`/me/payslips/fc649832-0dbb-47ef-9aaf-6228f487e58a` | `employee` | [PASS](screenshots/qa/me-payslip-detail__light-en-1440.png) | [PASS](screenshots/qa/me-payslip-detail__dark-en-1440.png) | [PASS](screenshots/qa/me-payslip-detail__light-ar-1440.png) | [PASS](screenshots/qa/me-payslip-detail__dark-ar-390.png) |
| **Offboarding Detail**<br>`/offboarding?tab=clearance` | `hr_manager` | [PASS](screenshots/qa/offboarding-detail__light-en-1440.png) | [PASS](screenshots/qa/offboarding-detail__dark-en-1440.png) | [PASS](screenshots/qa/offboarding-detail__light-ar-1440.png) | [PASS](screenshots/qa/offboarding-detail__dark-ar-390.png) |
| **Clearance Checklist**<br>`/offboarding?tab=clearance` | `hr_manager` | [PASS](screenshots/qa/clearance-checklist__light-en-1440.png) | [PASS](screenshots/qa/clearance-checklist__dark-en-1440.png) | [PASS](screenshots/qa/clearance-checklist__light-ar-1440.png) | [PASS](screenshots/qa/clearance-checklist__dark-ar-390.png) |
| **Settlement View**<br>`/offboarding?tab=settlement` | `hr_manager` | [PASS](screenshots/qa/settlement-view__light-en-1440.png) | [PASS](screenshots/qa/settlement-view__dark-en-1440.png) | [PASS](screenshots/qa/settlement-view__light-ar-1440.png) | [PASS](screenshots/qa/settlement-view__dark-ar-390.png) |
| **Cancellation Tasks**<br>`/offboarding?tab=tasks` | `hr_manager` | [PASS](screenshots/qa/cancellation-tasks__light-en-1440.png) | [PASS](screenshots/qa/cancellation-tasks__dark-en-1440.png) | [PASS](screenshots/qa/cancellation-tasks__light-ar-1440.png) | [PASS](screenshots/qa/cancellation-tasks__dark-ar-390.png) |
| **My Documents Upload Modal**<br>`/me/documents?action=upload` | `employee` | [PASS](screenshots/qa/me-documents-upload__light-en-1440.png) | [PASS](screenshots/qa/me-documents-upload__dark-en-1440.png) | [PASS](screenshots/qa/me-documents-upload__light-ar-1440.png) | [PASS](screenshots/qa/me-documents-upload__dark-ar-390.png) |
| **Document Verification Drawer**<br>`/compliance?status=Pending` | `hr_manager` | [PASS](screenshots/qa/document-verification-drawer__light-en-1440.png) | [PASS](screenshots/qa/document-verification-drawer__dark-en-1440.png) | [PASS](screenshots/qa/document-verification-drawer__light-ar-1440.png) | [PASS](screenshots/qa/document-verification-drawer__dark-ar-390.png) |

---

## 2. Assertion Audit Details

- **HTTP Status & Overlay**: Asserted HTTP 200 main document response and absence of Next.js error overlay / `nextjs-portal`.
- **Console & Network Errors**: Recorded all response status ≥ 400 and all console errors (favicon excluded).
- **Role Scoping**: Tested pages under authentic sessions (`employee@gulftech.ae` for self-service, `admin@gulftech.ae` for settings/audit, `hr.mgr@gulftech.ae` for operations).
- **Theme & Language Switching**: Triggered exclusively via UI buttons (`#btn-language-toggle` and `#btn-theme-toggle`) with zero `page.evaluate` DOM faking.
- **Forbidden text leak scan**: Checked for literal `undefined`, `null`, `NaN`, `Invalid request payload`, and empty parentheticals `()`.  
- **Mobile 390px responsive viewport**: Zero horizontal overflow verified (`scrollWidth <= 390px`).  
- **Raw Translation Keys**: Verified no visible text matches unrendered dictionary keys from `en.json`.
- **Arabic Linguistic Integrity**: Verified Arabic screens contain no unapproved English text in interactive controls or headers.
