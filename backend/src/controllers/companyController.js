import companyService from '../services/companyService.js';
import prisma from '../lib/prisma.js';

export async function listCompanies(req, res, next) {
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
}

export async function getCompany(req, res, next) {
  try {
    const company = await companyService.getCompany(req.params.id);
    res.json({
      status: 'success',
      data: company,
    });
  } catch (err) {
    next(err);
  }
}

export async function createCompany(req, res, next) {
  try {
    const result = await companyService.createCompanyWithDefaults({
      ...req.body,
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
}

export async function updateCompanyStatus(req, res, next) {
  try {
    const updated = await companyService.updateCompanyStatus({
      companyId: req.params.id,
      status: req.body.status,
      platformUserId: req.user.userId,
    });

    res.json({
      status: 'success',
      message: `Company status updated to '${req.body.status}'`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCompanySupportData(req, res, next) {
  try {
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
}

export async function createSupportGrant(req, res, next) {
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
}

export async function revokeSupportGrant(req, res, next) {
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
}

export default {
  listCompanies,
  getCompany,
  createCompany,
  updateCompanyStatus,
  getCompanySupportData,
  createSupportGrant,
  revokeSupportGrant,
};
