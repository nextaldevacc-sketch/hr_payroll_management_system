import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePlatformAdmin, requireSupportGrant } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';
import {
  createCompanySchema,
  updateCompanyStatusSchema,
  supportGrantSchema,
} from '../validators/companyValidator.js';
import companyController from '../controllers/companyController.js';

const router = Router();

router.use(authenticate, requirePlatformAdmin);

router.get('/companies', companyController.listCompanies);
router.get('/companies/:id', companyController.getCompany);
router.post('/companies', validate(createCompanySchema), companyController.createCompany);
router.patch('/companies/:id/status', validate(updateCompanyStatusSchema), companyController.updateCompanyStatus);
router.get('/companies/:id/data', requireSupportGrant, companyController.getCompanySupportData);
router.post('/companies/:id/support-grants', validate(supportGrantSchema), companyController.createSupportGrant);
router.delete('/support-grants/:id', companyController.revokeSupportGrant);

export default router;
