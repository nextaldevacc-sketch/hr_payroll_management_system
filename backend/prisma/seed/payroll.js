/**
 * Seed Module: Payroll & Pay Runs
 */
export async function seedPayroll(prisma, {
  company1,
  visas1,
  seededEmployees,
  seededContracts,
  rulesMap1,
  demoUsersMap,
}) {
  console.log('Seeding Locked Pay Run for September 2026...');
  const userFinance1 = demoUsersMap['finance@gulftech.ae'];
  const userAdmin1 = demoUsersMap['admin@gulftech.ae'];
  const userHR1 = demoUsersMap['hr.mgr@gulftech.ae'];

  await prisma.pay_runs.create({
    data: {
      company_id: company1.id,
      company_visa_id: visas1.visa1_01.id,
      run_type: 'Regular',
      period_month: new Date('2026-09-01'),
      cutoff_date: new Date('2026-09-25'),
      status: 'Locked',
      locked_at: new Date('2026-09-28'),
      locked_by: userFinance1.id,
    },
  });

  // October 2026 Pay Run
  console.log('Seeding October 2026 Pay Run, Payslips & Payslip Lines...');
  const payRun1 = await prisma.pay_runs.create({
    data: {
      company_id: company1.id,
      company_visa_id: visas1.visa1_01.id,
      run_type: 'Regular',
      period_month: new Date('2026-10-01'),
      cutoff_date: new Date('2026-10-25'),
      status: 'Calculated',
      calculated_at: new Date('2026-10-25T14:30:00Z'),
    },
  });

  // Pay run issues
  await prisma.pay_run_issues.createMany({
    data: [
      {
        company_id: company1.id,
        pay_run_id: payRun1.id,
        employee_id: seededEmployees[40].id,
        issue_code: 'MISSING_IBAN',
        message: 'Employee has no IBAN on primary bank account',
        severity: 'Blocking',
      },
      {
        company_id: company1.id,
        pay_run_id: payRun1.id,
        employee_id: seededEmployees[41].id,
        issue_code: 'MISSING_ROUTING_CODE',
        message: 'Bank routing code missing for SIF file export',
        severity: 'Blocking',
      },
    ],
  });

  // Payslips and lines for all 42 employees
  for (let idx = 0; idx < 42; idx++) {
    const emp = seededEmployees[idx];
    const contract = seededContracts[idx];
    const basic = Number(contract.basic);

    const linesToCreate = [];

    // Basic
    linesToCreate.push({
      salary_rule_id: rulesMap1['BASIC'].id,
      code: 'BASIC',
      name: 'Basic Salary',
      category: 'Basic',
      amount: basic,
    });

    // Housing
    const housing = Number(contract.housing || 0);
    linesToCreate.push({
      salary_rule_id: rulesMap1['HRA'].id,
      code: 'HRA',
      name: 'Housing Allowance',
      category: 'Allowance',
      amount: housing,
    });

    // Transport
    const transport = Number(contract.transport || 0);
    linesToCreate.push({
      salary_rule_id: rulesMap1['TRA'].id,
      code: 'TRA',
      name: 'Transport Allowance',
      category: 'Allowance',
      amount: transport,
    });

    // Other
    const other = Number(contract.other_allowances || 0);
    linesToCreate.push({
      salary_rule_id: rulesMap1['OTH'].id,
      code: 'OTH',
      name: 'Other Allowance',
      category: 'Allowance',
      amount: other,
    });

    // Overtime
    if (idx === 0) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['OT_NORMAL'].id,
        code: 'OT_NORMAL',
        name: 'Normal Overtime (1.25x)',
        category: 'Addition',
        amount: 4200.00,
      });
    } else if (idx === 1) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['OT_NIGHT'].id,
        code: 'OT_NIGHT',
        name: 'Night Overtime (1.50x)',
        category: 'Addition',
        amount: 2016.00,
      });
    } else if (idx === 2) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['OT_REST'].id,
        code: 'OT_REST',
        name: 'Rest Day Overtime (1.50x)',
        category: 'Addition',
        amount: 1008.00,
      });
    } else if (idx === 3) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['OT_REST'].id,
        code: 'OT_REST',
        name: 'Holiday Overtime (1.50x)',
        category: 'Addition',
        amount: 1196.50,
      });
    }

    const computedGross = linesToCreate
      .filter((l) => ['Basic', 'Allowance', 'Addition'].includes(l.category))
      .reduce((sum, l) => sum + l.amount, 0);

    linesToCreate.push({
      salary_rule_id: rulesMap1['GROSS'].id,
      code: 'GROSS',
      name: 'Gross Salary',
      category: 'Gross',
      amount: computedGross,
    });

    // Deductions: Loans
    if (idx === 5) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LOAN'].id,
        code: 'LOAN',
        name: 'Loan Recovery',
        category: 'Deduction',
        amount: 2000.00,
      });
    } else if (idx === 6) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LOAN'].id,
        code: 'LOAN',
        name: 'Loan Recovery',
        category: 'Deduction',
        amount: 1500.00,
      });
    } else if (idx === 7) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LOAN'].id,
        code: 'LOAN',
        name: 'Loan Recovery',
        category: 'Deduction',
        amount: 1000.00,
      });
    }

    // Deductions: Absence
    if (idx === 8 || idx === 9) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['ABS'].id,
        code: 'ABS',
        name: 'Absence / Unpaid Leave Deduction',
        category: 'Deduction',
        amount: 1590.00,
      });
    }

    // Deductions: Late penalties
    if (idx === 10) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LATE'].id,
        code: 'LATE',
        name: 'Late Penalty Deduction',
        category: 'Deduction',
        amount: 250.00,
      });
    } else if (idx === 11) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['LATE'].id,
        code: 'LATE',
        name: 'Late Penalty Deduction',
        category: 'Deduction',
        amount: 200.00,
      });
    }

    // Deductions: Salary advance
    if (idx === 12) {
      linesToCreate.push({
        salary_rule_id: rulesMap1['ADV'].id,
        code: 'ADV',
        name: 'Salary Advance Recovery',
        category: 'Deduction',
        amount: 800.00,
      });
    }

    const computedDeductions = linesToCreate
      .filter((l) => l.category === 'Deduction')
      .reduce((sum, l) => sum + l.amount, 0);

    const computedNet = computedGross - computedDeductions;

    linesToCreate.push({
      salary_rule_id: rulesMap1['NET'].id,
      code: 'NET',
      name: 'Net Pay to WPS',
      category: 'Net',
      amount: computedNet,
    });

    const payslip = await prisma.payslips.create({
      data: {
        company_id: company1.id,
        pay_run_id: payRun1.id,
        employee_id: emp.id,
        contract_id: contract.id,
        period_from: new Date('2026-10-01'),
        period_to: new Date('2026-10-31'),
        paid_days: 30.00,
        worked_days: 22.00,
        basic: basic,
        gross: computedGross,
        total_deductions: computedDeductions,
        net: computedNet,
        status: 'Calculated',
      },
    });

    for (const line of linesToCreate) {
      await prisma.payslip_lines.create({
        data: {
          company_id: company1.id,
          payslip_id: payslip.id,
          salary_rule_id: line.salary_rule_id,
          code: line.code,
          name: line.name,
          amount: line.amount,
        },
      });
    }
  }

  // Initial audit logs
  console.log('Seeding initial audit logs...');
  await prisma.audit_logs.create({
    data: {
      company_id: company1.id,
      user_id: userAdmin1.id,
      action: 'CREATE',
      table_name: 'companies',
      record_id: company1.id,
      new_values: { name: company1.name, trade_license_no: company1.trade_license_no },
      ip_address: '127.0.0.1',
    },
  });

  await prisma.audit_logs.create({
    data: {
      company_id: company1.id,
      user_id: userHR1.id,
      action: 'CALCULATE',
      table_name: 'pay_runs',
      record_id: payRun1.id,
      new_values: { period_month: '2026-10-01', status: 'Calculated' },
      ip_address: '127.0.0.1',
    },
  });

  return {
    payRun1,
  };
}

export default seedPayroll;
