import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import notificationService from './notificationService.js';

export class ApprovalService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * Submit a new approval request
   */
  async createRequest({ companyId, requestType, recordId, requestedBy, comment = null }) {
    if (!companyId || !requestType || !recordId || !requestedBy) {
      const err = new Error('companyId, requestType, recordId, and requestedBy are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    let flow = await this.prisma.$base().approval_flows.findFirst({
      where: {
        company_id: companyId,
        request_type: requestType,
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

    if ((!flow || flow.steps.length === 0) && requestType === 'EMPLOYEE_VERIFICATION') {
      const hrMgrRole = await this.prisma.$base().roles.findFirst({
        where: { code: 'HR_MANAGER' },
      });
      if (hrMgrRole) {
        flow = await this.prisma.$base().approval_flows.create({
          data: {
            company_id: companyId,
            request_type: 'EMPLOYEE_VERIFICATION',
            name: 'Employee Verification Dual-Control Flow',
            priority: 1,
            is_active: true,
          },
          include: {
            steps: {
              include: { role: true },
            },
          },
        });
        const step = await this.prisma.$base().approval_flow_steps.create({
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

    if (!flow || flow.steps.length === 0) {
      const err = new Error(`No active approval flow configured for request type '${requestType}'`);
      err.status = 400;
      err.code = 'NO_APPROVAL_FLOW';
      throw err;
    }

    // Self-approval check: If the requester holds the role of the initial step,
    // advance the step to the next approver tier (e.g. HR Manager's own request advances to GM / Step 2)
    // EXCEPTION: EMPLOYEE_VERIFICATION is strictly evaluated against the creator at action time (FR-EM4/FR-WF2).
    const requesterUserRoles = await this.prisma.$base().user_roles.findMany({
      where: { company_id: companyId, user_id: requestedBy },
      include: { role: true },
    });
    const requesterRoleCodes = requesterUserRoles.map((ur) => ur.role.code);

    let initialStep = 1;
    if (requestType !== 'EMPLOYEE_VERIFICATION') {
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

    const request = await this.prisma.$base().approval_requests.create({
      data: {
        company_id: companyId,
        flow_id: flow.id,
        request_type: requestType,
        record_id: recordId,
        current_step: initialStep,
        status: 'Pending',
        requested_by: requestedBy,
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
      },
    }).catch(() => {});

    // Notify approver(s) for Step 1
    try {
      const step1 = flow.steps.find((s) => s.step_no === 1);
      if (step1?.role_id) {
        const approverUsers = await this.prisma.$base().user_roles.findMany({
          where: { company_id: companyId, role_id: step1.role_id, user_id: { not: requestedBy } },
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
  async actionRequest({ companyId, requestId, actorId, action, comment = null, reason = null }) {
    if (!companyId || !requestId || !actorId || !action) {
      const err = new Error('companyId, requestId, actorId, and action are required');
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

    if (request.status !== 'Pending') {
      const err = new Error(`Request has already been processed with status '${request.status}'`);
      err.status = 400;
      err.code = 'ALREADY_COMPLETED';
      throw err;
    }

    // =========================================================================
    // SPEC RULE: "Nobody approves their own request" (FR-EM4, FR-WF2)
    // =========================================================================
    if (request.requested_by === actorId) {
      const err = new Error('Self-approval is forbidden: nobody approves their own request.');
      err.status = 403;
      err.code = 'SELF_APPROVAL_FORBIDDEN';
      err.error = 'SELF_APPROVAL_FORBIDDEN';
      throw err;
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

    // Check actor holds the required role or is COMPANY_ADMIN
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
      actorRoleCodes.includes(requiredRoleCode) || actorRoleCodes.includes('COMPANY_ADMIN');

    if (!hasPermission) {
      const err = new Error(
        `Permission denied: Step ${request.current_step} requires role '${requiredRoleCode}'. You have [${actorRoleCodes.join(', ')}].`
      );
      err.status = 403;
      err.code = 'STEP_ROLE_REQUIRED';
      throw err;
    }

    // If required role is DEPT_MANAGER, verify requester belongs to manager's team
    if (requiredRoleCode === 'DEPT_MANAGER') {
      const userDept = await this.prisma.$base().departments.findFirst({
        where: { company_id: companyId, manager_id: actorId },
      });
      if (userDept && request.requester?.employee_id) {
        const empContract = await this.prisma.$base().contracts.findFirst({
          where: { employee_id: request.requester.employee_id, status: { in: ['Approved', 'Active'] } },
        });
        if (empContract && empContract.department_id !== userDept.id) {
          const err = new Error('Permission denied: Department managers can only approve requests for their own team.');
          err.status = 403;
          err.code = 'FORBIDDEN_TEAM_SCOPE';
          throw err;
        }
      }
    }

    const now = new Date();

    // 1. Record the action in approval_actions
    const approvalAction = await this.prisma.$base().approval_actions.create({
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

    let newStatus = request.status;
    let nextStep = request.current_step;
    let completedAt = null;

    if (normalizedAction === 'Reject') {
      newStatus = 'Rejected';
      completedAt = now;
    } else if (normalizedAction === 'Approve') {
      const totalSteps = request.flow.steps.length;
      if (request.current_step < totalSteps) {
        nextStep = request.current_step + 1;
      } else {
        newStatus = 'Approved';
        completedAt = now;
      }
    }

    const updatedRequest = await this.prisma.$base().approval_requests.update({
      where: { id: request.id },
      data: {
        current_step: nextStep,
        status: newStatus,
        completed_at: completedAt,
      },
      include: {
        actions: {
          orderBy: { step_no: 'asc' },
          include: { actor: { select: { id: true, email: true } } },
        },
      },
    });

    await auditService.log({
      companyId,
      userId: actorId,
      action: `APPROVAL_${action.toUpperCase()}`,
      tableName: 'approval_requests',
      recordId: request.id,
      oldValues: { status: request.status, current_step: request.current_step },
      newValues: { status: newStatus, current_step: nextStep, comment },
    }).catch(() => {});

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
    if (userRoleCodes.includes('DEPT_MANAGER')) {
      const userDept = await this.prisma.$base().departments.findFirst({
        where: { company_id: companyId, manager_id: userId },
      });
      if (userDept) managerDeptId = userDept.id;
    }

    const filtered = requests.filter((req) => {
      const step = req.flow?.steps?.find((s) => s.step_no === req.current_step);
      if (!step) return false;
      if (!userRoleCodes.includes(step.role?.code) && !userRoleCodes.includes('COMPANY_ADMIN')) {
        return false;
      }
      return true;
    });

    const enriched = await Promise.all(
      filtered.map(async (req) => {
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
        return req;
      })
    );

    return enriched;
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
