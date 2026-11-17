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

// Rejections Audit Log (Step 8)
router.get('/rejections/export/csv', rejectionController.exportRejectionsCsv);
router.get('/rejections/:id', rejectionController.getRejection);
router.get('/rejections', rejectionController.listRejections);

router.get('/', requireRole(...APPROVER_ROLES), approvalController.getPendingApprovals);
router.get('/pending', requireRole(...APPROVER_ROLES), approvalController.getPendingApprovals);
router.post('/requests', approvalController.createApprovalRequest);
router.post(
  ['/requests/:id/action', '/requests/:id/actions', '/:id/action', '/:id/actions'],
  requireRole(...APPROVER_ROLES),
  approvalController.actionApprovalRequest
);

export default router;
