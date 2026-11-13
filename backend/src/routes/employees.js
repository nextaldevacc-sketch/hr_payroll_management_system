import { Router } from 'express';
import { safeFileUpload as upload } from '../middleware/fileUpload.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { salaryMaskMiddleware } from '../middleware/salaryMask.js';
import { validate } from '../middleware/validate.js';
import {
  createEmployeeSchema,
  updateStatusSchema,
  verifyEmployeeSchema,
} from '../validators/employeeValidator.js';
import employeeController from '../controllers/employeeController.js';

const router = Router();

router.use(authenticate);

// 1. Employee Directory & CRUD
router.get('/', requirePermission('employees', 'view'), salaryMaskMiddleware, employeeController.listEmployees);
router.post('/', requirePermission('employees', 'create'), validate(createEmployeeSchema), employeeController.createEmployee);
router.get('/meta/options', requirePermission('employees', 'view'), employeeController.getEmployeeMetaOptions);
router.get('/meta/next-code', requirePermission('employees', 'view'), employeeController.getNextEmployeeCode);
router.get('/:id', requirePermission('employees', 'view'), salaryMaskMiddleware, employeeController.getEmployeeById);
router.put('/:id', requirePermission('employees', 'edit'), employeeController.updateEmployee);

// 2. Status & Verification Wizard
router.post('/:id/status', requirePermission('employees', 'edit'), validate(updateStatusSchema), employeeController.updateEmployeeStatus);
router.post('/:id/verify', requirePermission('employees', 'verify'), validate(verifyEmployeeSchema), employeeController.verifyEmployee);
router.get('/:id/activation-check', requirePermission('employees', 'view'), employeeController.getActivationCheck);
router.post('/:id/activate', requirePermission('employees', 'edit'), employeeController.activateEmployee);
router.post('/:id/create-login', requirePermission('employees', 'edit'), employeeController.createEmployeeLogin);
router.post('/:id/reveal-sensitive', requirePermission('employees', 'view'), employeeController.revealSensitiveField);
router.post('/:id/branch-change', requirePermission('employees', 'edit'), employeeController.requestBranchChange);

// 3. Contracts & Salary Versions (Role-restricted)
router.get('/:id/contracts', employeeController.getContracts);
router.post('/:id/contracts', employeeController.createContractVersion);
router.post('/:id/contracts/:contractId/approve', employeeController.approveContractVersion);
router.post('/:id/contracts/:contractId/reject', employeeController.rejectContractVersion);

// 4. Bank Accounts (Role-restricted)
router.get('/:id/bank-accounts', employeeController.getBankAccounts);
router.post('/:id/bank-accounts', employeeController.saveBankAccount);

// 5. Documents & Uploads
router.get('/:id/documents', requirePermission('employees', 'view'), employeeController.getDocuments);
router.post('/:id/documents', requirePermission('employees', 'edit'), upload.single('file'), employeeController.uploadDocument);
router.get('/:id/documents/:docId/download', requirePermission('employees', 'view'), employeeController.downloadDocument);

// 6. Audit History
router.get('/:id/history', requirePermission('employees', 'view'), employeeController.getEmployeeHistory);
router.get('/:id/audit-history', requirePermission('employees', 'view'), employeeController.getEmployeeHistory);

export default router;
