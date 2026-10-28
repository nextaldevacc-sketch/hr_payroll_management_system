import prisma from '../prisma/client.js';
import auditService from './auditService.js';

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

    const flow = await this.prisma.$base().approval_flows.findFirst({
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

    if (!flow || flow.steps.length === 0) {
      const err = new Error(`No active approval flow configured for request type '${requestType}'`);
      err.status = 400;
      err.code = 'NO_APPROVAL_FLOW';
      throw err;
    }

    const request = await this.prisma.$base().approval_requests.create({
      data: {
        company_id: companyId,
        flow_id: flow.id,
        request_type: requestType,
        record_id: recordId,
        current_step: 1,
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

    return request;
  }

  /**
   * Act on an approval request (Approve or Reject)
   * Enforces: "Nobody approves their own request"
   */
  async actionRequest({ companyId, requestId, actorId, action, comment = null }) {
    if (!companyId || !requestId || !actorId || !action) {
      const err = new Error('companyId, requestId, actorId, and action are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!['Approve', 'Reject'].includes(action)) {
      const err = new Error("Action must be 'Approve' or 'Reject'");
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

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
    // SPEC RULE: "Nobody approves their own request"
    // =========================================================================
    if (request.requested_by === actorId) {
      const err = new Error('Self-approval is forbidden: nobody approves their own request.');
      err.status = 403;
      err.code = 'SELF_APPROVAL_FORBIDDEN';
      throw err;
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
        `You do not hold the required role (${currentStepConfig.role.name}) to act on step ${request.current_step}`
      );
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const now = new Date();

    // 1. Record the action in approval_actions
    const approvalAction = await this.prisma.$base().approval_actions.create({
      data: {
        company_id: companyId,
        approval_request_id: request.id,
        step_no: request.current_step,
        acted_by: actorId,
        action,
        comment,
        acted_at: now,
      },
    });

    let newStatus = request.status;
    let nextStep = request.current_step;
    let completedAt = null;

    if (action === 'Reject') {
      newStatus = 'Rejected';
      completedAt = now;
    } else if (action === 'Approve') {
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
    const isCompanyAdmin = userRoleCodes.includes('COMPANY_ADMIN');

    return requests.filter((req) => {
      const step = req.flow.steps.find((s) => s.step_no === req.current_step);
      if (!step) return false;
      return isCompanyAdmin || userRoleCodes.includes(step.role.code);
    });
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
