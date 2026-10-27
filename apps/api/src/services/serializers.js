/**
 * Nextal Resource Serializers & Allowlist Enforcement
 *
 * Implements strict per-resource allowlists for Phase 2:
 * Salary & Bank data is strictly restricted to viewers holding one of the 4 Salary Roles:
 * - HR_MANAGER
 * - PAYROLL_OFFICER
 * - GM
 * - FINANCE
 *
 * All other roles (EMPLOYEE, DEPT_MANAGER, HR_OFFICER, and COMPANY_ADMIN without a salary role,
 * as well as PLATFORM_ADMIN) MUST NEVER see any salary or bank figures.
 */

export const SALARY_ROLES = ['HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'];

/**
 * Determine if a viewer has salary access per Section 5.3
 */
export function hasSalaryAccess(viewer) {
  if (!viewer) return false;
  if (viewer.isPlatformAdmin) return false;
  const roles = viewer.roles || [];
  return roles.some((r) => SALARY_ROLES.includes(r));
}

/**
 * All forbidden salary, monetary and bank identifier keys
 */
export const FORBIDDEN_SALARY_BANK_KEYS = new Set([
  'basic',
  'basic_salary',
  'housing',
  'housing_allowance',
  'transport',
  'transport_allowance',
  'other_allowances',
  'gross',
  'gross_salary',
  'net',
  'net_salary',
  'total_deductions',
  'earning_total',
  'deduction_total',
  'salary_split_pct',
  'payslip_lines',
  'lines',
  'salary_rules',
  'salary_adjustments',
  'wage',
  'salary',
  'rate',
  'hourly_rate',
  'overtime_cost',
  'cost',
  'amount',
  'total_amount',
  'monthly_amount',
  'adjustment_amount',
  'loan_balance',
  'advance_balance',
  'balance',
  'total_net',
  'total_gross',
  'variance',
  'variance_pct',
  'variance_amount',
  'variance_figures',
  'gratuity',
  'gratuity_amount',
  'leave_encashment',
  'leave_encashment_amount',
  'encashment_amount',
  'final_settlement',
  'settlement_amount',
  'net_settlement',
  'iban',
  'account_number',
  'bank_account_number',
]);

/**
 * Deep scan an object or array to ensure no forbidden salary/bank keys appear.
 * Throws an Error if any forbidden key is detected at any depth.
 */
export function deepScanForSalaryBankData(data, path = '') {
  if (!data || typeof data !== 'object') return;
  if (data instanceof Date) return;

  if (Array.isArray(data)) {
    data.forEach((item, index) => deepScanForSalaryBankData(item, `${path}[${index}]`));
    return;
  }

  for (const [key, val] of Object.entries(data)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_SALARY_BANK_KEYS.has(key)) {
      throw new Error(`Security Violation: Forbidden salary/bank field '${currentPath}' detected in payload`);
    }
    if (val && typeof val === 'object') {
      deepScanForSalaryBankData(val, currentPath);
    }
  }
}

/**
 * Recursive sanitizer that strips any key in FORBIDDEN_SALARY_BANK_KEYS
 */
