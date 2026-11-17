# Mobile Responsive UI Audit (390x844 & 360x800)

**Audit Timestamp:** 2026-11-17T04:47:04.761Z
**Viewports Tested:** 390x844 (iPhone 14), 360x800 (Android)
**Roles Tested:** FINANCE, DEPT_MANAGER
**Total Page Viewport Checks:** 18
**Horizontal Overflow Failures:** 0
**Uncontained Tables:** 0
**Sticky Header Overlap Issues:** 0
**Drawer State During Page Capture:** Strictly CLOSED across all routes (with dedicated drawer screenshots for all roles)

## 1. Summary Matrix

| Viewport | Role | Route | Tables | Overflow | Uncontained | Tap <40px | Header Overlap | Result |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 390x844 (iPhone 14) | FINANCE | `/` | 0 | OK (0px) | OK | 3 | OK | **PASS** |
| 390x844 (iPhone 14) | FINANCE | `/approvals` | 1 | OK (0px) | OK | 1 | OK | **PASS** |
| 390x844 (iPhone 14) | FINANCE | `/payroll` | 1 | OK (0px) | OK | 5 | OK | **PASS** |
| 390x844 (iPhone 14) | FINANCE | `/reports` | 0 | OK (0px) | OK | 1 | OK | **PASS** |
| 390x844 (iPhone 14) | DEPT_MANAGER | `/` | 0 | OK (0px) | OK | 0 | OK | **PASS** |
| 390x844 (iPhone 14) | DEPT_MANAGER | `/employees` | 1 | OK (0px) | OK | 5 | OK | **PASS** |
| 390x844 (iPhone 14) | DEPT_MANAGER | `/approvals` | 1 | OK (0px) | OK | 1 | OK | **PASS** |
| 390x844 (iPhone 14) | DEPT_MANAGER | `/attendance` | 1 | OK (0px) | OK | 5 | OK | **PASS** |
| 390x844 (iPhone 14) | DEPT_MANAGER | `/leave` | 1 | OK (0px) | OK | 3 | OK | **PASS** |
| 360x800 (Android) | FINANCE | `/` | 0 | OK (0px) | OK | 3 | OK | **PASS** |
| 360x800 (Android) | FINANCE | `/approvals` | 1 | OK (0px) | OK | 1 | OK | **PASS** |
| 360x800 (Android) | FINANCE | `/payroll` | 1 | OK (0px) | OK | 5 | OK | **PASS** |
| 360x800 (Android) | FINANCE | `/reports` | 0 | OK (0px) | OK | 1 | OK | **PASS** |
| 360x800 (Android) | DEPT_MANAGER | `/` | 0 | OK (0px) | OK | 0 | OK | **PASS** |
| 360x800 (Android) | DEPT_MANAGER | `/employees` | 1 | OK (0px) | OK | 5 | OK | **PASS** |
| 360x800 (Android) | DEPT_MANAGER | `/approvals` | 1 | OK (0px) | OK | 1 | OK | **PASS** |
| 360x800 (Android) | DEPT_MANAGER | `/attendance` | 1 | OK (0px) | OK | 5 | OK | **PASS** |
| 360x800 (Android) | DEPT_MANAGER | `/leave` | 1 | OK (0px) | OK | 3 | OK | **PASS** |

## 2. Nav Drawer Verification Evidence

Every role has a dedicated drawer screenshot taken while open, and confirmed closed before taking page screenshots:

| Viewport | Role | Drawer Brand | User | Visible Nav Labels | Drawer Overflow |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 390x844 (iPhone 14) | FINANCE | NEXTAL | Sarah Jenkins | 13 labels (Dashboard, Approvals, Payroll, Offboarding, Reports) | OK |
| 390x844 (iPhone 14) | DEPT_MANAGER | NEXTAL | Mansour Al-Ketbi | 13 labels (Dashboard, Employees, Approvals, Attendance, Leave & Holidays) | OK |
| 360x800 (Android) | FINANCE | NEXTAL | Sarah Jenkins | 13 labels (Dashboard, Approvals, Payroll, Offboarding, Reports) | OK |
| 360x800 (Android) | DEPT_MANAGER | NEXTAL | Mansour Al-Ketbi | 13 labels (Dashboard, Employees, Approvals, Attendance, Leave & Holidays) | OK |
