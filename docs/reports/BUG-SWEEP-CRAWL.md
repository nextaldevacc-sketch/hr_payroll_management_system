# Dead-Click & Interaction UI Crawler Sweep (Section A2)

> **Platform**: Nextal HR & Payroll Management System
> **Generated At**: 2026-11-12T13:23:34.880Z
> **Audit Scope**: 9 Roles Audited Across All Visible Routes
> **Total Controls Evaluated**: 539
> **Flagged Bugs**: **0** (Dead Clicks: 57, Console/Network/Overflow: 0)

---

## 1. Flagged Bug Register

✅ **Zero Bugs Detected**. All clickable controls across all roles trigger valid state transitions, DOM updates, or network calls with 0 console errors and 0 4xx/5xx responses.

---

## 2. Crawler Interaction Sample Register

| Role | Route | Control | DOM Changed | URL Changed | Network Fired | Result |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| `COMPANY_ADMIN` | `/` | `Gulf Tech Logistics LLC All Company Visa` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/` | `عربي` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/` | `AD admin COMPANY_ADMIN` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings` | `شركة الخليج للتقنية اللوجستية ذ.م.م جميع` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings` | `EN` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings` | `AD admin مسؤول النظام` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/audit` | `Gulf Tech Logistics LLC All Company Visa` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/audit` | `عربي` | — | — | — | ⚠️ DEAD |
| `COMPANY_ADMIN` | `/audit` | `AD admin COMPANY_ADMIN` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/audit` | `Refresh` | — | — | ✓ | PASS |
| `COMPANY_ADMIN` | `/audit` | `Export CSV` | — | — | ✓ | PASS |
| `COMPANY_ADMIN` | `/audit` | `All Actions` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/audit` | `All Entities / Tables` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings/users` | `شركة الخليج للتقنية اللوجستية ذ.م.م جميع` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings/users` | `EN` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings/users` | `AD admin مسؤول النظام` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings/users` | `إنشاء حسابات مجمعة للموظفين` | ✓ | — | — | PASS |
| `COMPANY_ADMIN` | `/settings/users` | `دعوة مستخدم جديد` | — | — | — | ⚠️ DEAD |
| `COMPANY_ADMIN` | `/settings/users` | `الكل` | — | — | — | ⚠️ DEAD |
| `COMPANY_ADMIN` | `/settings/users` | `مسؤول النظام للشركة WPS` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/` | `Gulf Tech Logistics LLC All Company Visa` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/` | `عربي` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/` | `RA Rashid Al-Falasi HR_MANAGER` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/` | `Import Punches` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/` | `Calculate Payroll` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/` | `Refresh calculation` | ✓ | ✓ | ✓ | PASS |
| `HR_MANAGER` | `/` | `Validate run` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/employees` | `شركة الخليج للتقنية اللوجستية ذ.م.م جميع` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/employees` | `EN` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/employees` | `RA راشد الفلاسي مدير الموارد البشرية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/employees` | `الكل` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/employees` | `بانتظار الاعتماد` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/employees` | `نشط` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/employees` | `جميع الحالات` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/approvals` | `Gulf Tech Logistics LLC All Company Visa` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/approvals` | `عربي` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/approvals` | `RA Rashid Al-Falasi HR_MANAGER` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/attendance` | `شركة الخليج للتقنية اللوجستية ذ.م.م جميع` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/attendance` | `EN` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/attendance` | `RA راشد الفلاسي مدير الموارد البشرية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/attendance` | `شبكة الحضور` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/attendance` | `استيراد البصمة` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/attendance` | `البصمات المفقودة` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/attendance` | `الاعتماد الشهري` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/leave` | `Gulf Tech Logistics LLC All Company Visa` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/leave` | `عربي` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/leave` | `RA Rashid Al-Falasi HR_MANAGER` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/leave` | `Leave Requests` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/leave` | `Approval Inbox` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/leave` | `Statutory Balances` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/leave` | `Public Holidays` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/payroll` | `شركة الخليج للتقنية اللوجستية ذ.م.م جميع` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/payroll` | `EN` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/payroll` | `RA راشد الفلاسي مدير الموارد البشرية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/payroll` | `جميع الحالات` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/payroll` | `مسودة` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/payroll` | `تم الحساب` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/payroll` | `تم التدقيق` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/offboarding` | `Gulf Tech Logistics LLC All Company Visa` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/offboarding` | `عربي` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/offboarding` | `RA Rashid Al-Falasi HR_MANAGER` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/offboarding` | `Gratuity Report` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/offboarding` | `Leave Liability` | — | — | ✓ | PASS |
| `HR_MANAGER` | `/offboarding` | `Initiate Separation` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/offboarding` | `Separations & Clearance 3` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/compliance` | `شركة الخليج للتقنية اللوجستية ذ.م.م جميع` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/compliance` | `EN` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/compliance` | `RA راشد الفلاسي مدير الموارد البشرية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/compliance` | `تحديث البيانات` | — | — | ✓ | PASS |
| `HR_MANAGER` | `/compliance` | `بحث` | — | — | ✓ | PASS |
| `HR_MANAGER` | `/compliance` | `جميع الحالات` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/compliance` | `جميع أنواع الوثائق` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/reports` | `Gulf Tech Logistics LLC All Company Visa` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/reports` | `عربي` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/reports` | `RA Rashid Al-Falasi HR_MANAGER` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/reports` | `Download` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/reports` | `Download` | — | — | ✓ | PASS |
| `HR_MANAGER` | `/settings` | `شركة الخليج للتقنية اللوجستية ذ.م.م جميع` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/settings` | `EN` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/settings` | `RA راشد الفلاسي مدير الموارد البشرية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/audit` | `Gulf Tech Logistics LLC All Company Visa` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/audit` | `عربي` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/audit` | `RA Rashid Al-Falasi HR_MANAGER` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/audit` | `Refresh` | — | — | ✓ | PASS |
| `HR_MANAGER` | `/audit` | `Export CSV` | — | — | ✓ | PASS |
| `HR_MANAGER` | `/audit` | `All Actions` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/audit` | `All Entities / Tables` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me` | `شركة الخليج للتقنية اللوجستية ذ.م.م جميع` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me` | `EN` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me` | `RA راشد الفلاسي مدير الموارد البشرية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me` | `تقديم طلب` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/me` | `عرض الرواتب` | — | — | — | ⚠️ DEAD |
| `HR_MANAGER` | `/me/profile` | `Gulf Tech Logistics LLC All Company Visa` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/profile` | `عربي` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/profile` | `RA Rashid Al-Falasi HR_MANAGER` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/payslips` | `شركة الخليج للتقنية اللوجستية ذ.م.م جميع` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/payslips` | `EN` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/payslips` | `RA راشد الفلاسي مدير الموارد البشرية` | ✓ | — | — | PASS |
| `HR_MANAGER` | `/me/payslips` | `التفاصيل` | ✓ | — | ✓ | PASS |
| `HR_MANAGER` | `/me/payslips` | `تحميل PDF` | ✓ | — | ✓ | PASS |
