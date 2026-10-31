# Department Manager User Guide

> **Role Code**: `DEPT_MANAGER`  
> **Target Audience**: Functional Heads, Engineering Leads, Operations Managers, Team Supervisors  
> **Default Demo Login**: `manager.ops@gulftech.ae` / `Nextal@2026!`

---

## 1. Overview & Responsibilities
The **Department Manager** (Line Manager) leads a specific organizational department or team. Their access is strictly scoped to direct and indirect team reports. They oversee daily attendance records, approve team leave applications, review overtime submissions, and complete operational clearance when a team member leaves.

### Key Capabilities:
- View team member profiles, shift assignments, and contact details.
- Review and approve team leave applications (up to 5 days).
- Monitor daily team attendance, missed punches, late arrivals, and early check-outs.
- Review and approve team overtime hours (weekday 125% and rest-day 150%) before monthly cutoff.
- Complete Department Clearance checklists during employee offboarding.

---

## 2. Navigation & Interface
- **Dashboard (`/`)**: Team-specific widget:
  - Team presence today (present, on leave, late, absent).
  - Pending team leave applications count.
  - Pending overtime approvals count.
- **My Team (`/employees`)**: Scoped directory displaying only employees assigned to the manager's department.
- **Attendance (`/attendance`)**: Monthly timecards, punch records, and overtime approval queue for team reports.
- **Leave (`/leave`)**: Team leave approvals queue and departmental leave planner calendar.
- **Offboarding (`/offboarding`)**: Operational clearance tasks assigned to the department.

---

## 3. Step-by-Step Workflows

### 3.1 Reviewing & Approving Team Leave Requests
1. Navigate to **Leave** (`/leave`).
2. The inbox displays pending leave requests submitted by direct reports.
3. Check:
   - Coverage: Ensure sufficient team coverage during the requested period using the **Team Calendar View**.
   - Balance: Confirm employee has adequate leave balance.
4. For requests **<= 5 days**: Click **Approve**. The request is finalized and deducted from the employee balance.
5. For requests **> 5 days**: Click **Endorse & Escalate**. The request moves to the General Manager for executive sign-off.

### 3.2 Monthly Team Attendance & Overtime Sign-off
1. Navigate to **Attendance** (`/attendance`) on or before the monthly cutoff (e.g. 24th/25th).
2. Filter by your department (e.g., `Operations`).
3. **Inspect Anomalies**:
   - Verify unapproved absences and follow up on missing punch reasons.
   - Adjust shift assignments or add manual punches for field staff if required.
4. **Approve Overtime**:
   - Review proposed overtime hours generated from punch records.
   - Confirm whether extra hours were authorized by operations.
   - Click **Approve Overtime**.
5. Click **Submit Department Attendance**. Notifies HR Manager that team review is complete.

### 3.3 Completing Departmental Clearance (Offboarding)
1. Navigate to **Offboarding** (`/offboarding`).
2. Open the clearance checklist for the resigning/terminated team member.
3. Locate the **Operations / Department Clearance** item:
   - Confirm project handover is complete.
   - Confirm client account reassignments.
   - Confirm team files, access keys, or specialized equipment are returned.
4. Mark item **Cleared**, attach handover notes, and sign off.
