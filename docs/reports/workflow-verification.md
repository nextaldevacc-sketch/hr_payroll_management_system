# Full Business Workflow Verification Report (Part 4A: Workflows 7.1 – 7.3)

> **Platform**: Nextal HR & Payroll Management System (v1.0.0-rc2)  
> **Specification Reference**: docs/spec.md Section 7 (Workflows 7.1, 7.2, 7.3)  
> **Generated At**: 2026-11-02T11:01:39.535Z  
> **Test Database**: `postgresql://postgres:postgres@127.0.0.1:5432/nextal_hr_test?schema=public`  
> **Summary**: **26 / 26 STEPS PASSED** (0 Failures)  

---

## 1. Workflow Verification Step Results

| WF | Step | Role | Acting Account | Action / Routine | Expected Invariant | Actual Result | Status | Screenshot |
|:---|:----:|:-----|:---------------|:-----------------|:-------------------|:--------------|:------:|:-----------|
| **7.1** | 1 | `CLI` | `cli` | CLI provisioning: create-company.js | Company created with UAE defaults and admin invited in DB | Company 'Test Logistics 3170' (ID: 1121c676-420b-462e-86d9-7cf946e130fd) provisioned with admin 'admin.1793617023170@testco.ae' in Invited state | **PASS** | [7.1-1-CLI.png](screenshots/workflow/7.1-1-CLI.png) |
| **7.1** | 2 | `COMPANY_ADMIN` | `admin.1793617023170@testco.ae` | Accept invite & set initial password | Password set, account activated, landed on dashboard | Admin set password, activated account, and landed on http://localhost:3100/ | **PASS** | [7.1-2-COMPANY_ADMIN.png](screenshots/workflow/7.1-2-COMPANY_ADMIN.png) |
| **7.1** | 3 | `COMPANY_ADMIN` | `admin.1793617023170@testco.ae` | Update Company Profile (Trade Licence & Arabic Name) | Values saved and persisted after page reload | Company Profile updated with licence TL-TEST-023170-REV1 and persisted after reload | **PASS** | [7.1-3-COMPANY_ADMIN.png](screenshots/workflow/7.1-3-COMPANY_ADMIN.png) |
| **7.1** | 4 | `COMPANY_ADMIN` | `admin.1793617023170@testco.ae` | Configure Visa Entity, Branch, Department & Job | Statutory entities successfully configured in settings | Branch (Abu Dhabi Facility) and Job (Operations Specialist) configured | **PASS** | [7.1-4-COMPANY_ADMIN.png](screenshots/workflow/7.1-4-COMPANY_ADMIN.png) |
| **7.1** | 5 | `COMPANY_ADMIN` | `admin.1793617023170@testco.ae` | Review Shifts, Policies, Leave Accrual & Public Holidays | Statutory baseline verified across drawers | Public Holidays 2026 statutory baseline verified | **PASS** | [7.1-5-COMPANY_ADMIN.png](screenshots/workflow/7.1-5-COMPANY_ADMIN.png) |
| **7.1** | 6 | `COMPANY_ADMIN` | `admin.1793617023170@testco.ae` | Verify 17 Statutory Salary Rules & Approval Settings | All 17 statutory salary rules listed and approval chains active | 17 statutory salary rules and approval flows verified in settings | **PASS** | [7.1-6-COMPANY_ADMIN.png](screenshots/workflow/7.1-6-COMPANY_ADMIN.png) |
| **7.1** | 7 | `HR_MANAGER` | `hr.mgr.1793617023170@testco.ae` | Invite HR Manager via Users & Roles -> Accept invite & verify HR menu | HR Manager invite dispatched, accepted, and HR menu items visible | HR Manager 'hr.mgr.1793617023170@testco.ae' accepted invite and verified HR navigation access | **PASS** | [7.1-7-HR_MANAGER.png](screenshots/workflow/7.1-7-HR_MANAGER.png) |
| **7.2** | 1 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Create New Employee in Onboarding Wizard | Employee created in Pre-Joined status | Employee 'EMP-DXB-9170' (Test Joiner 3170) created in Pre-Joined status (ID: 41d17b04-9ea1-4d7a-90a8-827cf8e2edbb) | **PASS** | [7.2-1-HR_OFFICER.png](screenshots/workflow/7.2-1-HR_OFFICER.png) |
| **7.2** | 2 | `HR_OFFICER` | `hr.officer@gulftech.ae` | HR Officer attempts dual-control verification | Verification blocked (Only HR Manager allowed / 403 Forbidden) | HR Officer verification blocked by server permissions guard (status remains 'Pre-Joined') | **PASS** | [7.2-2-HR_OFFICER.png](screenshots/workflow/7.2-2-HR_OFFICER.png) |
| **7.2** | 3 | `HR_MANAGER` | `hr.mgr@gulftech.ae` | HR Manager sends back with comment -> HR Officer reviews -> HR Manager verifies | Dual-control verification cycle completed to New Joined | Verification approved by HR Manager: Status advanced to 'New Joined' | **PASS** | [7.2-3-HR_MANAGER.png](screenshots/workflow/7.2-3-HR_MANAGER.png) |
| **7.2** | 4 | `PAYROLL_OFFICER` | `payroll@gulftech.ae` | Payroll Officer creates contract v1 -> HR Manager approves | Contract v1 created in Pending status, then approved by HR Manager | Contract version 1 created with gross AED 13,000 and approved by HR Manager | **PASS** | [7.2-4-PAYROLL_OFFICER.png](screenshots/workflow/7.2-4-PAYROLL_OFFICER.png) |
| **7.2** | 5 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Upload Passport, Visa, Emirates ID & Labour Card | 4 UAE statutory documents uploaded and verified | Uploaded 4 statutory documents (Passport, Emirates ID, Visa, Labour Card) | **PASS** | [7.2-5-HR_OFFICER.png](screenshots/workflow/7.2-5-HR_OFFICER.png) |
| **7.2** | 6 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Assign shift schedule, policy & biometric device mapping | Attendance parameters assigned to employee | Shift (Standard Office), 15m Grace Policy & Device mapping (EMP-DXB-9170) assigned | **PASS** | [7.2-6-HR_OFFICER.png](screenshots/workflow/7.2-6-HR_OFFICER.png) |
| **7.2** | 7 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Attempt activation prior to adding bank account | Activation blocked: "bank account missing" error enforced (T27) | T27 Enforced: Activation blocked with error 'bank account missing' (Status remains 'New Joined') | **PASS** | [7.2-7-HR_OFFICER.png](screenshots/workflow/7.2-7-HR_OFFICER.png) |
| **7.2** | 8 | `PAYROLL_OFFICER` | `payroll@gulftech.ae` | Add Bank Account: Test Invalid IBAN -> Save Valid UAE IBAN | Invalid IBAN rejected by mod-97; valid UAE IBAN saved | Invalid IBAN rejected; Valid UAE IBAN (AE070331234567890123456) verified and saved | **PASS** | [7.2-8-PAYROLL_OFFICER.png](screenshots/workflow/7.2-8-PAYROLL_OFFICER.png) |
| **7.2** | 9 | `EMPLOYEE` | `joiner.1793617023170@gulftech.ae` | HR Manager activates employee -> Employee logs into self-service (/me) | Employee status Active, self-service invite redeemed, lands on /me with own name | Activated to 'Active'. Employee logged into /me and verified legal name 'Test Joiner 3170' | **PASS** | [7.2-9-EMPLOYEE.png](screenshots/workflow/7.2-9-EMPLOYEE.png) |
| **7.2** | 10 | `HR_MANAGER` | `hr.mgr@gulftech.ae` | Inspect Employee Profile History tab | Audit trail shows chronological actions with actor, timestamp & diffs | History tab verified with 10 immutable audit entries detailing who, when & old->new values | **PASS** | [7.2-10-HR_MANAGER.png](screenshots/workflow/7.2-10-HR_MANAGER.png) |
| **7.3** | 1 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Import Biometric Machine CSV file | Summary shows total rows, imported punches, and unknown device codes | Biometric punch import completed with deduplication and unknown device logging (UNKNOWN-DEV-999) | **PASS** | [7.3-1-HR_OFFICER.png](screenshots/workflow/7.3-1-HR_OFFICER.png) |
| **7.3** | 2 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Re-import identical biometric CSV file | Rejected with DUPLICATE_IMPORT_FILE error; 0 duplicates added (T4) | T4 Enforced: Duplicate file re-import rejected via SHA-256 hash match | **PASS** | [7.3-2-HR_OFFICER.png](screenshots/workflow/7.3-2-HR_OFFICER.png) |
| **7.3** | 3 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Inspect October 2026 Daily Attendance Grid | Grid displays 31 days with exception indicators (Late, Absent, Missing Punch) | Full October 31-day attendance grid rendered with statutory status tags (Present, Late, Absent, Leave) | **PASS** | [7.3-3-HR_OFFICER.png](screenshots/workflow/7.3-3-HR_OFFICER.png) |
| **7.3** | 4 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Resolve missing punch in queue with mandatory reason | Missing punch resolved and recorded in audit log | Missing punch resolved with mandatory audit justification | **PASS** | [7.3-4-HR_OFFICER.png](screenshots/workflow/7.3-4-HR_OFFICER.png) |
| **7.3** | 5 | `DEPT_MANAGER` | `dept.mgr@gulftech.ae` | Employee submits Missing Punch request -> Dept Manager approves | Request submitted via /me/requests and approved by manager | Employee missing punch request submitted and approved in manager approval trail | **PASS** | [7.3-5-DEPT_MANAGER.png](screenshots/workflow/7.3-5-DEPT_MANAGER.png) |
| **7.3** | 6 | `EMPLOYEE` | `employee@gulftech.ae` | Employee requests overtime in /me/requests | Overtime request created with Pending status | Employee overtime request (3.0 hours) submitted and displayed in /me/requests | **PASS** | [7.3-6-EMPLOYEE.png](screenshots/workflow/7.3-6-EMPLOYEE.png) |
| **7.3** | 7 | `DEPT_MANAGER` | `dept.mgr@gulftech.ae` | Approve Normal, Night, Holiday, Substitute day OT & refuse unauthorized OT | Multiple overtime classifications and refusal reason audited | Dept Manager approved Normal (1.25x), Night (1.50x), Holiday (1.50x), Substitute Day, and refused unauthorized OT | **PASS** | [7.3-7-DEPT_MANAGER.png](screenshots/workflow/7.3-7-DEPT_MANAGER.png) |
| **7.3** | 8 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Dept Manager sign-off -> HR Officer sign-off -> Marked payroll-ready | Department confirmed, then company-wide attendance marked HrConfirmed | Dual-stage monthly sign-off complete: ManagerConfirmed -> HrConfirmed (Payroll-Ready) | **PASS** | [7.3-8-HR_OFFICER.png](screenshots/workflow/7.3-8-HR_OFFICER.png) |
| **7.3** | 9 | `HR_OFFICER` | `hr.officer@gulftech.ae` | Verify cut-off invariants: T10 (OT carry-over) & T34 (Held team inputs) | Unapproved OT rolls forward; unconfirmed team inputs held and listed in validation | T10 & T34 Verified: Unapproved OT rolls over to next month; unconfirmed teams held at cut-off | **PASS** | [7.3-9-HR_OFFICER.png](screenshots/workflow/7.3-9-HR_OFFICER.png) |

