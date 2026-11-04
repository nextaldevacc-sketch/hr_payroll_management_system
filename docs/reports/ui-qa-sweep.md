# Nextal HR & Payroll — Scripted UI QA Sweep & Audit Report

> **Platform**: Nextal HR & Payroll Management System (UAE Labor & MOHRE Compliant)  
> **Sweep Timestamp**: 2026-11-04T06:37:18.062Z  
> **Engine**: Playwright Chromium (Automated Scripted Sweep)  
> **Total Visual Cells Tested**: 64 cells (16 pages × 4 viewport/theme variants)  
> **Passed**: **64 / 64** (100%) · **Failed**: **0**  

---

## 1. Automated 64-Cell Verification Matrix

| Page / Route | light-en-1440 | dark-en-1440 | light-ar-1440 (RTL) | dark-ar-390 (Mobile RTL) |
|:---|:---:|:---:|:---:|:---:|
| **Dashboard**<br>`/` | [PASS](screenshots/qa/dashboard__light-en-1440.png) | [PASS](screenshots/qa/dashboard__dark-en-1440.png) | [PASS](screenshots/qa/dashboard__light-ar-1440.png) | [PASS](screenshots/qa/dashboard__dark-ar-390.png) |
| **Employee Directory**<br>`/employees` | [PASS](screenshots/qa/employees__light-en-1440.png) | [PASS](screenshots/qa/employees__dark-en-1440.png) | [PASS](screenshots/qa/employees__light-ar-1440.png) | [PASS](screenshots/qa/employees__dark-ar-390.png) |
| **New Employee Wizard**<br>`/employees/new` | [PASS](screenshots/qa/employee-new__light-en-1440.png) | [PASS](screenshots/qa/employee-new__dark-en-1440.png) | [PASS](screenshots/qa/employee-new__light-ar-1440.png) | [PASS](screenshots/qa/employee-new__dark-ar-390.png) |
| **Employee Profile**<br>`/employees/b86e7573-eb15-4f08-b058-b06bab1b14fb` | [PASS](screenshots/qa/employee-detail__light-en-1440.png) | [PASS](screenshots/qa/employee-detail__dark-en-1440.png) | [PASS](screenshots/qa/employee-detail__light-ar-1440.png) | [PASS](screenshots/qa/employee-detail__dark-ar-390.png) |
| **Approvals Inbox**<br>`/approvals` | [PASS](screenshots/qa/approvals__light-en-1440.png) | [PASS](screenshots/qa/approvals__dark-en-1440.png) | [PASS](screenshots/qa/approvals__light-ar-1440.png) | [PASS](screenshots/qa/approvals__dark-ar-390.png) |
| **Attendance Register**<br>`/attendance` | [PASS](screenshots/qa/attendance__light-en-1440.png) | [PASS](screenshots/qa/attendance__dark-en-1440.png) | [PASS](screenshots/qa/attendance__light-ar-1440.png) | [PASS](screenshots/qa/attendance__dark-ar-390.png) |
| **Leave & Holidays**<br>`/leave` | [PASS](screenshots/qa/leave__light-en-1440.png) | [PASS](screenshots/qa/leave__dark-en-1440.png) | [PASS](screenshots/qa/leave__light-ar-1440.png) | [PASS](screenshots/qa/leave__dark-ar-390.png) |
| **Pay Runs & WPS**<br>`/payroll` | [PASS](screenshots/qa/payroll__light-en-1440.png) | [PASS](screenshots/qa/payroll__dark-en-1440.png) | [PASS](screenshots/qa/payroll__light-ar-1440.png) | [PASS](screenshots/qa/payroll__dark-ar-390.png) |
| **Salary Adjustments**<br>`/payroll/adjustments` | [PASS](screenshots/qa/payroll-adjustments__light-en-1440.png) | [PASS](screenshots/qa/payroll-adjustments__dark-en-1440.png) | [PASS](screenshots/qa/payroll-adjustments__light-ar-1440.png) | [PASS](screenshots/qa/payroll-adjustments__dark-ar-390.png) |
| **Offboarding & Settlements**<br>`/offboarding` | [PASS](screenshots/qa/offboarding__light-en-1440.png) | [PASS](screenshots/qa/offboarding__dark-en-1440.png) | [PASS](screenshots/qa/offboarding__light-ar-1440.png) | [PASS](screenshots/qa/offboarding__dark-ar-390.png) |
| **Compliance & Documents**<br>`/compliance` | [PASS](screenshots/qa/compliance__light-en-1440.png) | [PASS](screenshots/qa/compliance__dark-en-1440.png) | [PASS](screenshots/qa/compliance__light-ar-1440.png) | [PASS](screenshots/qa/compliance__dark-ar-390.png) |
| **Reports & Exports**<br>`/reports` | [PASS](screenshots/qa/reports__light-en-1440.png) | [PASS](screenshots/qa/reports__dark-en-1440.png) | [PASS](screenshots/qa/reports__light-ar-1440.png) | [PASS](screenshots/qa/reports__dark-ar-390.png) |
| **Company Settings**<br>`/settings` | [PASS](screenshots/qa/settings__light-en-1440.png) | [PASS](screenshots/qa/settings__dark-en-1440.png) | [PASS](screenshots/qa/settings__light-ar-1440.png) | [PASS](screenshots/qa/settings__dark-ar-390.png) |
| **Users & Roles**<br>`/settings/users` | [PASS](screenshots/qa/settings-users__light-en-1440.png) | [PASS](screenshots/qa/settings-users__dark-en-1440.png) | [PASS](screenshots/qa/settings-users__light-ar-1440.png) | [PASS](screenshots/qa/settings-users__dark-ar-390.png) |
| **Audit Trail**<br>`/audit` | [PASS](screenshots/qa/audit__light-en-1440.png) | [PASS](screenshots/qa/audit__dark-en-1440.png) | [PASS](screenshots/qa/audit__light-ar-1440.png) | [PASS](screenshots/qa/audit__dark-ar-390.png) |
| **Employee Self-Service**<br>`/me` | [PASS](screenshots/qa/me__light-en-1440.png) | [PASS](screenshots/qa/me__dark-en-1440.png) | [PASS](screenshots/qa/me__light-ar-1440.png) | [PASS](screenshots/qa/me__dark-ar-390.png) |

---

## 2. Assertion Audit Details

- **Forbidden text leak scan**: Checked for literal `undefined`, `null`, `NaN`, `Invalid request payload`, and empty parentheticals `()`.  
- **Mobile 390px responsive viewport**: Zero horizontal overflow verified (`scrollWidth <= 390px`).  
- **RTL mirroring**: Verified `dir="rtl"` on all Arabic screenshots.  
- **Zero mock status**: All data generated by real headless Chromium instances reading live PostgreSQL database `nextal_hr_test` via `localhost:5000`.  
