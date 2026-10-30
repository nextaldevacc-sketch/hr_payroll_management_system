import fs from 'node:fs';
import path from 'node:path';
import prisma from '../backend/src/lib/prisma.js';

async function run() {
  const company = await prisma.$base().companies.findFirst({
    where: { name: 'Gulf Tech Logistics LLC' },
  });
  if (!company) {
    throw new Error('Gulf Tech Logistics LLC not found');
  }

  // Fetch all 42 Gulf Tech employees
  const employees = await prisma.$base().employees.findMany({
    where: { company_id: company.id, employee_code: { startsWith: 'EMP-DXB-' } },
    include: {
      company_visa: true,
      contracts: {
        where: { status: 'Approved' },
        orderBy: { effective_date: 'desc' },
      },
    },
    orderBy: { employee_code: 'asc' },
  });

  // Fetch October 2026 payslips
  const payslips = await prisma.$base().payslips.findMany({
    where: {
      company_id: company.id,
      pay_run: { period_month: new Date('2026-10-01') },
    },
    include: {
      pay_run: { include: { company_visa: true } },
      lines: true,
      employee: true,
    },
  });

  const payslipMap = new Map();
  for (const ps of payslips) {
    payslipMap.set(ps.employee_id, ps);
  }

  // Fetch attendance days in October 2026
  const attendanceDays = await prisma.$base().attendance_days.findMany({
    where: {
      company_id: company.id,
      work_date: {
        gte: new Date('2026-10-01'),
        lte: new Date('2026-10-31'),
      },
    },
  });

  const attendanceMap = new Map();
  for (const ad of attendanceDays) {
    if (!attendanceMap.has(ad.employee_id)) {
      attendanceMap.set(ad.employee_id, []);
    }
    attendanceMap.get(ad.employee_id).push(ad);
  }

  const csvRows = [
    [
      'employee_code',
      'visa',
      'status',
      'joining_date',
      'contract gross',
      'month_days',
      'paid_days',
      'worked_days',
      'OT amount',
      'absence/unpaid deduction',
      'loan/adv',
      'GPSSA',
      'other deductions',
      'net',
      'net vs contract gross %',
      'expected_net',
      'match',
    ].join(','),
  ];

  const diffMoreThan5 = [];

  for (const emp of employees) {
    const contract = emp.contracts[0];
    const contractGross = Number(contract?.gross || 0);
    const ps = payslipMap.get(emp.id);
    const attList = attendanceMap.get(emp.id) || [];
    const workedDays = ps ? Number(ps.worked_days) : attList.filter(
      (a) => a.day_type === 'WorkDay' && (a.check_in || Number(a.worked_hours) > 0)
    ).length;

    if (!ps) {
      csvRows.push(
        [
          emp.employee_code,
          `"${emp.company_visa?.name || 'N/A'}"`,
          emp.status,
          emp.joining_date.toISOString().slice(0, 10),
          contractGross.toFixed(2),
          31,
          0,
          0,
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          '0.00',
          'N/A (Archived - Excluded)',
          '0.00',
          'EXCLUDED',
        ].join(',')
      );
      continue;
    }

    const lines = ps.lines || [];
    let otAmount = 0;
    let absDeduction = 0;
    let loanAdv = 0;
    let gpssa = 0;
    let otherDeductions = 0;

    for (const l of lines) {
      const amt = Number(l.amount);
      if (['OT_NORMAL', 'OT_NIGHT', 'OT_REST'].includes(l.code)) {
        otAmount += amt;
      } else if (['ABS', 'SICK_HALF', 'SICK_NONE', 'LATE'].includes(l.code)) {
        absDeduction += amt;
      } else if (['LOAN', 'ADV'].includes(l.code)) {
        loanAdv += amt;
      } else if (l.code === 'GPSSA_EE') {
        gpssa += amt;
      } else if (l.category === 'Deduction') {
        otherDeductions += amt;
      }
    }

    const net = Number(ps.net);
    const expectedNet = contractGross + otAmount - (absDeduction + loanAdv + gpssa + otherDeductions);
    const match = Math.abs(net - expectedNet) < 0.01 ? 'MATCH' : 'MISMATCH';
    const diffPct = contractGross > 0 ? ((net - contractGross) / contractGross) * 100 : 0;
    const diffPctStr = `${diffPct.toFixed(2)}%`;

    csvRows.push(
      [
        emp.employee_code,
        `"${emp.company_visa?.name || ps.pay_run?.company_visa?.name || 'N/A'}"`,
        emp.status,
        emp.joining_date.toISOString().slice(0, 10),
        contractGross.toFixed(2),
        ps.paid_days || 31,
        ps.paid_days || 31,
        workedDays,
        otAmount.toFixed(2),
        absDeduction.toFixed(2),
        loanAdv.toFixed(2),
        gpssa.toFixed(2),
        otherDeductions.toFixed(2),
        net.toFixed(2),
        `"${diffPctStr}"`,
        expectedNet.toFixed(2),
        match,
      ].join(',')
    );

    if (Math.abs(diffPct) > 5.0) {
      diffMoreThan5.push({
        code: emp.employee_code,
        name: emp.name,
        residency: emp.residency_type,
        contractGross: contractGross.toFixed(2),
        net: net.toFixed(2),
        diffPct: diffPctStr,
        ot: otAmount.toFixed(2),
        abs: absDeduction.toFixed(2),
        loan: loanAdv.toFixed(2),
        gpssa: gpssa.toFixed(2),
      });
    }
  }

  const outPath = path.resolve('docs/reports/october-payroll-check.csv');
  fs.writeFileSync(outPath, csvRows.join('\n'), 'utf8');
  console.log(`Saved: ${outPath} (${csvRows.length - 1} employee rows)`);

  console.log('\n--- October Payroll Sanity Diagnostic Summary ---');
  console.log(`Total Gulf Tech Employees Checked: ${employees.length}`);
  console.log(`October Payslips Generated: ${payslips.length}`);

  // Count per visa
  const visaCounts = {};
  for (const ps of payslips) {
    const vName = ps.pay_run.company_visa.name;
    visaCounts[vName] = (visaCounts[vName] || 0) + 1;
  }
  console.log('Employee count per visa in October pay runs:', visaCounts);

  console.log('\nEmployees whose net differs from contract gross by > 5%:');
  console.table(diffMoreThan5);
}

run().catch(console.error).finally(() => process.exit(0));

