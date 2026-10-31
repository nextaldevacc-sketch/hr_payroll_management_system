import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import auditController from '../controllers/auditController.js';

const router = Router();
router.use(authenticate);

// Read-only audit routes (HR Manager, GM, Company Admin only per Section 5.3)
router.get('/', requirePermission('audit', 'view'), auditController.listLogs);
router.get('/logs', requirePermission('audit', 'view'), auditController.listLogs);
router.get('/export.csv', requirePermission('audit', 'view'), auditController.exportCsv);

export default router;

