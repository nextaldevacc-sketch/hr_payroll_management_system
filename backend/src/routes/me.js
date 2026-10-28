import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import meController from '../controllers/meController.js';

const router = Router();
router.use(authenticate);

// 1. Employee personal attendance
router.get('/attendance', meController.getMyAttendance);

// 2. Employee personal leave balances & history
router.get('/leave', meController.getMyLeave);

// 3. Employee combined requests & submission
router.get('/requests', meController.getMyRequests);
router.post('/requests', meController.submitMyRequest);

export default router;
