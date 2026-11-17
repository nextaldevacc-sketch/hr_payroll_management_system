import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import approvalController from '../controllers/approvalController.js';

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

router.get('/', requireRole(...APPROVER_ROLES), approvalController.getPendingApprovals);
router.get('/pending', requireRole(...APPROVER_ROLES), approvalController.getPendingApprovals);
router.post('/requests', approvalController.createApprovalRequest);
router.post(
  ['/requests/:id/action', '/requests/:id/actions', '/:id/action', '/:id/actions'],
  requireRole(...APPROVER_ROLES),
  approvalController.actionApprovalRequest
);

export default router;
