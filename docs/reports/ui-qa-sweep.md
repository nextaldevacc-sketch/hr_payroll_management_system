# Nextal HR & Payroll — Front-End UI QA Sweep & Audit Report

> **Platform**: Nextal HR & Payroll Management System (UAE Labor & MOHRE Compliant)  
> **Date**: 3 November 2026  
> **Environment**: Next.js 14 Web (`localhost:3100`) · Express API (`localhost:5000`) · PostgreSQL (`nextal_hr_test`)  
> **Target Scope**: All pages in `frontend/src/app/(app)`, Drawers, Modals, RTL (Arabic) / LTR (English), Light / Dark Themes, Viewports (1440px, 1024px, 390px)  
> **Status**: **100% VERIFIED & PASSED**

---

## 1. Executive Summary

This comprehensive UI/UX Quality Assurance sweep verifies the fixes implemented for all issues discovered during manual testing on `localhost:3100` as specified in `docs/prompts/PART4A-UI-FIXES.md`. Every page in the application was evaluated across theme modes (light/dark), language locales (en/ar with RTL mirroring), and viewports down to 390px mobile screens without horizontal scroll.

### Key Architectural Enhancements:
1. **Real Company Visa Selector (`GlassTopBar.jsx`, `VisaContext.jsx`)**:
   - Replaced static placeholder entries with dynamic API data (`/auth/me`).
   - Displays real company name, MOHRE establishment ID, and emirate for each visa.
   - Multi-visa users have an active filter persisted per user ID in `localStorage` that dynamically filters dashboards, employees, attendance, and payroll.
   - Automatically hidden for single-visa organizations and employees (rendered as a static company badge).
2. **Company Visa ↔ Branch Dependency Hierarchy**:
   - Reordered form flows across the wizard, employee profile, and settings: **Company Visa first, then Branch**.
   - Dependent branch options strictly match the selected visa's `company_visa_id`. If only one branch exists, it is automatically selected.
   - Empty parentheticals (e.g. `()`) eliminated across all options with clear emirate badges and localized Arabic labels.
   - Server-side mismatch rejection enforced with HTTP 400 (`BRANCH_VISA_MISMATCH`).
3. **Universal Styled Accessible `Select.jsx`**:
   - Zero native `<select>` tags remain in production UI code (`git grep -rn "<select" frontend/src` matches 0 files outside `Select.jsx`).
   - Replaced in 25 component files with our custom design-tokenized combobox/listbox featuring keyboard navigation, live search when options > 8, RTL mirroring, dark/light theme tokens, and synchronized hidden `<select>` elements for test runner compatibility.
4. **Form Validation & Actionable Feedback**:
   - Eliminated generic "Invalid request payload" alerts. Field-specific Zod errors map directly to inline red helper text under invalid inputs, accompanied by a single concise summary banner ("Please fix X fields").
   - Sequential employee code generation (`EMP-DXB-045` following `044`) generated server-side in a collision-safe routine with live uniqueness checks.
5. **Spec 7.2 Onboarding Roles & Upfront Dual-Control Guards**:
   - Pre-Joined status flow ends with a 5-stage setup checklist detailing the required next actors (HR Manager verification, Payroll contract, HR statutory documents, Payroll bank account, HR activation).
   - Upfront self-verification guard banner displayed immediately when the creator inspects the record ("Another HR Manager must verify this record (you created this record)"), disabling action buttons to prevent self-approval.
   - HR Managers provided with a dedicated "Pending verification" filter pill in `EmployeeListFeature.jsx`.

---

## 2. Page-by-Page Audit & Fix Matrix

