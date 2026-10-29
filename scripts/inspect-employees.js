import prisma from '../backend/src/lib/prisma.js';

async function run() {
  const comp = await prisma.$base().companies.findFirst({ where: { name: 'Gulf Tech Logistics LLC' } });
  const emps = await prisma.$base().employees.findMany({
    where: { company_id: comp.id },
    include: { company_visa: true, contracts: true }
  });
  console.log('Total Gulf Tech employees:', emps.length);
  const byVisa = {};
  const byStatus = {};
  for (const e of emps) {
    const v = e.company_visa?.name || 'No Visa';
    byVisa[v] = (byVisa[v] || 0) + 1;
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    console.log(e.employee_code, e.name, '| Visa:', v, '| Status:', e.status, '| Joining:', e.joining_date.toISOString().slice(0, 10));
  }
  console.log('By Visa:', byVisa);
  console.log('By Status:', byStatus);

  // Check October pay runs
  const octRuns = await prisma.$base().pay_runs.findMany({
    where: { company_id: comp.id, period_month: new Date('2026-10-01') },
    include: { payslips: true, company_visa: true }
  });
  for (const r of octRuns) {
    console.log('Pay run:', r.id, r.company_visa.name, 'Payslips count:', r.payslips.length);
  }
}

run().catch(console.error).finally(() => process.exit(0));

