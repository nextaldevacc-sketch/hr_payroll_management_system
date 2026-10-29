import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import notificationController from '../controllers/notificationController.js';

const router = Router();
router.use(authenticate);

router.get('/', notificationController.getMyNotifications);
router.patch('/:id/read', notificationController.markNotificationRead);
router.post('/mark-all-read', notificationController.markAllNotificationsRead);

export default router;