| Route / Screen | Role Scope | Identified Defects (Before) | Resolution Implemented (After) | Theme & RTL Verification | Verification Artifact / Screenshot |
|:---|:---|:---|:---|:---|:---|
| `/(app)`<br>(Dashboard) | `ALL` | Hardcoded MOHRE visa subtitle in hero; fake company dropdown in top bar; sparkline SVG `NaN` errors when values empty. | Added `VisaContext` filter, dynamic company subtitle from active visa, safe sparkline coordinate fallback (`Number(s.net ?? 0)`), and role-specific bento reflow. | Dark & Light verified. RTL flipped properly with Arabic numbers. | [7.1-2-COMPANY_ADMIN.png](screenshots/workflow/7.1-2-COMPANY_ADMIN.png) |
| `/employees/new`<br>(Onboarding Wizard) | `HR_OFFICER`<br>`HR_MANAGER` | Branch appeared before visa; branch labels showed empty `()`; generic "Invalid payload" toast; random codes; missing 5-stage next steps. | Reordered: Visa first, Branch second. Mapped field-level Zod errors. Sequential code generation (`EMP-DXB-045`). 5-stage checklist displayed upon submission. | Dark & Light verified. Step indicators mirror correctly in RTL. | [7.2-1-HR_OFFICER.png](screenshots/workflow/7.2-1-HR_OFFICER.png) |
| `/employees`<br>(Employee Directory) | `HR_OFFICER`<br>`HR_MANAGER` | No status filter for records pending HR verification; native `<select>` used for department and branch filters. | Added "Pending Verification" (`Pre-Joined`) quick-filter pill. Replaced filter dropdowns with custom `Select.jsx`. | Accessible listbox with keyboard focus rings in dark mode. | [7.2-3-HR_MANAGER.png](screenshots/workflow/7.2-3-HR_MANAGER.png) |
| `/employees/[id]`<br>(Employee Profile) | `HR_OFFICER`<br>`HR_MANAGER`<br>`PAYROLL_OFFICER` | Creator could attempt self-verification before being blocked; no visual onboarding progress indicator for Pre-Joined/SentBack records. | Added 5-stage setup progress card. Added upfront creator guard banner with disabled buttons for creators. Dual-control send-back/approve buttons for other managers. | Verified across both English and Arabic with full audit log trail. | [7.2-2-HR_OFFICER.png](screenshots/workflow/7.2-2-HR_OFFICER.png)<br>[7.2-10-HR_MANAGER.png](screenshots/workflow/7.2-10-HR_MANAGER.png) |
| `/settings`<br>(Company Settings) | `COMPANY_ADMIN`<br>`HR_MANAGER` | Drawer initial state used mock `INITIAL_SHIFTS` with non-hex IDs (`s1000...`) causing database UUID deserialization failures; native selects in drawers. | Connected shift queries to real database records with empty initial state. Replaced all selects in all drawers with `Select.jsx`. Ensured all IDs are RFC 4122 compliant. | Persists across full reload. Tested with Playwright persistence test. | [7.1-3-COMPANY_ADMIN.png](screenshots/workflow/7.1-3-COMPANY_ADMIN.png)<br>[7.1-5-COMPANY_ADMIN.png](screenshots/workflow/7.1-5-COMPANY_ADMIN.png) |
| `/settings/users`<br>(Users & Roles) | `COMPANY_ADMIN` | Hardcoded demo user table; unable to invite new roles to live backend. | Connected table to live `GET /api/v1/users` and `POST /api/v1/users/invite`. Dynamic roles assignment dropdown with multi-role badges. | Clean dark mode contrast without white borders. | [7.1-7-HR_MANAGER.png](screenshots/workflow/7.1-7-HR_MANAGER.png) |
| `/attendance`<br>(Attendance Review) | `HR_OFFICER`<br>`DEPT_MANAGER` | Native selects for month/year and status filters; HR Officer lacked sign-off authorization on `/review/hr-confirm`. | Replaced filter dropdowns with `Select.jsx`. Updated backend route authorization to grant `HR_OFFICER` sign-off capability per spec 7.3 step 8. | 31-day October grid renders with status chips (Late, Absent, Leave). | [7.3-3-HR_OFFICER.png](screenshots/workflow/7.3-3-HR_OFFICER.png)<br>[7.3-8-HR_OFFICER.png](screenshots/workflow/7.3-8-HR_OFFICER.png) |
| `/me`<br>(Self-Service Home) | `EMPLOYEE`<br>`ALL` (Linked) | Leave balance showed "undefined days"; greeting displayed generic "Employee"; visa switcher visible to employees. | Corrected balance field mapping. Greeting displays employee legal name (`Ahmed Al-Maktoum` / `Test Joiner`). Visa switcher hidden for single-visa/employee roles. | 390px mobile viewport validated with 0px horizontal overflow. | [7.2-9-EMPLOYEE.png](screenshots/workflow/7.2-9-EMPLOYEE.png) |
| `/me/requests`<br>(Employee Requests) | `EMPLOYEE` | Native `<select>` for overtime and leave types; missing validation helper text. | Replaced with `Select.jsx`. Overtime request dynamically shows multiplier chips (`1.25x`, `1.50x`) and statutory justification. | Verified in Arabic RTL layout. | [7.3-6-EMPLOYEE.png](screenshots/workflow/7.3-6-EMPLOYEE.png) |
| `/payroll`<br>(Pay Runs) | `PAYROLL_OFFICER`<br>`FINANCE` | AED currency leaked to non-salary roles in overview; select elements in pay run generation wizard unstyled. | Striped salary and bank fields server-side for unauthorized roles. Replaced all wizard selects with styled `Select.jsx`. | Formatted numbers with thousand separators. Currency rendered properly. | [wf-7-4.png](screenshots/workflow/wf-7-4.png) |

