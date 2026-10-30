import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import {
  calculateSettlement,
  prepareSettlement,
  validateSettlement,
  approveSettlement,
  markSettlementPaid,
  getSettlement,
  downloadSettlementPdf,
  downloadGratuityProvisionExcel,
  downloadLeaveLiabilityExcel,
} from '../controllers/settlementController.js';

const router = express.Router();

router.use(authenticate);

// Strictly restrict settlement routes to roles with salary view permission (Section 5.3)
router.use(requirePermission('salary', 'view'));

// Reports
router.get('/reports/gratuity-provision', downloadGratuityProvisionExcel);
router.get('/reports/leave-liability', downloadLeaveLiabilityExcel);

// Calculations & Lifecycle
router.post('/calculate/:separationId', calculateSettlement);
router.post('/prepare/:separationId', prepareSettlement);
router.post('/:id/validate', validateSettlement);
router.post('/:id/approve', approveSettlement);
router.post('/:id/pay', markSettlementPaid);

// Read & PDF
router.get('/:id', getSettlement);
router.get('/:id/pdf', downloadSettlementPdf);

export default router;

