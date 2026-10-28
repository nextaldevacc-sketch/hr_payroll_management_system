import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';
import {
  inviteUserSchema,
  updateRolesSchema,
  updateUserStatusSchema,
} from '../validators/userValidator.js';
import userController from '../controllers/userController.js';

const router = Router();

router.use(authenticate, requireRole('COMPANY_ADMIN', 'HR_MANAGER'));

router.get('/roles', userController.listRoles);
router.get('/users', userController.listUsers);
router.post('/users/invite', validate(inviteUserSchema), userController.inviteUser);
router.put('/users/:id/roles', validate(updateRolesSchema), userController.updateUserRoles);
router.post('/users/bulk-create-employees', userController.bulkCreateEmployeeLogins);
router.patch('/users/:id/status', validate(updateUserStatusSchema), userController.updateUserStatus);
router.post('/users/:id/unlock', userController.unlockUser);

export default router;
