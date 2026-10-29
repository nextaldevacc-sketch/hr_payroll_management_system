import prisma from '../backend/src/lib/prisma.js';

async function run() {
  const comp = await prisma.$base().companies.findFirst({ where: { name: 'Gulf Tech Logistics LLC' } });
  const visa2 = await prisma.$base().company_visas.findFirst({ where: { company_id: comp.id, name: { contains: '02' } } });
  
  const emps = await prisma.$base().employees.findMany({
    where: { company_id: comp.id, company_visa_id: visa2.id },
    include: {
      contracts: { where: { status: 'Approved' } },
      overtime_requests: true,
      salary_adjustments: true,
      attendance_days: {
        where: { work_date: { gte: new Date('2026-10-01'), lte: new Date('2026-10-31') } }
      }
    }
  });

  console.log(`Visa 2 employees count: ${emps.length}`);
  let totalContractGross = 0;
  for (const e of emps) {
    const c = e.contracts[0];
    totalContractGross += Number(c?.gross || 0);
    console.log(`${e.employee_code} | Status: ${e.status} | Contract Gross: ${c?.gross} | Basic: ${c?.basic} | OT count: ${e.overtime_requests.length} | Adj count: ${e.salary_adjustments.length}`);
  }
  console.log(`Total Contract Gross for Active Visa 2 employees: ${totalContractGross}`);

  // Also check payslips for Visa 2 in October 2026
  const octRun = await prisma.$base().pay_runs.findFirst({
    where: { company_visa_id: visa2.id, period_month: new Date('2026-10-01') },
    include: {
      payslips: {
        include: { lines: true, employee: true }
      }
    }
  });

  if (octRun) {
    console.log(`October Run for Visa 2: status=${octRun.status}, total_net=${octRun.total_net}`);
    let sumNet = 0;
    for (const p of octRun.payslips) {
      sumNet += Number(p.net);
      console.log(`Payslip for ${p.employee.employee_code}: gross=${p.gross}, net=${p.net}, lines=${p.lines.map(l => `${l.code}:${l.amount}`).join(', ')}`);
    }
    console.log(`Sum of nets: ${sumNet}`);
  }
}

run().catch(console.error).finally(() => process.exit(0));

