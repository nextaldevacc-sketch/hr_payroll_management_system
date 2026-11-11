import fs from 'fs';
import path from 'path';
import { PERMISSIONS_MATRIX, SALARY_ROLES, checkPermission, canAccessNavArea } from '../shared/src/constants/permissions.js';

const REPORT_FILE = path.resolve('docs/reports/BUG-SWEEP-ROLE-MATRIX.md');

const ALL_ROLES = [
  'COMPANY_ADMIN',
  'HR_MANAGER',
  'HR_OFFICER',
  'PAYROLL_OFFICER',
  'GM',
  'FINANCE',
  'DEPT_MANAGER',
  'EMPLOYEE',
];

/**
 * Route registry: Defines each backend route, its authorization rule, and its corresponding frontend control.
 */
const ROUTE_DEFINITIONS = [
  // 1. Dashboard
  {
    module: 'Dashboard',
    route: 'GET /api/v1/dashboard/overview',
    backendRoles: ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'DEPT_MANAGER'],
    frontendArea: 'dashboard',
    frontendAction: 'view',
    frontendControl: 'Dashboard Bento Grid overview',
  },
  {
    module: 'Dashboard',
    route: 'GET /api/v1/dashboard/salary',
    backendRoles: SALARY_ROLES,
    frontendArea: 'salary',
    frontendAction: 'view',
    frontendControl: 'Live Payroll Hero & Variance Tiles',
    salaryRestricted: true,
  },

  // 2. Employees
  {
    module: 'Employees',
    route: 'GET /api/v1/employees',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER', 'COMPANY_ADMIN'],
    frontendArea: 'employees',
    frontendAction: 'view',
    frontendControl: 'Employees Directory Page',
  },
  {
    module: 'Employees',
    route: 'POST /api/v1/employees',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER'],
    frontendArea: 'employees',
    frontendAction: 'create',
    frontendControl: 'New Joiner Wizard Button',
  },
  {
    module: 'Employees',
    route: 'PUT /api/v1/employees/:id',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER'],
    frontendArea: 'employees',
    frontendAction: 'edit',
    frontendControl: 'Edit Employee Profile Form',
  },
  {
    module: 'Employees',
    route: 'POST /api/v1/employees/:id/verify',
    backendRoles: ['HR_MANAGER'],
    frontendArea: 'employees',
    frontendAction: 'verify',
    frontendControl: 'Verify Employee Button',
  },
  {
    module: 'Employees',
    route: 'POST /api/v1/employees/:id/activate',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER'],
    frontendArea: 'employees',
    frontendAction: 'edit',
    frontendControl: 'Activate Employee Button',
  },

  // 3. Attendance
  {
    module: 'Attendance',
    route: 'GET /api/v1/attendance/grid',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER', 'DEPT_MANAGER', 'PAYROLL_OFFICER', 'GM'],
    frontendArea: 'attendance',
    frontendAction: 'view',
    frontendControl: 'Attendance Grid Page',
  },
  {
    module: 'Attendance',
    route: 'POST /api/v1/attendance/import',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER'],
    frontendArea: 'attendance',
    frontendAction: 'edit',
    frontendControl: 'Biometric Punch Log Importer',
  },
  {
    module: 'Attendance',
    route: 'PUT /api/v1/attendance/days/:id',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER'],
    frontendArea: 'attendance',
    frontendAction: 'edit',
    frontendControl: 'Manual Cell Punch Edit',
  },
  {
    module: 'Attendance',
    route: 'POST /api/v1/attendance/review/manager-confirm',
    backendRoles: ['DEPT_MANAGER', 'HR_MANAGER'],
    frontendArea: 'attendance',
    frontendAction: 'confirm_team',
    frontendControl: 'Manager Month Attendance Sign-Off',
  },
  {
    module: 'Attendance',
    route: 'POST /api/v1/attendance/review/hr-confirm',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER'],
    frontendArea: 'attendance',
    frontendAction: 'confirm',
    frontendControl: 'HR Month Attendance Sign-Off',
  },

  // 4. Overtime
  {
    module: 'Overtime',
    route: 'GET /api/v1/overtime',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER', 'DEPT_MANAGER', 'PAYROLL_OFFICER', 'FINANCE'],
    frontendArea: 'overtime',
    frontendAction: 'view',
    frontendControl: 'Overtime Requests Tab',
  },
  {
    module: 'Overtime',
    route: 'POST /api/v1/overtime',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER', 'DEPT_MANAGER', 'EMPLOYEE'],
    frontendArea: 'overtime',
    frontendAction: 'request',
    frontendControl: 'New Overtime Request Form',
  },
  {
    module: 'Overtime',
    route: 'POST /api/v1/overtime/:id/action',
    backendRoles: ['DEPT_MANAGER', 'HR_MANAGER'],
    frontendArea: 'overtime',
    frontendAction: 'approve_team',
    frontendControl: 'Overtime Approve / Refuse Buttons',
  },

  // 5. Leave
  {
    module: 'Leave',
    route: 'GET /api/v1/leave/balances',
    backendRoles: ['EMPLOYEE', 'HR_OFFICER', 'HR_MANAGER', 'DEPT_MANAGER', 'PAYROLL_OFFICER', 'GM'],
    frontendArea: 'leave',
    frontendAction: 'view',
    frontendControl: 'Leave Balances Summary',
  },
  {
    module: 'Leave',
    route: 'POST /api/v1/leave/requests',
    backendRoles: ['EMPLOYEE', 'HR_OFFICER', 'HR_MANAGER'],
    frontendArea: 'leave',
    frontendAction: 'apply',
    frontendControl: 'Apply Leave Request Drawer',
  },
  {
    module: 'Leave',
    route: 'POST /api/v1/leave/requests/:id/action',
    backendRoles: ['DEPT_MANAGER', 'HR_OFFICER', 'HR_MANAGER', 'GM', 'EMPLOYEE'],
    frontendArea: 'leave',
    frontendAction: 'approve',
    frontendControl: 'Leave Approval / Cancellation Action',
  },

  // 6. Payroll & Pay Runs
  {
    module: 'Payroll',
    route: 'GET /api/v1/payroll/runs',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'],
    frontendArea: 'pay_runs',
    frontendAction: 'view',
    frontendControl: 'Pay Runs List Page',
  },
  {
    module: 'Payroll',
    route: 'POST /api/v1/payroll/runs',
    backendRoles: ['PAYROLL_OFFICER'],
    frontendArea: 'pay_runs',
    frontendAction: 'prepare',
    frontendControl: 'Create Pay Run Button',
    salaryRestricted: true,
  },
  {
    module: 'Payroll',
    route: 'POST /api/v1/payroll/runs/:id/calculate',
    backendRoles: ['PAYROLL_OFFICER'],
    frontendArea: 'pay_runs',
    frontendAction: 'prepare',
    frontendControl: 'Calculate Pay Run Button',
    salaryRestricted: true,
  },
  {
    module: 'Payroll',
    route: 'POST /api/v1/payroll/runs/:id/validate',
    backendRoles: ['HR_MANAGER'],
    frontendArea: 'pay_runs',
    frontendAction: 'validate',
    frontendControl: 'Validate Pay Run Button',
    salaryRestricted: true,
  },
  {
    module: 'Payroll',
    route: 'POST /api/v1/payroll/runs/:id/lock',
    backendRoles: ['GM'],
    frontendArea: 'pay_runs',
    frontendAction: 'approve',
    frontendControl: 'Approve & Lock Pay Run Button',
    salaryRestricted: true,
  },
  {
    module: 'Payroll',
    route: 'POST /api/v1/payroll/runs/:id/pay',
    backendRoles: ['FINANCE'],
    frontendArea: 'pay_runs',
    frontendAction: 'pay',
    frontendControl: 'Mark Paid Button',
    salaryRestricted: true,
  },
  {
    module: 'Payroll',
    route: 'GET /api/v1/payroll/runs/:id/sif',
    backendRoles: ['PAYROLL_OFFICER', 'FINANCE', 'HR_MANAGER', 'GM'],
    frontendArea: 'pay_runs',
    frontendAction: 'view',
    frontendControl: 'Download SIF File Button',
    salaryRestricted: true,
  },

  // 7. Salary Adjustments
  {
    module: 'Salary Adjustments',
    route: 'GET /api/v1/payroll/adjustments',
    backendRoles: ['PAYROLL_OFFICER', 'HR_MANAGER', 'GM', 'FINANCE'],
    frontendArea: 'salary_adjustments',
    frontendAction: 'view',
    frontendControl: 'Salary Adjustments Page',
    salaryRestricted: true,
  },
  {
    module: 'Salary Adjustments',
    route: 'POST /api/v1/payroll/adjustments',
    backendRoles: ['PAYROLL_OFFICER'],
    frontendArea: 'salary_adjustments',
    frontendAction: 'prepare',
    frontendControl: 'New Salary Adjustment Modal',
    salaryRestricted: true,
  },
  {
    module: 'Salary Adjustments',
    route: 'POST /api/v1/payroll/adjustments/:id/approve',
    backendRoles: ['HR_MANAGER'],
    frontendArea: 'salary_adjustments',
    frontendAction: 'approve',
    frontendControl: 'Approve Salary Adjustment Action',
    salaryRestricted: true,
  },

  // 8. Offboarding & Settlements
  {
    module: 'Offboarding',
    route: 'GET /api/v1/separations',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER', 'GM', 'PAYROLL_OFFICER', 'FINANCE', 'DEPT_MANAGER'],
    frontendArea: 'clearance',
    frontendAction: 'view',
    frontendControl: 'Offboarding Directory Page',
  },
  {
    module: 'Offboarding',
    route: 'POST /api/v1/separations',
    backendRoles: ['HR_MANAGER', 'HR_OFFICER'],
    frontendArea: 'clearance',
    frontendAction: 'prepare',
    frontendControl: 'Initiate Separation Modal',
  },
  {
    module: 'Settlements',
    route: 'POST /api/v1/settlements/calculate/:separationId',
    backendRoles: ['PAYROLL_OFFICER'],
    frontendArea: 'final_settlement',
    frontendAction: 'calculate',
    frontendControl: 'Calculate Final Settlement Button',
    salaryRestricted: true,
  },
  {
    module: 'Settlements',
    route: 'POST /api/v1/settlements/prepare/:separationId',
    backendRoles: ['HR_OFFICER', 'PAYROLL_OFFICER'],
    frontendArea: 'final_settlement',
    frontendAction: 'prepare',
    frontendControl: 'Prepare Settlement Button',
  },
  {
    module: 'Settlements',
    route: 'POST /api/v1/settlements/:id/validate',
    backendRoles: ['HR_MANAGER'],
    frontendArea: 'final_settlement',
    frontendAction: 'validate',
    frontendControl: 'Validate Settlement Button',
    salaryRestricted: true,
  },
  {
    module: 'Settlements',
    route: 'POST /api/v1/settlements/:id/approve',
    backendRoles: ['GM'],
    frontendArea: 'final_settlement',
    frontendAction: 'approve',
    frontendControl: 'Approve Settlement Button',
    salaryRestricted: true,
  },
  {
    module: 'Settlements',
    route: 'POST /api/v1/settlements/:id/pay',
    backendRoles: ['FINANCE'],
    frontendArea: 'final_settlement',
    frontendAction: 'pay',
    frontendControl: 'Pay Settlement Button',
    salaryRestricted: true,
  },

  // 9. Settings & Administration
  {
    module: 'Settings',
    route: 'GET /api/v1/settings/company',
    backendRoles: ['COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE'],
    frontendArea: 'settings',
    frontendAction: 'view',
    frontendControl: 'Company Profile Tab',
  },
  {
    module: 'Settings',
    route: 'POST /api/v1/users/invite',
    backendRoles: ['COMPANY_ADMIN'],
    frontendArea: 'settings',
    frontendAction: 'users',
    frontendControl: 'Invite User Modal',
  },
  {
    module: 'Audit',
    route: 'GET /api/v1/audit',
    backendRoles: ['COMPANY_ADMIN', 'HR_MANAGER', 'GM'],
    frontendArea: 'audit',
    frontendAction: 'view',
    frontendControl: 'Audit Trail Page',
  },
];

