import prisma from '../lib/prisma.js';
import auditService from '../services/auditService.js';
import { invalidateUserSession } from '../middleware/authCache.js';

/**
 * Nightly Deactivation & Separation Tasks Job (Spec Section 6 & T36)
 *
 * Scans employees whose settlement is approved and whose final working date has passed.
 * Archives their employee record, bumps token_version to immediately revoke sessions,
 * deactivates user login, and opens visa/labour card cancellation tasks for HR in separation_tasks.
 */
export async function runDeactivationJob(targetDate = new Date()) {
  const asOf = new Date(targetDate);
  asOf.setUTCHours(23, 59, 59, 999);

  // Find separations where settlement is approved/paid and final working date has passed
  const eligibleSeparations = await prisma.$base().separations.findMany({
    where: {
      status: 'Approved',
      last_working_day: { lte: asOf },
      final_settlement: {
        status: { in: ['Approved', 'Paid'] },
      },
      OR: [
        { access_deactivated_at: null },
        { employee: { status: { not: 'Archived' } } },
      ],
    },
    include: {
      employee: {
        include: {
          user: true,
          company: true,
        },
      },
      final_settlement: true,
    },
  });

  const deactivatedList = [];

  for (const sep of eligibleSeparations) {
    const { employee, company_id } = sep;
    const now = new Date();

    // 1. Archive employee status
    await prisma.$base().employees.update({
      where: { id: employee.id },
      data: {
        status: 'Archived',
        updated_at: now,
      },
    });

    // 2. Mark access deactivated on separation record
    await prisma.$base().separations.update({
      where: { id: sep.id },
      data: {
        access_deactivated_at: now,
      },
    });

    // 3. Deactivate user account & bump token_version (immediate JWT revocation)
    let userDeactivated = false;
    if (employee.user) {
      await prisma.$base().users.update({
        where: { id: employee.user.id },
        data: {
          status: 'Deactivated',
          token_version: { increment: 1 },
          deactivated_at: now,
        },
      });
      invalidateUserSession(employee.user.id);
      userDeactivated = true;
    }

    // 4. Open HR tasks for Visa and Labour card cancellation in separation_tasks
    const hrUser = await prisma.$base().users.findFirst({
      where: { company_id, email: { contains: 'hr' } },
    });
    const assignedTo = hrUser?.id || sep.created_by || employee.user?.id;

    if (assignedTo) {
      const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Check existing tasks to ensure idempotency
      const existingTasks = await prisma.$base().separation_tasks.findMany({
        where: { separation_id: sep.id },
      });
      const hasVisaTask = existingTasks.some((t) => t.task_type === 'VISA_CANCELLATION');
      const hasLabourTask = existingTasks.some((t) => t.task_type === 'LABOUR_CARD_CANCELLATION');

      if (!hasVisaTask) {
        await prisma.$base().separation_tasks.create({
          data: {
            company_id,
            separation_id: sep.id,
            task_type: 'VISA_CANCELLATION',
            assigned_to: assignedTo,
            due_date: dueDate,
            status: 'Open',
          },
        });
      }

      if (!hasLabourTask) {
        await prisma.$base().separation_tasks.create({
          data: {
            company_id,
            separation_id: sep.id,
            task_type: 'LABOUR_CARD_CANCELLATION',
            assigned_to: assignedTo,
            due_date: dueDate,
            status: 'Open',
          },
        });
      }
    }

    await auditService.log({
      companyId: company_id,
      userId: assignedTo,
      action: 'DEACTIVATE_OFFBOARDED_EMPLOYEE',
      tableName: 'employees',
      recordId: employee.id,
      oldValues: { status: employee.status },
      newValues: { status: 'Archived', access_deactivated_at: now.toISOString() },
    }).catch(() => {});

    deactivatedList.push({
      employee_id: employee.id,
      employee_code: employee.employee_code,
      name: employee.name,
      user_deactivated: userDeactivated,
      separation_id: sep.id,
    });
  }

  return {
    processed: eligibleSeparations.length,
    deactivatedList,
    timestamp: new Date(),
  };
}

export default {
  runDeactivationJob,
};