export function deepSanitize(data) {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data;

  if (Array.isArray(data)) {
    return data.map((item) => deepSanitize(item));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (FORBIDDEN_SALARY_BANK_KEYS.has(key)) {
        continue;
      }
      sanitized[key] = deepSanitize(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Serialize Contract: Include monetary figures ONLY for salary viewers
 */
export function serializeContract(contract, viewer) {
  if (!contract) return null;
  const canSeeSalary = hasSalaryAccess(viewer);

  // Base metadata (non-salary)
  const base = {
    id: contract.id,
    contract_type: contract.contract_type,
    start_date: contract.start_date,
    end_date: contract.end_date,
    probation_end: contract.probation_end,
    notice_days_employee: contract.notice_days_employee,
    notice_days_employer: contract.notice_days_employer,
    status: contract.status,
    created_at: contract.created_at,
    updated_at: contract.updated_at,
  };

  if (!canSeeSalary) {
    return base;
  }

  // Allow salary fields for authorized roles
  return {
    ...base,
    basic: contract.basic,
    housing: contract.housing,
    transport: contract.transport,
    other_allowances: contract.other_allowances,
    gross: contract.gross,
    structure_id: contract.structure_id,
  };
}

/**
 * Serialize Bank Account: Include IBAN and bank details ONLY for salary viewers
 */
export function serializeBankAccount(bankAccount, viewer) {
  if (!bankAccount) return null;
  const canSeeSalary = hasSalaryAccess(viewer);

  // Section 6: "salary and bank tabs hidden"
  if (!canSeeSalary) {
    return null;
  }

  return {
    id: bankAccount.id,
    bank_name: bankAccount.bank_name,
    iban: bankAccount.iban,
    routing_code: bankAccount.routing_code,
    salary_split_pct: bankAccount.salary_split_pct,
    is_primary: bankAccount.is_primary,
    is_active: bankAccount.is_active,
    created_at: bankAccount.created_at,
    updated_at: bankAccount.updated_at,
  };
}

/**
 * Serialize Employee: Strict allowlist
 */
export function serializeEmployee(emp, viewer) {
  if (!emp) return null;
  const canSeeSalary = hasSalaryAccess(viewer);

  // Strict Allowlist of non-salary employee profile attributes
  const serialized = {
    id: emp.id,
    company_id: emp.company_id,
    employee_code: emp.employee_code,
    name: emp.name,
    arabic_name: emp.arabic_name,
    work_email: emp.work_email,
    mobile_phone: emp.mobile_phone,
    gender: emp.gender,
    nationality: emp.nationality,
    is_uae_national: emp.is_uae_national,
    marital_status: emp.marital_status,
    hire_date: emp.hire_date,
    status: emp.status,
    department_id: emp.contracts?.[0]?.department_id || emp.department_id || null,
    department: emp.department
      ? {
          id: emp.department.id,
          name: emp.department.name,
          name_ar: emp.department.name_ar,
        }
      : emp.contracts?.[0]?.department
      ? {
          id: emp.contracts[0].department.id,
          name: emp.contracts[0].department.name,
        }
      : null,
    job_id: emp.contracts?.[0]?.job_id || emp.job_id || null,
    job: emp.job
      ? {
          id: emp.job.id,
          title: emp.job.title,
          title_ar: emp.job.title_ar,
        }
      : emp.contracts?.[0]?.job
      ? {
          id: emp.contracts[0].job.id,
          title: emp.contracts[0].job.title,
        }
      : null,
    branch_id: emp.branch_id,
    branch: emp.branch
      ? {
          id: emp.branch.id,
          name: emp.branch.name,
          emirate: emp.branch.emirate,
        }
      : null,
    company_visa_id: emp.company_visa_id,
    company_visa: emp.company_visa
      ? {
          id: emp.company_visa.id,
          name: emp.company_visa.name,
        }
      : null,
    manager_id: emp.manager_id,
    manager: emp.manager
      ? {
          id: emp.manager.id,
          name: emp.manager.name,
          employee_code: emp.manager.employee_code,
        }
      : null,
    avatar_url: emp.avatar_url,
    created_at: emp.created_at,
    updated_at: emp.updated_at,
  };

  // Contracts: serialized via allowlist
  if (emp.contracts && Array.isArray(emp.contracts)) {
    if (canSeeSalary) {
      serialized.contracts = emp.contracts.map((c) => serializeContract(c, viewer)).filter(Boolean);
    }
    // If not canSeeSalary, contracts array is NOT included or contains only non-monetary metadata
  }

  // Bank accounts: Section 6 "salary and bank tabs hidden"
  if (emp.bank_accounts && Array.isArray(emp.bank_accounts)) {
    if (canSeeSalary) {
      serialized.bank_accounts = emp.bank_accounts.map((b) => serializeBankAccount(b, viewer)).filter(Boolean);
    }
    // If not canSeeSalary, bank_accounts is omitted entirely
  }

  // Final defense check: if viewer cannot see salary, run deepSanitize
  return canSeeSalary ? serialized : deepSanitize(serialized);
}

/**
 * Serialize Overtime Request: non-salary roles see hours and status, never rate or amount
 */
export function serializeOvertimeRequest(ot, viewer) {
  if (!ot) return null;
  const canSeeSalary = hasSalaryAccess(viewer);

  const base = {
    id: ot.id,
    company_id: ot.company_id,
    employee_id: ot.employee_id,
    work_date: ot.work_date,
    hours: ot.hours,
    ot_type: ot.ot_type,
    source: ot.source,
    compensation: ot.compensation,
    status: ot.status,
    created_at: ot.created_at,
    employee: ot.employee
      ? {
          id: ot.employee.id,
          name: ot.employee.name,
          employee_code: ot.employee.employee_code,
        }
      : null,
  };

  if (!canSeeSalary) {
    return base;
  }

  return {
    ...base,
    rate: ot.rate,
    amount: ot.amount,
  };
}

/**
 * Serialize Payslip: only allowed for viewers with salary access OR the owning employee
 */
export function serializePayslip(payslip, viewer) {
  if (!payslip) return null;
  const isOwner = viewer?.employeeId && viewer.employeeId === payslip.employee_id;
  const canSeeSalary = hasSalaryAccess(viewer) || isOwner;

  if (!canSeeSalary) {
    return null;
  }

  return {
    id: payslip.id,
    company_id: payslip.company_id,
    pay_run_id: payslip.pay_run_id,
    employee_id: payslip.employee_id,
    period_from: payslip.period_from,
    period_to: payslip.period_to,
    paid_days: payslip.paid_days,
    worked_days: payslip.worked_days,
    basic: payslip.basic,
    gross: payslip.gross,
    total_deductions: payslip.total_deductions,
    net: payslip.net,
    status: payslip.status,
    lines: payslip.lines
      ? payslip.lines.map((l) => ({
          id: l.id,
          code: l.code,
          name: l.name,
          category: l.category,
          amount: l.amount,
        }))
      : [],
    employee: payslip.employee
      ? {
          id: payslip.employee.id,
          name: payslip.employee.name,
          employee_code: payslip.employee.employee_code,
        }
      : null,
  };
}

/**
 * Serialize Pay Run
 */
export function serializePayRun(payRun, viewer) {
  if (!payRun) return null;
  const canSeeSalary = hasSalaryAccess(viewer);

  const base = {
    id: payRun.id,
    company_id: payRun.company_id,
    company_visa_id: payRun.company_visa_id,
    run_type: payRun.run_type,
    period_month: payRun.period_month,
    cutoff_date: payRun.cutoff_date,
    status: payRun.status,
    calculated_at: payRun.calculated_at,
    validated_at: payRun.validated_at,
    locked_at: payRun.locked_at,
    created_at: payRun.created_at,
  };

  if (!canSeeSalary) {
    return base;
  }

  return {
    ...base,
    total_gross: payRun.total_gross,
    total_net: payRun.total_net,
    variance_pct: payRun.variance_pct,
    variance_amount: payRun.variance_amount,
  };
}
