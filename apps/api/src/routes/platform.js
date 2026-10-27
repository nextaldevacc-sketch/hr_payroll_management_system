import { Router } from 'express';
import companyService from '../services/companyService.js';
import { authenticate } from '../middleware/auth.js';
import { requirePlatformAdmin, requireSupportGrant } from '../middleware/permissions.js';
import prisma from '../prisma/client.js';

const router = Router();

// All platform routes require authentication and Platform Admin role
router.use(authenticate, requirePlatformAdmin);

/**
 * GET /api/v1/platform/companies
 * List companies on the platform with metrics and admin info
 */
router.get('/companies', async (req, res, next) => {
  try {
    const companies = await companyService.listCompanies();
    res.json({
      status: 'success',
      count: companies.length,
      data: companies,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/platform/companies/:id
 * Retrieve specific company details
 */
router.get('/companies/:id', async (req, res, next) => {
  try {
    const company = await companyService.getCompany(req.params.id);
    res.json({
      status: 'success',
      data: company,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/platform/companies
 * Create a new company with UAE defaults and invite company admin (FR-PL1)
 */
router.post('/companies', async (req, res, next) => {
  try {
    const {
      name,
      name_ar,
      trade_license_no,
      emirate,
      mol_establishment_id,
      bank_routing_code,
      admin_email,
      admin_name,
      default_cutoff_day,
    } = req.body;

    const result = await companyService.createCompanyWithDefaults({
      name,
      name_ar,
      trade_license_no,
      emirate,
      mol_establishment_id,
      bank_routing_code,
      admin_email,
      admin_name,
      default_cutoff_day,
      platformUserId: req.user.userId,
    });

    res.status(201).json({
      status: 'success',
      message: 'Company created with UAE defaults and company admin invited',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/platform/companies/:id/status
 * Suspend or reactivate a company (FR-PL2)
 */
router.patch('/companies/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await companyService.updateCompanyStatus({
      companyId: req.params.id,
      status,
      platformUserId: req.user.userId,
    });

    res.json({
      status: 'success',
      message: `Company status updated to '${status}'`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/platform/companies/:id/data
 * Access company employee and salary data (FR-PL3: requires time-limited support grant)
 */
router.get('/companies/:id/data', requireSupportGrant, async (req, res, next) => {
  try {
    // If support grant is verified, platform admin is authorized to view company data
    const companyId = req.params.id;
    const employees = await prisma.$base().employees.findMany({
      where: { company_id: companyId },
      include: {
        contracts: {
          where: { status: 'Approved' },
          take: 1,
        },
      },
    });

    res.json({
      status: 'success',
      support_grant: {
        id: req.supportGrant.id,
        reason: req.supportGrant.reason,
        ends_at: req.supportGrant.ends_at,
      },
      count: employees.length,
      data: employees,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/platform/companies/:id/support-grants
 * Grant time-limited support access (e.g. 2 hours)
 */
router.post('/companies/:id/support-grants', async (req, res, next) => {
  try {
    const { platform_user_id, granted_by, reason, hours } = req.body;
    const grant = await companyService.grantSupportAccess({
      companyId: req.params.id,
      platformUserId: platform_user_id || req.user.userId,
      grantedBy: granted_by || req.user.userId,
      reason: reason || 'Platform customer support troubleshooting',
      durationHours: hours || 2,
    });

    res.status(201).json({
      status: 'success',
      message: 'Support access grant created',
      data: grant,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/platform/support-grants/:id
 * Revoke support access grant
 */
router.delete('/support-grants/:id', async (req, res, next) => {
  try {
    const revoked = await companyService.revokeSupportAccess({
      grantId: req.params.id,
      revokedBy: req.user.userId,
    });

    res.json({
      status: 'success',
      message: 'Support access grant revoked',
      data: revoked,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