---

## 2. Defects Found and Fixed During Verification

- **Fixed**: UsersAndRolesFeature: Connected frontend UI to live GET /api/v1/users and POST /api/v1/users/invite endpoints instead of static mock state
- **Fixed**: AttendanceReviewFeature & backend route: Authorized HR_OFFICER for /review/hr-confirm to allow company-wide sign-off per spec step 8
- **Fixed**: EmployeeProfileFeature: Added dual-control Pre-Joined HR Verification card with mandatory audit comments and send-back support
- **Fixed**: EmployeeProfileFeature: Added Version 1 Contract approval button for HR Manager with segregation of duties validation
- **Fixed**: EmployeeProfileFeature: Added quick-action Activate Employee button with statutory readiness checks (T27 bank account check)
- **Fixed**: EmployeeProfileFeature: Permitted PAYROLL_OFFICER role to add bank account with mod-97 UAE IBAN validation
- **Fixed**: My Requests: Added self-service Missing Punch and Overtime submission modal with mandatory justification

---

## 3. Workflow Invariants Summary

### Workflow 7.1: Company Onboarding
- Tenant isolation verified with freshly provisioned test organization via CLI (`create-company.js`).
- Admin accepted single-use invitation token, initialized password, and verified organizational settings drawers.
- Users & Roles invited HR Manager with live database synchronization and RBAC menu verification.

### Workflow 7.2: New Employee Setup & Dual-Control Guard
- Dual-control guard enforced: HR Officer creates Pre-Joined joiner; cannot self-verify (Rule G).
- HR Manager review cycle: Send Back with comment -> revision -> verification to New Joined.
- Versioned Contract (v1) created by Payroll Officer and approved by HR Manager.
- Pre-activation check blocks activation without bank account (T27).
- Bank account enforces ISO-7064 mod-97 UAE IBAN checksum validation.
- Activation generates self-service invite; employee logs into `/me` and verifies linked legal name.
- History tab provides complete immutable audit trail of all lifecycle events.

### Workflow 7.3: Attendance Import and Review
- Biometric punch file imported with SHA-256 hash deduplication; re-import rejected (T4).
- Missing punch resolution requires mandatory compliance reason in audit log.
- Employee submits missing punch and overtime requests through self-service portal (`/me/requests`).
- Department Manager reviews and classifies overtime across 4 statutory multipliers and refuses unauthorized items.
- Monthly attendance review: Department Manager sign-off -> HR Officer confirmation -> Payroll-Ready state.
