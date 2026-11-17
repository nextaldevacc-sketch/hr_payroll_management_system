import approvalService from '../services/approvalService.js';

export async function getPendingApprovals(req, res, next) {
  try {
    const showAll = req.query.all === 'true' || req.query.showAll === 'true';
    const pending = await approvalService.getPendingApprovals({
      companyId: req.companyId,
      userId: req.user.userId,
      userRoleCodes: req.user.roles || [],
      showAll,
    });

    res.json({
      status: 'success',
      count: pending.length,
      data: pending,
    });
  } catch (err) {
    next(err);
  }
}

export async function createApprovalRequest(req, res, next) {
  try {
    const { request_type, record_id, comment } = req.body;
    const request = await approvalService.createRequest({
      companyId: req.companyId,
      requestType: request_type,
      recordId: record_id,
      requestedBy: req.user.userId,
      comment,
    });

    res.status(201).json({
      status: 'success',
      message: 'Approval request submitted successfully',
      data: request,
    });
  } catch (err) {
    next(err);
  }
}

export async function actionApprovalRequest(req, res, next) {
  try {
    const { action, comment, reason, override, adminOverride } = req.body;
    const result = await approvalService.actionRequest({
      companyId: req.companyId,
      requestId: req.params.id,
      actorId: req.user.userId,
      action,
      comment: comment || reason,
      reason,
      override: Boolean(override ?? adminOverride),
      user: req.user,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  getPendingApprovals,
  createApprovalRequest,
  actionApprovalRequest,
};
