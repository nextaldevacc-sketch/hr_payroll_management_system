import prisma from '../lib/prisma.js';

/**
 * Monthly Leave Accrual Job (Spec Section 7.4 & Phase 5 Requirement 9)
 *
 * Requirements:
 * - Monthly accrual per plan (e.g. 2.5 days/month for UAE statutory annual leave, or 2 days/mo between 6m and 1yr)
 * - Waiting period check (0 accrual during first 6 months)
 * - Yearly cap enforcement (max 30 days accrued per year)
 * - Carry-over with expiry
 * - Idempotent: Running twice in the same month does not double-accrue!
 *
 * @param {Object} options
 * @param {string} [options.companyId] - Specific company or null for all companies
 * @param {Date|string} [options.targetDate=new Date()] - Reference run date
 * @returns {Promise<{ processed: number, accrued: number, skippedIdempotent: number, skippedProbation: number }>}
 */
export async function runMonthlyAccrualJob({ companyId = null, targetDate = new Date() } = {}) {
  const date = new Date(targetDate);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const baseClient = prisma.$base();
  const companiesWhere = companyId ? { id: companyId, status: 'Active' } : { status: 'Active' };
  const companies = await baseClient.companies.findMany({ where: companiesWhere });

  let processedCount = 0;
  let accruedCount = 0;
  let skippedIdempotentCount = 0;
  let skippedProbationCount = 0;

  for (const comp of companies) {
    const scoped = prisma.$scoped(comp.id);

    // Fetch active annual accrual plans
    const plans = await scoped.accrual_plans.findMany({
      where: { is_active: true },
      include: { leave_type: true },
    });

    if (plans.length === 0) continue;

    // Fetch active employees
    const employees = await scoped.employees.findMany({
      where: { status: 'Active' },
    });

    for (const emp of employees) {
      if (!emp.joining_date) continue;
      processedCount++;

      const joining = new Date(emp.joining_date);
      // Service months completed as of startOfMonth
      let elapsedMonths = (year - joining.getFullYear()) * 12 + (month - joining.getMonth());
      if (joining.getDate() > 1) {
        // mid-month joiner adjustment
        elapsedMonths -= 1;
      }
      if (elapsedMonths < 0) elapsedMonths = 0;

      for (const plan of plans) {
        // Check idempotency: did this employee already receive an accrual for this month?
        const existingMonthlyAlloc = await scoped.leave_allocations.findFirst({
          where: {
            employee_id: emp.id,
            leave_type_id: plan.leave_type_id,
            allocation_type: 'Monthly',
            valid_from: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        });

        if (existingMonthlyAlloc) {
          skippedIdempotentCount++;
          continue;
        }

        // Check waiting period (typically 6 months)
        const waitMonths = plan.start_after_months !== undefined ? plan.start_after_months : 6;
        if (elapsedMonths < waitMonths) {
          skippedProbationCount++;
          continue;
        }

        // Check existing allocations for this leave type
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);
        const yearlyAllocs = await scoped.leave_allocations.findMany({
          where: {
            employee_id: emp.id,
            leave_type_id: plan.leave_type_id,
            valid_from: { gte: yearStart, lte: yearEnd },
          },
        });
        const totalAccruedThisYear = yearlyAllocs.reduce((sum, a) => sum + Number(a.days_allocated || 0), 0);
        const yearlyCap = plan.yearly_cap !== undefined ? Number(plan.yearly_cap) : 30.0;

        // Determine monthly accrual days:
        // - Between 6 months and 1 year: 2 days for every completed month from joining date (e.g. 6m=12, 7m=14, 8m=16)
        // - After 1 year: plan.days_per_month (default 2.5 days per month)
        let daysToAccrue = Number(plan.days_per_month) || 2.5;
        if (elapsedMonths >= waitMonths && elapsedMonths < 12) {
          const targetDaysToDate = elapsedMonths * 2.0;
          if (totalAccruedThisYear < targetDaysToDate) {
            daysToAccrue = targetDaysToDate - totalAccruedThisYear;
          } else {
            daysToAccrue = 2.0;
          }
        }

        if (totalAccruedThisYear >= yearlyCap) {
          // Cap reached
          continue;
        }

        if (totalAccruedThisYear + daysToAccrue > yearlyCap) {
          daysToAccrue = Math.max(0, yearlyCap - totalAccruedThisYear);
        }

        if (daysToAccrue > 0) {
          await scoped.leave_allocations.create({
            data: {
              company_id: comp.id,
              employee_id: emp.id,
              leave_type_id: plan.leave_type_id,
              allocation_type: 'Monthly',
              accrual_plan_id: plan.id,
              days_allocated: daysToAccrue,
              days_taken: 0.0,
              valid_from: startOfMonth,
              valid_to: endOfMonth,
            },
          });
          accruedCount++;
        }
      }
    }
  }

  return {
    monthKey,
    processed: processedCount,
    accrued: accruedCount,
    skippedIdempotent: skippedIdempotentCount,
    skippedProbation: skippedProbationCount,
  };
}

export default {
  runMonthlyAccrualJob,
};