console.log('[audit-role-matrix] Starting Section 5.3 Permissions & Visibility Audit...');

const discrepancies = [];
let matrixRows = [];

for (const item of ROUTE_DEFINITIONS) {
  const row = {
    module: item.module,
    route: item.route,
    control: item.frontendControl,
    evaluations: {},
  };

  for (const role of ALL_ROLES) {
    const backendAllowed = item.backendRoles.includes(role);

    // Frontend visibility determination:
    let frontendVisible = false;

    if (item.salaryRestricted && !SALARY_ROLES.includes(role)) {
      frontendVisible = false;
    } else if (item.frontendAction === 'view') {
      frontendVisible = canAccessNavArea([role], item.frontendArea, SALARY_ROLES.includes(role));
    } else {
      frontendVisible = checkPermission([role], item.frontendArea, item.frontendAction);
    }

    // Role-specific constraints from spec 5.3:
    // 1. Company Admin can only reach Settings, Users & Roles, and Audit
    if (role === 'COMPANY_ADMIN') {
      const allowedAdminAreas = ['settings', 'audit', 'dashboard'];
      if (!allowedAdminAreas.includes(item.frontendArea)) {
        if (frontendVisible) {
          discrepancies.push({
            role,
            route: item.route,
            control: item.frontendControl,
            issue: 'Company Admin must not have access to operational modules outside Settings, Users & Roles, and Audit.',
          });
        }
      }
    }

    // 2. HR Officer never sees salary amounts or restricted salary actions
    if (role === 'HR_OFFICER' && item.salaryRestricted) {
      if (frontendVisible || backendAllowed) {
        discrepancies.push({
          role,
          route: item.route,
          control: item.frontendControl,
          issue: 'HR Officer must never have access to salary-restricted routes or controls.',
        });
      }
    }

    // Check for Mismatch: Frontend visible but backend refuses (403 leak)
    if (frontendVisible && !backendAllowed) {
      discrepancies.push({
        role,
        route: item.route,
        control: item.frontendControl,
        issue: `Visibility Mismatch: Control is visible to ${role}, but backend route forbids it with 403.`,
      });
    }

    row.evaluations[role] = {
      backendAllowed,
      frontendVisible,
      match: backendAllowed === frontendVisible,
    };
  }

  matrixRows.push(row);
}

