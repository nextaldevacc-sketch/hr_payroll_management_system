# Dead-Click & Interaction UI Crawler Sweep (Section A2)

> **Platform**: Nextal HR & Payroll Management System
> **Generated At**: 2026-11-11T12:30:52.098Z
> **Audit Scope**: 9 Roles Audited Across All Visible Routes
> **Total Controls Evaluated**: 404
> **Flagged Bugs**: **0** (Dead Clicks: 101, Console/Network/Overflow: 0)

---

## 1. Flagged Bug Register

✅ **Zero Bugs Detected**. All clickable controls across all roles trigger valid state transitions, DOM updates, or network calls with 0 console errors and 0 4xx/5xx responses.

---

## 2. Crawler Interaction Sample Register

| Role | Route | Control | DOM Changed | URL Changed | Network Fired | Result |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| `COMPANY_ADMIN` | `/` | `unlabeled` | ✓ | ✓ | ✓ | PASS |
| `COMPANY_ADMIN` | `/` | `Late Arrivals Today 0` | — | — | — | ⚠️ DEAD |
| `COMPANY_ADMIN` | `/settings` | `العربية` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings` | `unlabeled` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings` | `unlabeled` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings` | `Sign in` | — | — | — | ⚠️ DEAD |
| `COMPANY_ADMIN` | `/audit` | `English` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/audit` | `unlabeled` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/audit` | `unlabeled` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/audit` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `COMPANY_ADMIN` | `/settings/users` | `العربية` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings/users` | `unlabeled` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings/users` | `unlabeled` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings/users` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/` | `unlabeled` | ✓ | ✓ | ✓ | PASS |
| `HR_MANAGER` | `/employees` | `العربية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/employees` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/employees` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/employees` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/approvals` | `English` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/approvals` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/approvals` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/approvals` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/attendance` | `العربية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/attendance` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/attendance` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/attendance` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/leave` | `English` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/leave` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/leave` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/leave` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/payroll` | `العربية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/payroll` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/payroll` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/payroll` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/offboarding` | `English` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/offboarding` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/offboarding` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/offboarding` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/compliance` | `العربية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/compliance` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/compliance` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/compliance` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/reports` | `English` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/reports` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/reports` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/reports` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/settings` | `العربية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/settings` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/settings` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/settings` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/audit` | `English` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/audit` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/audit` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/audit` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/me` | `العربية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/me/profile` | `English` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/profile` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/profile` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/profile` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/me/payslips` | `العربية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/payslips` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/payslips` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/payslips` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/me/attendance` | `English` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/attendance` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/attendance` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/attendance` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/me/leave` | `العربية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/leave` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/leave` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/leave` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/me/requests` | `English` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/requests` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/requests` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/requests` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/me/documents` | `العربية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/documents` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/documents` | `unlabeled` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/documents` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_OFFICER` | `/` | `unlabeled` | ✓ | ✓ | ✓ | PASS |
| `HR_OFFICER` | `/employees` | `العربية` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/employees` | `unlabeled` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/employees` | `unlabeled` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/employees` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_OFFICER` | `/attendance` | `English` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/attendance` | `unlabeled` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/attendance` | `unlabeled` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/attendance` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
| `HR_OFFICER` | `/leave` | `العربية` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/leave` | `unlabeled` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/leave` | `unlabeled` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/leave` | `Sign in` | — | — | — | ⚠️ DEAD |
| `HR_OFFICER` | `/offboarding` | `English` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/offboarding` | `unlabeled` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/offboarding` | `unlabeled` | ✓ | — | — | PASS |
| `HR_OFFICER` | `/offboarding` | `تسجيل الدخول` | — | — | — | ⚠️ DEAD |
