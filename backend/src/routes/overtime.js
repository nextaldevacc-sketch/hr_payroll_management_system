import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import overtimeController from '../controllers/overtimeController.js';

const router = Router();
router.use(authenticate);

function authorizeOvertime(allowedRoles = []) {
  return (req, res, next) => {
    const roles = req.user.roles || [];
    const hasRole = roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Permission Denied: Insufficient permissions for overtime operations',
      });
    }
    next();
  };
}

// 1. List Overtime Requests
router.get(
  '/',
  authorizeOvertime(['HR_MANAGER', 'HR_OFFICER', 'DEPT_MANAGER', 'PAYROLL_OFFICER', 'FINANCE']),
  overtimeController.listOvertime
);

// 2. Submit Overtime Request
router.post(
  '/',
  authorizeOvertime(['HR_MANAGER', 'HR_OFFICER', 'DEPT_MANAGER', 'EMPLOYEE']),
  overtimeController.requestOvertime
);

// 3. Act on Overtime Request (Approve as Type / Substitute Day / Refuse)
router.post(
  '/:id/action',
  authorizeOvertime(['DEPT_MANAGER', 'HR_MANAGER']),
  overtimeController.actOnOvertime
);

// 4. Bulk Approve
router.post(
  '/bulk-approve',
  authorizeOvertime(['DEPT_MANAGER', 'HR_MANAGER']),
  overtimeController.bulkApprove
);

export default router;
