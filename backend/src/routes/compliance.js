import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import complianceController from '../controllers/complianceController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.use(authenticate);

// 1. Overview & Statistics
router.get('/overview', requirePermission('employees', 'view'), complianceController.getOverview);

// 2. Document Tracker list
router.get('/documents', requirePermission('employees', 'view'), complianceController.listDocuments);

// 3. Document Renewal (owner or HR)
router.post('/documents/:id/renew', upload.single('file'), complianceController.renewDocument);

// 4. Document Verification (HR)
router.post('/documents/:id/verify', requirePermission('employees', 'edit'), complianceController.verifyDocument);

// 5. Renewal & Verification History
router.get('/documents/:id/history', requirePermission('employees', 'view'), complianceController.getDocumentHistory);

// 6. Trigger Nightly Compliance Job manually (HR / Admin)
router.post('/trigger-job', requirePermission('employees', 'edit'), complianceController.triggerJob);

export default router;

