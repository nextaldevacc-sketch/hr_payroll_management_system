import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import approvalController from '../controllers/approvalController.js';
import rejectionController from '../controllers/rejectionController.js';

const router = Router();

router.use(authenticate);

const APPROVER_ROLES = [
  'HR_OFFICER',
  'HR_MANAGER',
  'DEPT_MANAGER',
  'GM',
  'FINANCE',
  'COMPANY_ADMIN',
  'PAYROLL_OFFICER',
];

const REJECTION_LOG_ROLES = [
  'HR_OFFICER',
  'HR_MANAGER',
  'GM',
  'COMPANY_ADMIN',
];

// Rejections Audit Log (Step 8 & Prompt 2 Step 1: Restrict company-wide log to HR, GM & Admin)
router.get(
  '/rejections/export/csv',
  requireRole(...REJECTION_LOG_ROLES),
  rejectionController.exportRejectionsCsv
);
router.get(
  '/rejections/:id',
  requireRole(...REJECTION_LOG_ROLES),
  rejectionController.getRejection
);
router.get(
  '/rejections',
  requireRole(...REJECTION_LOG_ROLES),
  rejectionController.listRejections
);

router.get('/', requireRole(...APPROVER_ROLES), approvalController.getPendingApprovals);
router.get('/pending', requireRole(...APPROVER_ROLES), approvalController.getPendingApprovals);
router.post('/requests', approvalController.createApprovalRequest);
router.post(
  ['/requests/:id/action', '/requests/:id/actions', '/:id/action', '/:id/actions'],
  requireRole(...APPROVER_ROLES),
  approvalController.actionApprovalRequest
);

export default router;
