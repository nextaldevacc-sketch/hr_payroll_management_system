import prisma from '../backend/src/lib/prisma.js';
import { executeRuleEngine } from '@nextal/shared';

async function run() {
  const comp = await prisma.$base().companies.findFirst({ where: { name: 'Gulf Tech Logistics LLC' } });
  const rules = await prisma.$base().salary_rules.findMany({
    where: { company_id: comp.id, is_active: true },
    orderBy: { sequence: 'asc' }
  });
  console.log('Rules:');
  for (const r of rules) {
    console.log(r.code, '| sequence:', r.sequence, '| formula:', r.formula);
  }

  // Now let's test executeRuleEngine for EMP-DXB-031
  const res = executeRuleEngine(rules, {
    basic: 3300,
    hra: 1650,
    tra: 275,
    oth: 275,
    paid_days: 31,
    month_days: 31,
    absent_days: 0,
    late_units: 0,
    sick_half_days: 0,
    sick_none_days: 0,
    ot_hours_normal: 0,
    ot_hours_night: 0,
    ot_hours_rest: 0,
    loan_instalment: 0,
    adv_instalment: 0,
    gpssa_salary: 0,
    is_legacy: false,
  });

  console.log('Result for 3300+1650+275+275:', res);
}

run().catch(console.error).finally(() => process.exit(0));