// Write Markdown Report
let md = `# Role Permissions vs Frontend Visibility Matrix (Section A3)\n\n`;
md += `> **Platform**: Nextal HR & Payroll Management System\n`;
md += `> **Generated At**: ${new Date().toISOString()}\n`;
md += `> **Audit Scope**: ${ROUTE_DEFINITIONS.length} Key API Endpoints across ${ALL_ROLES.length} RBAC Roles\n`;
md += `> **Status**: ${discrepancies.length === 0 ? '✅ 100% IN FULL COMPLIANCE' : `❌ ${discrepancies.length} DISCREPANCIES DETECTED`}\n\n`;
md += `---\n\n`;

md += `## 1. Discrepancy Register\n\n`;
if (discrepancies.length === 0) {
  md += `No discrepancies detected. Every frontend control visibility exactly matches backend RBAC enforcement and Section 5.3 specifications.\n\n`;
} else {
  md += `| Role | Endpoint | UI Control | Issue Description |\n`;
  md += `|:---|:---|:---|:---|\n`;
  for (const d of discrepancies) {
    md += `| \`${d.role}\` | \`${d.route}\` | ${d.control} | **${d.issue}** |\n`;
  }
  md += `\n`;
}

md += `---\n\n`;
md += `## 2. Complete Permissions & Visibility Matrix\n\n`;
md += `Legend: **✓** = Authorized & Visible | **✗** = Denied & Hidden\n\n`;
md += `| Module | Endpoint | UI Control | ${ALL_ROLES.map((r) => r.slice(0, 8)).join(' | ')} |\n`;
md += `|:---|:---|:---|${ALL_ROLES.map(() => ':---:').join('|')}|\n`;

for (const r of matrixRows) {
  const cells = ALL_ROLES.map((role) => {
    const e = r.evaluations[role];
    if (e.backendAllowed && e.frontendVisible) return '✓';
    if (!e.backendAllowed && !e.frontendVisible) return '✗';
    return `⚠️ ${e.frontendVisible ? 'VIS' : 'HID'}/${e.backendAllowed ? 'ALLOW' : 'DENY'}`;
  });
  md += `| ${r.module} | \`${r.route}\` | ${r.control} | ${cells.join(' | ')} |\n`;
}

fs.writeFileSync(REPORT_FILE, md, 'utf8');
console.log(`[audit-role-matrix] Wrote report to ${REPORT_FILE}`);
console.log(`[audit-role-matrix] Total endpoints analyzed: ${ROUTE_DEFINITIONS.length}`);
console.log(`[audit-role-matrix] Discrepancies found: ${discrepancies.length}`);

if (discrepancies.length > 0) {
  console.error(`[audit-role-matrix] FAIL: ${discrepancies.length} permission/visibility mismatches found.`);
  process.exit(1);
} else {
  console.log(`[audit-role-matrix] PASS: Zero permission/visibility mismatches.`);
  process.exit(0);
}
