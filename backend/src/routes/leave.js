import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import leaveController from '../controllers/leaveController.js';

const router = Router();
router.use(authenticate);

function authorizeLeave(allowedRoles = []) {
  return (req, res, next) => {
    const roles = req.user.roles || [];
    const hasRole = roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Permission Denied: Insufficient permissions for leave operations',
      });
    }
    next();
  };
}

// 1. Leave Types Catalog
router.get('/types', leaveController.listLeaveTypes);

// 2. Leave Balances
router.get(
  '/balances',
  authorizeLeave(['EMPLOYEE', 'HR_OFFICER', 'HR_MANAGER', 'DEPT_MANAGER', 'PAYROLL_OFFICER', 'GM']),
  leaveController.getLeaveBalances
);

// 3. Leave Requests
router.get(
  '/requests',
  authorizeLeave(['EMPLOYEE', 'HR_OFFICER', 'HR_MANAGER', 'DEPT_MANAGER', 'GM', 'PAYROLL_OFFICER']),
  leaveController.listLeaveRequests
);

router.post(
  '/requests',
  authorizeLeave(['EMPLOYEE', 'HR_OFFICER', 'HR_MANAGER']),
  leaveController.requestLeave
);

router.post(
  '/requests/:id/action',
  authorizeLeave(['DEPT_MANAGER', 'HR_OFFICER', 'HR_MANAGER', 'GM', 'EMPLOYEE']),
  leaveController.actOnLeave
);

export default router;
