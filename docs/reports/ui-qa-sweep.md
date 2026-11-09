# Nextal HR & Payroll — Scripted UI QA Sweep & Audit Report

> **Platform**: Nextal HR & Payroll Management System (UAE Labor & MOHRE Compliant)  
> **Sweep Timestamp**: 2026-11-09T06:01:56.890Z  
> **Engine**: Playwright Chromium (Automated Scripted Sweep)  
> **Total Visual Cells Tested**: 108 cells (27 pages × 4 viewport/theme variants)  
> **Passed**: **108 / 108** (100%) · **Failed**: **0**  

---

## 1. Automated Verification Matrix

| Page / Route | Role | light-en-1440 | dark-en-1440 | light-ar-1440 (RTL) | dark-ar-390 (Mobile RTL) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Dashboard**<br>`/` | `hr_manager` | [PASS](screenshots/qa/dashboard__light-en-1440.png) | [PASS](screenshots/qa/dashboard__dark-en-1440.png) | [PASS](screenshots/qa/dashboard__light-ar-1440.png) | [PASS](screenshots/qa/dashboard__dark-ar-390.png) |
| **Employee Directory**<br>`/employees` | `hr_manager` | [PASS](screenshots/qa/employees__light-en-1440.png) | [PASS](screenshots/qa/employees__dark-en-1440.png) | [PASS](screenshots/qa/employees__light-ar-1440.png) | [PASS](screenshots/qa/employees__dark-ar-390.png) |
| **New Employee Wizard**<br>`/employees/new` | `hr_manager` | [PASS](screenshots/qa/employee-new__light-en-1440.png) | [PASS](screenshots/qa/employee-new__dark-en-1440.png) | [PASS](screenshots/qa/employee-new__light-ar-1440.png) | [PASS](screenshots/qa/employee-new__dark-ar-390.png) |
| **Employee Profile**<br>`/employees/acbc6bca-97b3-4125-bbc7-6c6a0e54a41a` | `hr_manager` | [PASS](screenshots/qa/employee-detail__light-en-1440.png) | [PASS](screenshots/qa/employee-detail__dark-en-1440.png) | [PASS](screenshots/qa/employee-detail__light-ar-1440.png) | [PASS](screenshots/qa/employee-detail__dark-ar-390.png) |
| **Approvals Inbox**<br>`/approvals` | `hr_manager` | [PASS](screenshots/qa/approvals__light-en-1440.png) | [PASS](screenshots/qa/approvals__dark-en-1440.png) | [PASS](screenshots/qa/approvals__light-ar-1440.png) | [PASS](screenshots/qa/approvals__dark-ar-390.png) |
| **Attendance Register**<br>`/attendance` | `hr_manager` | [PASS](screenshots/qa/attendance__light-en-1440.png) | [PASS](screenshots/qa/attendance__dark-en-1440.png) | [PASS](screenshots/qa/attendance__light-ar-1440.png) | [PASS](screenshots/qa/attendance__dark-ar-390.png) |
| **Leave & Holidays**<br>`/leave` | `hr_manager` | [PASS](screenshots/qa/leave__light-en-1440.png) | [PASS](screenshots/qa/leave__dark-en-1440.png) | [PASS](screenshots/qa/leave__light-ar-1440.png) | [PASS](screenshots/qa/leave__dark-ar-390.png) |
| **Pay Runs & WPS**<br>`/payroll` | `hr_manager` | [PASS](screenshots/qa/payroll__light-en-1440.png) | [PASS](screenshots/qa/payroll__dark-en-1440.png) | [PASS](screenshots/qa/payroll__light-ar-1440.png) | [PASS](screenshots/qa/payroll__dark-ar-390.png) |
| **Salary Adjustments**<br>`/payroll/adjustments` | `hr_manager` | [PASS](screenshots/qa/payroll-adjustments__light-en-1440.png) | [PASS](screenshots/qa/payroll-adjustments__dark-en-1440.png) | [PASS](screenshots/qa/payroll-adjustments__light-ar-1440.png) | [PASS](screenshots/qa/payroll-adjustments__dark-ar-390.png) |
| **Pay Run Details**<br>`/payroll/4f4f4318-a595-4b2c-afad-f27a11398999` | `hr_manager` | [PASS](screenshots/qa/payroll-detail__light-en-1440.png) | [PASS](screenshots/qa/payroll-detail__dark-en-1440.png) | [PASS](screenshots/qa/payroll-detail__light-ar-1440.png) | [PASS](screenshots/qa/payroll-detail__dark-ar-390.png) |
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
| **Pay Run Validation Tab**<br>`/payroll/4f4f4318-a595-4b2c-afad-f27a11398999?tab=validation` | `hr_manager` | [PASS](screenshots/qa/payroll-validation__light-en-1440.png) | [PASS](screenshots/qa/payroll-validation__dark-en-1440.png) | [PASS](screenshots/qa/payroll-validation__light-ar-1440.png) | [PASS](screenshots/qa/payroll-validation__dark-ar-390.png) |
| **Pay Run Variances Tab**<br>`/payroll/4f4f4318-a595-4b2c-afad-f27a11398999?tab=variances` | `hr_manager` | [PASS](screenshots/qa/payroll-variances__light-en-1440.png) | [PASS](screenshots/qa/payroll-variances__dark-en-1440.png) | [PASS](screenshots/qa/payroll-variances__light-ar-1440.png) | [PASS](screenshots/qa/payroll-variances__dark-ar-390.png) |
| **Pay Run Payslips Tab**<br>`/payroll/4f4f4318-a595-4b2c-afad-f27a11398999?tab=payslips` | `hr_manager` | [PASS](screenshots/qa/payroll-payslips__light-en-1440.png) | [PASS](screenshots/qa/payroll-payslips__dark-en-1440.png) | [PASS](screenshots/qa/payroll-payslips__light-ar-1440.png) | [PASS](screenshots/qa/payroll-payslips__dark-ar-390.png) |
| **Pay Run SIF Tab**<br>`/payroll/4f4f4318-a595-4b2c-afad-f27a11398999?tab=sif` | `hr_manager` | [PASS](screenshots/qa/payroll-sif__light-en-1440.png) | [PASS](screenshots/qa/payroll-sif__dark-en-1440.png) | [PASS](screenshots/qa/payroll-sif__light-ar-1440.png) | [PASS](screenshots/qa/payroll-sif__dark-ar-390.png) |
| **My Payslip Detail**<br>`/me/payslips/8968abf1-9a5c-404a-9907-262de1668e2e` | `employee` | [PASS](screenshots/qa/me-payslip-detail__light-en-1440.png) | [PASS](screenshots/qa/me-payslip-detail__dark-en-1440.png) | [PASS](screenshots/qa/me-payslip-detail__light-ar-1440.png) | [PASS](screenshots/qa/me-payslip-detail__dark-ar-390.png) |

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
