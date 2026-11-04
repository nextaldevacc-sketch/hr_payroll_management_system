import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import approvalController from '../controllers/approvalController.js';

const router = Router();

router.use(authenticate);

router.get('/', approvalController.getPendingApprovals);
router.get('/pending', approvalController.getPendingApprovals);
router.post('/requests', approvalController.createApprovalRequest);
router.post('/requests/:id/action', approvalController.actionApprovalRequest);
router.post('/:id/action', approvalController.actionApprovalRequest);

export default router;
