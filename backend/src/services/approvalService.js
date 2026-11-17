import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import notificationService from './notificationService.js';
import { toDubaiDateString } from '@nextal/shared';

export class ApprovalService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * Submit a new approval request
   */
  async createRequest({ companyId, requestType, recordId, requestedBy, comment = null, payload = null, tx = null }) {
    if (!companyId || !requestType || !recordId) {
      const err = new Error('companyId, requestType, and recordId are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const client = tx || (this.prisma.$base ? this.prisma.$base() : this.prisma);

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!requestedBy || typeof requestedBy !== 'string' || !UUID_REGEX.test(requestedBy)) {
      const err = new Error('Valid user ID (UUID) is required for requester');
      err.status = 400;
      err.code = 'INVALID_REQUESTER';
      throw err;
    }

    const requesterUser = await client.users.findFirst({
      where: { id: requestedBy, company_id: companyId },
      select: { id: true, status: true },
    });
    if (!requesterUser) {
      const err = new Error('Requester user not found in company');
      err.status = 400;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const validRequestedBy = requestedBy;

    const isLeave = requestType?.toUpperCase() === 'LEAVE';
    let flow = await client.approval_flows.findFirst({
      where: {
        company_id: companyId,
        request_type: isLeave ? { in: ['LEAVE', 'Leave'] } : requestType,
        is_active: true,
      },
      include: {
        steps: {
          orderBy: { step_no: 'asc' },
          include: { role: true },
        },
      },
      orderBy: { priority: 'asc' },
    });

    if ((!flow || flow.steps.length === 0) && (requestType === 'EMPLOYEE_VERIFICATION' || requestType === 'EMPLOYEE_BRANCH_CHANGE')) {
      const hrMgrRole = await client.roles.findFirst({
        where: { code: 'HR_MANAGER' },
      });
      if (hrMgrRole) {
        flow = await client.approval_flows.create({
          data: {
            company_id: companyId,
            request_type: requestType,
            name:
              requestType === 'EMPLOYEE_BRANCH_CHANGE'
                ? 'Employee Branch Change Approval Flow'
                : 'Employee Verification Dual-Control Flow',
            priority: 1,
            is_active: true,
          },
          include: {
            steps: {
              include: { role: true },
            },
          },
        });
        const step = await client.approval_flow_steps.create({
          data: {
            company_id: companyId,
            flow_id: flow.id,
            step_no: 1,
            role_id: hrMgrRole.id,
            approver_rule: 'SpecificRole',
          },
          include: { role: true },
        });
        flow.steps = [step];
      }
    }

    if ((!flow || flow.steps.length === 0) && isLeave) {
      const deptMgrRole = await client.roles.findFirst({ where: { code: 'DEPT_MANAGER' } });
      const hrOffRole = (await client.roles.findFirst({ where: { code: 'HR_OFFICER' } })) ||
                        (await client.roles.findFirst({ where: { code: 'HR_MANAGER' } }));
      const gmRole = await client.roles.findFirst({ where: { code: 'GM' } });
      if (deptMgrRole && hrOffRole && gmRole) {
        flow = await client.approval_flows.create({
          data: {
            company_id: companyId,
            request_type: requestType,
            name: 'Standard Leave Approval Flow',
            priority: 1,
            is_active: true,
          },
          include: {
            steps: {
              include: { role: true },
            },
          },
        });
        const s1 = await client.approval_flow_steps.create({
          data: { company_id: companyId, flow_id: flow.id, step_no: 1, role_id: deptMgrRole.id, approver_rule: 'SpecificRole' },
          include: { role: true },
        });
        const s2 = await client.approval_flow_steps.create({
          data: { company_id: companyId, flow_id: flow.id, step_no: 2, role_id: hrOffRole.id, approver_rule: 'SpecificRole' },
          include: { role: true },
        });
        const s3 = await client.approval_flow_steps.create({
          data: { company_id: companyId, flow_id: flow.id, step_no: 3, role_id: gmRole.id, approver_rule: 'SpecificRole' },
          include: { role: true },
        });
        flow.steps = [s1, s2, s3];
      }
    }

    if (!flow || flow.steps.length === 0) {
      const err = new Error(`No active approval flow configured for request type '${requestType}'`);
      err.status = 400;
      err.code = 'NO_APPROVAL_FLOW';
      throw err;
    }

    // Self-approval check: If the requester holds the role of the initial step,
    // advance the step to the next approver tier (e.g. HR Manager's own request advances to GM / Step 2)
    // EXCEPTION: EMPLOYEE_VERIFICATION & EMPLOYEE_BRANCH_CHANGE are strictly evaluated against the creator at action time (FR-EM4/FR-WF2).
    let requesterUserRoles = [];
    if (validRequestedBy) {
      requesterUserRoles = await client.user_roles.findMany({
        where: { company_id: companyId, user_id: validRequestedBy },
        include: { role: true },
      });
    }
    const requesterRoleCodes = requesterUserRoles.map((ur) => ur.role.code);

    let initialStep = 1;
    if (isLeave) {
      const lr = await client.leave_requests.findUnique({
        where: { id: recordId },
        select: {
          employee_id: true,
          employee: {
            select: {
              contracts: {
                where: { status: { in: ['Approved', 'Active'] } },
                select: { department_id: true, department: { select: { id: true, manager_id: true } } },
                orderBy: { effective_date: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
      const deptManagerId = lr?.employee?.contracts?.[0]?.department?.manager_id;
      // If requester is department manager or no manager or holds DEPT_MANAGER role:
      if (!deptManagerId || deptManagerId === requestedBy || requesterRoleCodes.includes('DEPT_MANAGER')) {
        initialStep = 2;
      }
      // If requester has HR role (HR_MANAGER / HR_OFFICER): advance to GM
      if (requesterRoleCodes.includes('HR_MANAGER') || requesterRoleCodes.includes('HR_OFFICER')) {
        if (initialStep <= 2) {
          initialStep = 3;
        }
      }
    } else if (requestType !== 'EMPLOYEE_VERIFICATION' && requestType !== 'EMPLOYEE_BRANCH_CHANGE') {
      const sortedSteps = [...flow.steps].sort((a, b) => a.step_no - b.step_no);
      while (initialStep < sortedSteps.length) {
        const stepDef = sortedSteps.find((s) => s.step_no === initialStep);
        if (stepDef && requesterRoleCodes.includes(stepDef.role.code)) {
          initialStep++;
        } else {
          break;
        }
      }
    }

    const request = await client.approval_requests.create({
      data: {
        company_id: companyId,
        flow_id: flow.id,
        request_type: requestType,
        record_id: recordId,
        current_step: initialStep,
        status: 'Pending',
        requested_by: validRequestedBy,
        payload: payload || undefined,
      },
      include: {
        flow: {
          include: {
            steps: {
              include: { role: true },
            },
          },
        },
        requester: {
          select: { id: true, email: true },
        },
      },
    });

    if (comment) {
      await client.approval_actions.create({
        data: {
          company_id: companyId,
          approval_request_id: request.id,
          step_no: 0,
          acted_by: validRequestedBy,
          action: 'SUBMIT',
          comment,
        },
      });
    }

    await auditService.log({
      companyId,
      userId: requestedBy,
      action: 'SUBMIT_APPROVAL',
      tableName: 'approval_requests',
      recordId: request.id,
      newValues: {
        request_type: requestType,
        record_id: recordId,
        current_step: 1,
        status: 'Pending',
        comment,
      },
      tx,
    });

    // Notify approver(s) for Step 1
    try {
      const step1 = flow.steps.find((s) => s.step_no === 1);
      if (step1?.role_id) {
        const approverUsers = await this.prisma.$base().user_roles.findMany({
          where: {
            company_id: companyId,
            role_id: step1.role_id,
            ...(validRequestedBy ? { user_id: { not: validRequestedBy } } : {}),
          },
          select: { user_id: true },
        });
        for (const u of approverUsers) {
          await notificationService.notifyApprovalWaiting(
            companyId,
            u.user_id,
            requestType,
            request.requester?.email || 'Employee'
          );
        }
      }
    } catch (e) {
      console.warn('Failed to dispatch approval waiting notification:', e.message);
    }

    return request;
  }

  /**
   * Act on an approval request (Approve or Reject)
   * Enforces: "Nobody approves their own request"
   */
  async actionRequest({ companyId, requestId, actorId, action, comment = null, reason = null, user = null }) {
    if (!companyId || !requestId || !action) {
      const err = new Error('companyId, requestId, and action are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const actUpper = String(action).toUpperCase();
    if (!['APPROVE', 'REJECT'].includes(actUpper)) {
      const err = new Error("Action must be 'Approve' or 'Reject'");
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const normalizedAction = actUpper === 'APPROVE' ? 'Approve' : 'Reject';

    const request = await this.prisma.$base().approval_requests.findUnique({
      where: { id: requestId },
      include: {
        flow: {
          include: {
            steps: {
              orderBy: { step_no: 'asc' },
              include: { role: true },
            },
          },
        },
        requester: true,
      },
    });

    if (!request || request.company_id !== companyId) {
      const err = new Error('Approval request not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Validate actor is a real UUID and an active user in the company
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!actorId || typeof actorId !== 'string' || !UUID_REGEX.test(actorId)) {
      const err = new Error('Valid actor user ID (UUID) is required to action an approval request');
      err.status = 400;
      err.code = 'INVALID_ACTOR_ID';
      throw err;
    }

    const actorUser = await this.prisma.$base().users.findFirst({
      where: {
        id: actorId,
        company_id: companyId,
        status: { in: ['ACTIVE', 'Active'] },
      },
      select: { id: true, employee_id: true },
    });

    if (!actorUser) {
      const err = new Error('Actor user not found or inactive in company');
      err.status = 401;
      err.code = 'UNAUTHORIZED_ACTOR';
      throw err;
    }

    // Check data scope for actor
    if (user) {
      const { scopeService } = await import('./scopeService.js');
      const scope = scopeService.resolveDataScope(user);
      if (!scope.all && scope.visaIds && scope.visaIds.length > 0) {
        let empVisaId = null;
        if (request.request_type === 'LEAVE') {
          const lr = await this.prisma.$base().leave_requests.findUnique({
            where: { id: request.record_id },
            select: { employee: { select: { company_visa_id: true } } },
          });
          empVisaId = lr?.employee?.company_visa_id;
        } else if (request.requester?.employee_id) {
          const emp = await this.prisma.$base().employees.findUnique({
            where: { id: request.requester.employee_id },
            select: { company_visa_id: true },
          });
          empVisaId = emp?.company_visa_id;
        }
        if (empVisaId && !scope.visaIds.includes(empVisaId)) {
          const err = new Error('Approval request not found');
          err.status = 404;
          err.code = 'NOT_FOUND';
          throw err;
        }
      }
    }

    if (request.status !== 'Pending') {
      const err = new Error(`Request has already been processed with status '${request.status}'`);
      err.status = 409;
      err.code = 'ALREADY_COMPLETED';
      throw err;
    }

    // =========================================================================
    // SPEC RULE: "Nobody approves their own request" (FR-EM4, FR-WF2)
    // =========================================================================
    if (request.requested_by && request.requested_by === actorId) {
      const err = new Error('Self-approval is forbidden: nobody approves their own request.');
      err.status = 403;
      err.code = 'SELF_APPROVAL_FORBIDDEN';
      err.error = 'SELF_APPROVAL_FORBIDDEN';
      throw err;
    }

    if (request.request_type === 'LEAVE') {
      const lr = await this.prisma.$base().leave_requests.findUnique({
        where: { id: request.record_id },
        select: { employee: { select: { user: { select: { id: true } } } } },
      });
      if (lr?.employee?.user?.id && lr.employee.user.id === actorId) {
        const err = new Error('Self-approval is forbidden: nobody approves their own request.');
        err.status = 403;
        err.code = 'SELF_APPROVAL_FORBIDDEN';
        err.error = 'SELF_APPROVAL_FORBIDDEN';
        throw err;
      }
    }

    const decisionComment = (reason || comment || '').trim();
    if (request.request_type === 'EMPLOYEE_VERIFICATION' && normalizedAction === 'Reject') {
      if (!decisionComment || decisionComment.length < 5) {
        const err = new Error('A reason of at least 5 characters is required to return an employee for correction.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        err.error = 'REASON_REQUIRED';
        throw err;
      }
    }

    // If EMPLOYEE_VERIFICATION, delegate state transition and audit to employeeService
    if (request.request_type === 'EMPLOYEE_VERIFICATION') {
      const { employeeService } = await import('./employeeService.js');
      await employeeService.verifyEmployee({
        companyId,
        employeeId: request.record_id,
        action: normalizedAction === 'Approve' ? 'APPROVE' : 'SEND_BACK',
        comment: decisionComment,
        viewer: { id: actorId, userId: actorId },
      });
    }

    // Find the current step definition
    const currentStepConfig = request.flow.steps.find((s) => s.step_no === request.current_step);
    if (!currentStepConfig) {
      const err = new Error(`Step configuration for step ${request.current_step} not found`);
      err.status = 500;
      err.code = 'CONFIG_ERROR';
      throw err;
    }

    const actorUserRoles = await this.prisma.$base().user_roles.findMany({
      where: {
        company_id: companyId,
        user_id: actorId,
      },
      include: { role: true },
    });

    const actorRoleCodes = actorUserRoles.map((ur) => ur.role.code);
    const requiredRoleCode = currentStepConfig.role.code;

    const hasPermission =
      actorRoleCodes.includes(requiredRoleCode) ||
      actorRoleCodes.includes('COMPANY_ADMIN') ||
      (requiredRoleCode === 'HR_OFFICER' && actorRoleCodes.includes('HR_MANAGER')) ||
      (requiredRoleCode === 'HR_MANAGER' && actorRoleCodes.includes('HR_OFFICER'));

    if (!hasPermission) {
      const err = new Error(
        `Permission denied: Step ${request.current_step} requires role '${requiredRoleCode}'. You have [${actorRoleCodes.join(', ')}].`
      );
      err.status = 403;
      err.code = 'NOT_CURRENT_APPROVER';
      throw err;
    }

    // If required role is DEPT_MANAGER, verify requester belongs to manager's team
    if (requiredRoleCode === 'DEPT_MANAGER' && !actorRoleCodes.includes('COMPANY_ADMIN')) {
      const actorUser = await this.prisma.$base().users.findUnique({
        where: { id: actorId },
        select: { id: true, employee_id: true },
      });
      let empDeptManagerId = null;
      if (request.request_type?.toUpperCase() === 'LEAVE') {
        const lr = await this.prisma.$base().leave_requests.findUnique({
          where: { id: request.record_id },
          select: {
            employee: {
              select: {
                contracts: {
                  where: { status: { in: ['Approved', 'Active'] } },
                  select: { department: { select: { manager_id: true } } },
                  orderBy: { effective_date: 'desc' },
                  take: 1,
                },
              },
            },
          },
        });
        empDeptManagerId = lr?.employee?.contracts?.[0]?.department?.manager_id;
      } else if (request.requester?.employee_id) {
        const empContract = await this.prisma.$base().contracts.findFirst({
          where: { employee_id: request.requester.employee_id, status: { in: ['Approved', 'Active'] } },
          select: { department: { select: { manager_id: true } } },
        });
        empDeptManagerId = empContract?.department?.manager_id;
      }

      if (
        empDeptManagerId &&
        empDeptManagerId !== actorId &&
        empDeptManagerId !== actorUser?.employee_id
      ) {
        const err = new Error('Leave request not found');
        err.status = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }
    }

    const now = new Date();

    let newStatus = request.status;
    let nextStep = request.current_step;
    let completedAt = null;

    if (normalizedAction === 'Reject') {
      newStatus = 'Rejected';
      completedAt = now;
    } else if (normalizedAction === 'Approve') {
      if (request.request_type?.toUpperCase() === 'LEAVE') {
        const needsGM = Boolean(request.payload?.needs_gm);
        if (actorRoleCodes.includes('COMPANY_ADMIN')) {
          newStatus = 'Approved';
          completedAt = now;
        } else if (request.current_step === 1) {
          nextStep = 2;
        } else if (request.current_step === 2) {
          if (needsGM) {
            nextStep = 3;
          } else {
            newStatus = 'Approved';
            completedAt = now;
          }
        } else {
          newStatus = 'Approved';
          completedAt = now;
        }
      } else {
        const totalSteps = request.flow.steps.length;
        if (request.current_step < totalSteps) {
          nextStep = request.current_step + 1;
        } else {
          newStatus = 'Approved';
          completedAt = now;
        }
      }
    }

    const { updatedRequest, approvalAction } = await this.prisma.$base().$transaction(async (tx) => {
      // 1. Record the action in approval_actions
      const actionRecord = await tx.approval_actions.create({
        data: {
          company_id: companyId,
          approval_request_id: request.id,
          step_no: request.current_step,
          acted_by: actorId,
          action: normalizedAction,
          comment: decisionComment,
          acted_at: now,
        },
      });

      let branchPayload = request.payload;
      if (!branchPayload && request.comment) {
        try {
          branchPayload = JSON.parse(request.comment);
        } catch {
          branchPayload = null;
        }
      }

      // Apply branch update if EMPLOYEE_BRANCH_CHANGE approved
      if (newStatus === 'Approved' && request.request_type === 'EMPLOYEE_BRANCH_CHANGE') {
        if (!branchPayload || !branchPayload.target_branch_id) {
          const err = new Error('Branch change request is missing target branch payload');
          err.status = 400;
          err.code = 'INVALID_PAYLOAD';
          throw err;
        }

        const emp = await tx.employees.findUnique({
          where: { id: request.record_id },
        });
        if (!emp) {
          const err = new Error('Employee not found');
          err.status = 404;
          err.code = 'NOT_FOUND';
          throw err;
        }

        const targetBranch = await tx.branches.findUnique({
          where: { id: branchPayload.target_branch_id },
        });
        if (!targetBranch) {
          const err = new Error('Target branch not found');
          err.status = 400;
          err.code = 'INVALID_BRANCH';
          throw err;
        }

        // Section 2.3: re-check the target branch's visa
        if (targetBranch.company_visa_id !== emp.company_visa_id) {
          const err = new Error('Selected branch does not belong to the selected company visa');
          err.status = 400;
          err.code = 'BRANCH_VISA_MISMATCH';
          throw err;
        }

        const todayStr = new Date().toISOString().slice(0, 10);
        const effDateStr = String(branchPayload.effective_date).slice(0, 10);

        if (effDateStr <= todayStr) {
          // Apply now
          await tx.employees.update({
            where: { id: emp.id },
            data: { branch_id: targetBranch.id },
          });

          branchPayload = {
            ...branchPayload,
            applied: true,
            applied_at: new Date().toISOString(),
          };

          await auditService.log({
            companyId,
            userId: actorId,
            action: 'UPDATE',
            tableName: 'employees',
            recordId: emp.id,
            oldValues: { branch_id: emp.branch_id },
            newValues: {
              branch_id: targetBranch.id,
              effective_date: effDateStr,
              reason: branchPayload.reason,
            },
            tx,
          });
        } else {
          // Future-dated: leave as Approved-pending for 01:30 nightly job
          branchPayload = {
            ...branchPayload,
            applied: false,
          };
        }
      }

      // Apply LEAVE completion if Approved or Rejected
      if (newStatus === 'Approved' && request.request_type === 'LEAVE') {
        const leaveRequest = await tx.leave_requests.findUnique({
          where: { id: request.record_id },
          include: { leave_type: true, employee: true },
        });
        if (leaveRequest) {
          // 1. Deduct balance from allocation
          if (leaveRequest.leave_allocation_id) {
            await tx.leave_allocations.update({
              where: { id: leaveRequest.leave_allocation_id },
              data: { days_taken: { increment: leaveRequest.days } },
            });
          }

          // 2. Pay band calculation
          let payBand = 'Full';
          if (!leaveRequest.leave_type.is_paid) {
            payBand = 'None';
          }
          const isSick = leaveRequest.leave_type.code === 'SICK' || leaveRequest.leave_type.code?.startsWith('SICK');
          let priorSickDays = 0;
          if (isSick) {
            const year = leaveRequest.date_from.getFullYear();
            const priorSick = await tx.leave_requests.findMany({
              where: {
                company_id: companyId,
                employee_id: leaveRequest.employee_id,
                status: 'Approved',
                leave_type: { code: { startsWith: 'SICK' } },
                date_from: { gte: new Date(Date.UTC(year, 0, 1)), lt: leaveRequest.date_from },
              },
            });
            priorSickDays = priorSick.reduce((sum, r) => sum + Number(r.days), 0);
          }

          // 3. Mark attendance_days ONLY for working days (skipping weekly off days and public holidays)
          const contract = await tx.contracts.findFirst({
            where: { company_id: companyId, employee_id: leaveRequest.employee_id },
            include: { shift: true },
            orderBy: { effective_date: 'desc' },
          });
          const weeklyOffDays = contract?.shift?.weekly_off_days || [0, 6];
          const holidays = await tx.public_holidays.findMany({
            where: {
              company_id: companyId,
              holiday_date: { gte: leaveRequest.date_from, lte: leaveRequest.date_to },
            },
          });
          const applicableHolidays = holidays.filter((h) => !h.branch_id || h.branch_id === leaveRequest.employee?.branch_id);
          const holidayDateSet = new Set(applicableHolidays.map((h) => toDubaiDateString(h.holiday_date)));

          const cur = new Date(leaveRequest.date_from);
          const end = new Date(leaveRequest.date_to);
          let dayIndex = 0;

          while (cur <= end) {
            const dateStr = toDubaiDateString(cur);
            const dayOfWeek = new Date(cur.getTime() + 4 * 3600000).getUTCDay();
            const isOff = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDateSet.has(dateStr);

            if (!isOff && !isHoliday) {
              let currentDayPayBand = payBand;
              if (isSick) {
                const cumulativeSickDay = priorSickDays + dayIndex + 1;
                if (cumulativeSickDay <= 15) {
                  currentDayPayBand = 'Full';
                } else if (cumulativeSickDay <= 45) {
                  currentDayPayBand = 'Half';
                } else {
                  currentDayPayBand = 'None';
                }
              }

              await tx.attendance_days.upsert({
                where: {
                  employee_id_work_date: {
                    employee_id: leaveRequest.employee_id,
                    work_date: new Date(dateStr),
                  },
                },
                create: {
                  company_id: companyId,
                  employee_id: leaveRequest.employee_id,
                  work_date: new Date(dateStr),
                  day_type: 'Leave',
                  leave_request_id: leaveRequest.id,
                  pay_band: currentDayPayBand,
                  exception_codes: [],
                  review_status: 'Open',
                },
                update: {
                  day_type: 'Leave',
                  leave_request_id: leaveRequest.id,
                  pay_band: currentDayPayBand,
                },
              });
              dayIndex++;
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
          }

          // 4. Update leave_requests status
          await tx.leave_requests.update({
            where: { id: leaveRequest.id },
            data: { status: 'Approved', updated_by: actorId },
          });

          await auditService.log({
            companyId,
            userId: actorId,
            action: 'APPROVE',
            tableName: 'leave_requests',
            recordId: leaveRequest.id,
            oldValues: { status: 'Pending' },
            newValues: { status: 'Approved', days_taken: leaveRequest.days },
            tx,
          });
        }
      }

      if (newStatus === 'Rejected' && request.request_type?.toUpperCase() === 'LEAVE') {
        await tx.leave_requests.update({
          where: { id: request.record_id },
          data: { status: 'Refused', updated_by: actorId },
        });

        await auditService.log({
          companyId,
          userId: actorId,
          action: 'REFUSE',
          tableName: 'leave_requests',
          recordId: request.record_id,
          oldValues: { status: 'Pending' },
          newValues: { status: 'Refused', reason: decisionComment },
          tx,
        });
      }

      const res = await tx.approval_requests.update({
        where: { id: request.id },
        data: {
          current_step: nextStep,
          status: newStatus,
          completed_at: completedAt,
          payload: branchPayload !== undefined ? branchPayload : undefined,
        },
        include: {
          actions: {
            orderBy: { step_no: 'asc' },
            include: { actor: { select: { id: true, email: true } } },
          },
        },
      });

      // Audit row in the same transaction
      await auditService.log({
        companyId,
        userId: actorId,
        action: `APPROVAL_${action.toUpperCase()}`,
        tableName: 'approval_requests',
        recordId: request.id,
        oldValues: { status: request.status, current_step: request.current_step },
        newValues: { status: newStatus, current_step: nextStep, comment },
        tx,
      });

      return { updatedRequest: res, approvalAction: actionRecord };
    });

    // Notify requester of decision
    try {
      if (newStatus === 'Approved' || newStatus === 'Rejected') {
        const actor = await this.prisma.$base().users.findUnique({
          where: { id: actorId },
          select: { email: true },
        });
        await notificationService.notifyRequestStatus(
          companyId,
          request.requested_by,
          request.request_type,
          newStatus,
          actor?.email || 'Approver',
          comment
        );
      }
    } catch (e) {
      console.warn('Failed to dispatch request status notification:', e.message);
    }

    return {
      status: 'success',
      action: approvalAction,
      request: updatedRequest,
    };
  }

  /**
   * Get pending approvals for an actor given their roles
   */
  async getPendingApprovals({ companyId, userId, userRoleCodes = [] }) {
    if (!companyId || !userId) {
      return [];
    }

    // Requests in this company with status 'Pending' where requester !== userId
    const requests = await this.prisma.$base().approval_requests.findMany({
      where: {
        company_id: companyId,
        status: 'Pending',
        requested_by: { not: userId }, // Exclude own requests (cannot approve own)
      },
      include: {
        flow: {
          include: {
            steps: {
              include: { role: true },
            },
          },
        },
        requester: {
          select: { id: true, email: true },
        },
        actions: {
          include: { actor: { select: { id: true, email: true } } },
        },
      },
      orderBy: { requested_at: 'desc' },
    });

    // Filter requests where the current step's role matches one of user's roles
    let managerDeptId = null;
    let currentUser = null;
    if (userRoleCodes.includes('DEPT_MANAGER')) {
      currentUser = await this.prisma.$base().users.findUnique({
        where: { id: userId },
        select: { id: true, employee_id: true },
      });
      const userDept = await this.prisma.$base().departments.findFirst({
        where: {
          company_id: companyId,
          OR: [
            { manager_id: userId },
            ...(currentUser?.employee_id ? [{ manager_id: currentUser.employee_id }] : []),
          ],
        },
      });
      if (userDept) managerDeptId = userDept.id;
    }

    const filtered = requests.filter((req) => {
      const step = req.flow?.steps?.find((s) => s.step_no === req.current_step);
      if (!step) return false;
      if (!userRoleCodes.includes(step.role?.code) && !userRoleCodes.includes('COMPANY_ADMIN')) {
        if (!(step.role?.code === 'HR_OFFICER' && userRoleCodes.includes('HR_MANAGER'))) {
          return false;
        }
      }
      return true;
    });

    const enriched = await Promise.all(
      filtered.map(async (req) => {
        if (req.request_type === 'LEAVE') {
          const lr = await this.prisma.$base().leave_requests.findUnique({
            where: { id: req.record_id },
            include: {
              leave_type: true,
              employee: {
                select: {
                  id: true,
                  name: true,
                  arabic_name: true,
                  employee_code: true,
                  company_visa_id: true,
                  branch: { select: { name: true, name_ar: true } },
                  contracts: {
                    where: { status: { in: ['Approved', 'Active'] } },
                    select: { department_id: true, department: { select: { manager_id: true, name: true } } },
                    orderBy: { effective_date: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          });
          if (lr) {
            if (userRoleCodes.includes('DEPT_MANAGER') && !userRoleCodes.includes('COMPANY_ADMIN')) {
              const mgrId = lr.employee?.contracts?.[0]?.department?.manager_id;
              if (mgrId && mgrId !== userId && mgrId !== currentUser?.employee_id) {
                return null;
              }
            }
            return {
              ...req,
              leave_request: lr,
              employee: {
                id: lr.employee?.id,
                name: lr.employee?.name,
                arabic_name: lr.employee?.arabic_name,
                code: lr.employee?.employee_code,
                department: lr.employee?.contracts?.[0]?.department?.name,
                leave_type: lr.leave_type?.name,
                leave_type_ar: lr.leave_type?.name_ar,
                days: Number(lr.days),
                date_from: lr.date_from,
                date_to: lr.date_to,
                reason: lr.reason,
              },
            };
          }
        }
        if (req.request_type === 'EMPLOYEE_VERIFICATION') {
          const emp = await this.prisma.$base().employees.findUnique({
            where: { id: req.record_id },
            include: {
              company_visa: { select: { id: true, name: true, mol_establishment_id: true } },
              branch: { select: { id: true, name: true } },
            },
          });
          if (emp) {
            let creatorEmail = req.requester?.email;
            if (!creatorEmail && emp.created_by) {
              const u = await this.prisma.$base().users.findUnique({
                where: { id: emp.created_by },
                select: { email: true },
              });
              if (u) creatorEmail = u.email;
            }
            return {
              ...req,
              employee: {
                id: emp.id,
                name: emp.name,
                arabic_name: emp.arabic_name,
                code: emp.employee_code,
                joining_date: emp.joining_date,
                residency_type: emp.residency_type,
                visa: emp.company_visa?.name || 'MOHRE Dubai',
                branch: emp.branch?.name || 'HQ',
                created_by: creatorEmail || 'HR Officer',
              },
            };
          }
        }
        if (req.request_type === 'EMPLOYEE_BRANCH_CHANGE') {
          const emp = await this.prisma.$base().employees.findUnique({
            where: { id: req.record_id },
            include: {
              company_visa: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true, name_ar: true } },
            },
          });
          let details = req.payload;
          if (!details && req.comment) {
            try {
              details = JSON.parse(req.comment);
            } catch {}
          }
          const targetBranch = details?.target_branch_id
            ? await this.prisma.$base().branches.findUnique({
                where: { id: details.target_branch_id },
                select: { id: true, name: true, name_ar: true },
              })
            : null;

          return {
            ...req,
            employee: emp
              ? {
                  id: emp.id,
                  name: emp.name,
                  arabic_name: emp.arabic_name,
                  code: emp.employee_code,
                  current_branch: emp.branch?.name,
                  current_branch_ar: emp.branch?.name_ar,
                  target_branch: targetBranch?.name || details?.target_branch_name,
                  target_branch_ar: targetBranch?.name_ar || details?.target_branch_name_ar,
                  effective_date: details?.effective_date,
                  reason: details?.reason,
                  visa: emp.company_visa?.name,
                  visa_ar: emp.company_visa?.name_ar,
                }
              : null,
          };
        }
        return req;
      })
    );

    return enriched.filter(Boolean);
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
