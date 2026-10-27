import { Router } from 'express';
import approvalService from '../services/approvalService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/approvals/pending
 * Retrieve pending requests awaiting action from the logged-in user
 */
router.get('/pending', async (req, res, next) => {
  try {
    const pending = await approvalService.getPendingApprovals({
      companyId: req.companyId,
      userId: req.user.userId,
      userRoleCodes: req.user.roles || [],
    });

    res.json({
      status: 'success',
      count: pending.length,
      data: pending,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/approvals/requests
 * Create a new approval request
 */
router.post('/requests', async (req, res, next) => {
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
});

/**
 * POST /api/v1/approvals/requests/:id/action
 * Approve or Reject an approval request
 * Enforces rule: "Nobody approves their own request"
 */
router.post('/requests/:id/action', async (req, res, next) => {
  try {
    const { action, comment } = req.body;
    const result = await approvalService.actionRequest({
      companyId: req.companyId,
      requestId: req.params.id,
      actorId: req.user.userId,
      action,
      comment,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
