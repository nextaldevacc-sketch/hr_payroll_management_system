import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/permissions.js';
import {
  calculateSettlement,
  prepareSettlement,
  validateSettlement,
  approveSettlement,
  markSettlementPaid,
  getSettlement,
  getSettlementBySeparation,
  downloadSettlementPdf,
  downloadGratuityProvisionExcel,
  downloadLeaveLiabilityExcel,
} from '../controllers/settlementController.js';

const router = express.Router();

router.use(authenticate);

// Strictly restrict settlement routes to roles with salary view permission (Section 5.3)
router.use(requirePermission('salary', 'view'));

// Reports
router.get(
  '/reports/gratuity-provision',
  requireRole('HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE', 'GM', 'COMPANY_ADMIN'),
  downloadGratuityProvisionExcel
);
router.get(
  '/reports/leave-liability',
  requireRole('HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE', 'GM', 'COMPANY_ADMIN'),
  downloadLeaveLiabilityExcel
);

// Calculations & Lifecycle (Granular RBAC + Segregation of Duties)
router.post(
  '/calculate/:separationId',
  requireRole('HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE', 'COMPANY_ADMIN'),
  calculateSettlement
);
router.post(
  '/prepare/:separationId',
  requireRole('HR_OFFICER', 'PAYROLL_OFFICER', 'COMPANY_ADMIN'),
  prepareSettlement
);
router.post(
  '/:id/validate',
  requireRole('HR_MANAGER', 'COMPANY_ADMIN'),
  validateSettlement
);
router.post(
  '/:id/approve',
  requireRole('GM', 'COMPANY_ADMIN'),
  approveSettlement
);
router.post(
  '/:id/pay',
  requireRole('FINANCE', 'COMPANY_ADMIN'),
  markSettlementPaid
);

// Read & PDF
router.get('/by-separation/:separationId', getSettlementBySeparation);
router.get('/:id', getSettlement);
router.get('/:id/pdf', downloadSettlementPdf);

export default router;