---

## 3. Native Select Elimination Audit

Verification Command:
```bash
git grep -rn "<select" frontend/src
```

### Result:
```
frontend/src/components/primitives/form/Select.jsx:17: * - Synchronized hidden native <select> for seamless testing / form integration
frontend/src/components/primitives/form/Select.jsx:239:      <select
```
**0 native `<select>` tags exist in any feature or page component.** The single match is the hidden `<select>` inside the `Select.jsx` primitive, which synchronizes value changes to ensure seamless form submissions and native Playwright `page.selectOption()` test compatibility.

---

## 4. Test Suite Execution Summary

All test suites were executed sequentially against the isolated test database `nextal_hr_test`:

### 1. Backend Test Suite
- Command: `npm test --prefix backend`
- Result: **251 passed, 0 failed, 1 skipped (T1 deferred Phase 2 platform admin)**
- Suites: 70 suites, 252 tests

### 2. Frontend Test Suite
- Command: `npm test --prefix frontend`
- Execution: Sequential test file execution (`node --test test/arabic-i18n.test.js && ...`)
- Result: **17 passed, 0 failed** across 5 test suites:
  1. `arabic-i18n.test.js`: 3 passed (100% dictionary integrity, zero English parentheticals in Arabic)
  2. `no-demo-code.test.js`: 2 passed (zero demo personas, zero demo credentials in `frontend/src` or `.next-build`)
  3. `settings-shift-persistence.test.js`: 1 passed (UI change, reload persistence, PostgreSQL `audit_logs` & `settings_versions` verified)
  4. `responsive-390px.test.js`: 1 passed (zero horizontal scroll across all self-service screens)
  5. `auth-session.test.js`: 10 passed (route protection, same-origin proxy, 5 failed logins lockout, role landing redirects)

### 3. Business Workflow Verification Runner (Part 4A)
- Command: `node scripts/verify-workflows.mjs`
- Result: **26 / 26 STEPS PASSED (100%)**
  - **Workflow 7.1 (Company Provisioning & Setup)**: Steps 1–7 PASSED
  - **Workflow 7.2 (New Employee Setup & Dual-Control)**: Steps 1–10 PASSED
  - **Workflow 7.3 (Attendance Import & Review)**: Steps 1–9 PASSED

---

## 5. Visual Inspection of Generated Workflow Screenshots

1. **`7.2-1-HR_OFFICER.png`**: Onboarding wizard displays Company Visa selector first, followed by dependent Branch selector. Red helper text correctly highlights missing required fields. Sequential code `EMP-DXB-045` populated.
2. **`7.2-2-HR_OFFICER.png`**: Employee profile for Pre-Joined employee displays the prominent warning banner: *"Another HR Manager must verify this record (you created this record)"*. The "Verify & Approve" button is visibly disabled (`disabled` attribute and opacity styling applied).
3. **`7.2-3-HR_MANAGER.png`**: HR Manager views the "Pending Verification" queue, inspects the record, clicks "Verify & Approve" with mandatory comments, and advances employee status to `New Joined`.
4. **`7.2-8-PAYROLL_OFFICER.png`**: Bank account form in the setup checklist enforces UAE IBAN validation. Invalid checksum is flagged with a red error helper; valid IBAN (`AE070331234567890123456`) is accepted and saved.
5. **`7.2-9-EMPLOYEE.png`**: New employee logs into `/me` self-service landing page. Greeting displays the employee's legal name (`Test Joiner 3983`). Company/visa switcher is hidden. No "undefined" text or empty parentheticals visible.
6. **`7.3-3-HR_OFFICER.png`**: Attendance review screen renders the full 31-day October 2026 grid with status indicators (`Present`, `Late`, `Absent`, `Leave`) and missing punch badges.
7. **`7.3-8-HR_OFFICER.png`**: Monthly attendance sign-off drawer displays dual-stage confirmation. Department manager approval is locked, and HR Officer completes the company-wide sign-off to transition the period to `HrConfirmed` (Payroll-Ready).
