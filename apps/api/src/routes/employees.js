import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { salaryMaskMiddleware } from '../middleware/salaryMask.js';
import employeeService from '../services/employeeService.js';
import { hasSalaryAccess } from '../services/serializers.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

router.use(authenticate);

/**
 * GET /api/v1/employees
 * List company employees with server-side filters, search, and pagination.
 * Scopes to department team for DEPT_MANAGER.
 * Strips salary columns for non-salary viewers.
 */
router.get(
  '/',
  requirePermission('employees', 'view'),
  salaryMaskMiddleware,
  async (req, res, next) => {
    try {
      const result = await employeeService.listEmployees({
        companyId: req.companyId,
        query: req.query,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/employees
 * Wizard Step 1: Create Pre-Joined employee.
 */
router.post(
  '/',
  requirePermission('employees', 'create'),
  async (req, res, next) => {
    try {
      const data = await employeeService.createEmployee({
        companyId: req.companyId,
        data: req.body,
        viewer: req.user,
      });

      res.status(201).json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/employees/meta/options
 * Retrieve metadata options for employee filters and wizards.
 */
router.get(
  '/meta/options',
  requirePermission('employees', 'view'),
  async (req, res, next) => {
    try {
      const data = await employeeService.getEmployeeMetaOptions({
        companyId: req.companyId,
      });
      res.json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/employees/:id
 * Retrieve employee profile with bento header metadata and 7-tab payload.
 */
router.get(
  '/:id',
  requirePermission('employees', 'view'),
  salaryMaskMiddleware,
  async (req, res, next) => {
    try {
      const data = await employeeService.getEmployeeById({
        companyId: req.companyId,
        employeeId: req.params.id,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/employees/:id
 * Update employee personal / profile details.
 */
router.put(
  '/:id',
  requirePermission('employees', 'edit'),
  async (req, res, next) => {
    try {
      const data = await employeeService.updateEmployee({
        companyId: req.companyId,
        employeeId: req.params.id,
        data: req.body,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/employees/:id/status
 * Explicit allowed transitions status change (Rule A).
 */
router.post(
  '/:id/status',
  requirePermission('employees', 'edit'),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({
          status: 'error',
          code: 'MISSING_STATUS',
          message: 'Status field is required',
        });
      }

      const data = await employeeService.updateEmployeeStatus({
        companyId: req.companyId,
        employeeId: req.params.id,
        targetStatus: status,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/employees/:id/verify
 * Wizard Step 2: HR Manager verification.
 * Blocks self-verification (Rule G).
 */
router.post(
  '/:id/verify',
  requirePermission('employees', 'edit'),
  async (req, res, next) => {
    try {
      const { action, comment } = req.body;
      const data = await employeeService.verifyEmployee({
        companyId: req.companyId,
        employeeId: req.params.id,
        action: action || 'APPROVE',
        comment,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/employees/:id/activation-check
 * Wizard Step 5: Check 4 activation requirements (Rule A).
 */
router.get(
  '/:id/activation-check',
  requirePermission('employees', 'view'),
  async (req, res, next) => {
    try {
      const data = await employeeService.getActivationCheck({
        companyId: req.companyId,
        employeeId: req.params.id,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/employees/:id/activate
 * Activate employee: validates requirements, creates opening leave allocation, sends self-service invite.
 */
router.post(
  '/:id/activate',
  requirePermission('employees', 'edit'),
  async (req, res, next) => {
    try {
      const data = await employeeService.activateEmployee({
        companyId: req.companyId,
        employeeId: req.params.id,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/employees/:id/contracts
 * Salary History Tab: lists every version of the employee's contracts.
 * Returns 403 for non-salary roles.
 */
router.get(
  '/:id/contracts',
  async (req, res, next) => {
    try {
      if (!hasSalaryAccess(req.user)) {
        return res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN_SALARY_ACCESS',
          message: 'Access denied: Salary History is restricted to authorized salary roles',
        });
      }

      const data = await employeeService.getContracts({
        companyId: req.companyId,
        employeeId: req.params.id,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/employees/:id/contracts
 * Create a new version of the contract (Rule B).
 * Blocks modification inside locked pay periods.
 * Returns 403 for non-salary roles.
 */
router.post(
  '/:id/contracts',
  async (req, res, next) => {
    try {
      if (!hasSalaryAccess(req.user)) {
        return res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN_SALARY_ACCESS',
          message: 'Access denied: Managing contracts and salary is restricted to authorized salary roles',
        });
      }

      const data = await employeeService.createContractVersion({
        companyId: req.companyId,
        employeeId: req.params.id,
        data: req.body,
        viewer: req.user,
      });

      res.status(201).json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/employees/:id/bank-accounts
 * Bank & WPS Tab: returns bank accounts with FULL IBAN.
 * Returns 403 for non-salary roles.
 */
router.get(
  '/:id/bank-accounts',
  async (req, res, next) => {
    try {
      if (!hasSalaryAccess(req.user)) {
        return res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN_SALARY_ACCESS',
          message: 'Access denied: Bank details are restricted to authorized salary roles',
        });
      }

      const data = await employeeService.getBankAccounts({
        companyId: req.companyId,
        employeeId: req.params.id,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/employees/:id/bank-accounts
 * Add or update bank account with UAE IBAN validation (Rule D).
 * Returns 403 for non-salary roles.
 */
router.post(
  '/:id/bank-accounts',
  async (req, res, next) => {
    try {
      if (!hasSalaryAccess(req.user)) {
        return res.status(403).json({
          status: 'error',
          code: 'FORBIDDEN_SALARY_ACCESS',
          message: 'Access denied: Managing bank details is restricted to authorized salary roles',
        });
      }

      const data = await employeeService.saveBankAccount({
        companyId: req.companyId,
        employeeId: req.params.id,
        data: req.body,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/employees/:id/documents
 * UAE Documents Tab: lists all documents.
 * Sensitive numbers masked for non-HR viewers.
 */
router.get(
  '/:id/documents',
  requirePermission('employees', 'view'),
  async (req, res, next) => {
    try {
      const data = await employeeService.getDocuments({
        companyId: req.companyId,
        employeeId: req.params.id,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/employees/:id/documents
 * Upload document with content-type inspection and 10MB limit (Rule C).
 * Supports both multipart form-data and JSON base64 upload.
 */
router.post(
  '/:id/documents',
  requirePermission('employees', 'edit'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      let fileBuffer = req.file?.buffer;
      let originalName = req.file?.originalname;
      let mimeType = req.file?.mimetype;

      // Also support JSON body with base64 encoded file
      if (!fileBuffer && req.body.file_base64) {
        fileBuffer = Buffer.from(req.body.file_base64, 'base64');
        originalName = req.body.file_name || 'document.pdf';
        mimeType = req.body.mime_type;
      }

      const meta = {
        doc_type: req.body.doc_type,
        doc_number: req.body.doc_number,
        issue_date: req.body.issue_date,
        expiry_date: req.body.expiry_date,
        owner_id: req.body.owner_id,
      };

      const data = await employeeService.uploadDocument({
        companyId: req.companyId,
        employeeId: req.params.id,
        file: { buffer: fileBuffer, originalname: originalName, mimetype: mimeType },
        meta,
        viewer: req.user,
      });

      res.status(201).json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/employees/:id/documents/:docId/download
 * Secure document download route (Rule C).
 * Validates authenticated permissions and streams file.
 */
router.get(
  '/:id/documents/:docId/download',
  requirePermission('employees', 'view'),
  async (req, res, next) => {
    try {
      const fileData = await employeeService.downloadDocument({
        companyId: req.companyId,
        employeeId: req.params.id,
        documentId: req.params.docId,
        viewer: req.user,
      });

      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Content-Length', fileData.size);
      res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);

      fileData.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/employees/:id/history
 * History Tab: returns audit logs diffs for employee and associated records (Rule F).
 */
router.get(
  '/:id/history',
  requirePermission('employees', 'view'),
  async (req, res, next) => {
    try {
      const data = await employeeService.getEmployeeHistory({
        companyId: req.companyId,
        employeeId: req.params.id,
        viewer: req.user,
      });

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
