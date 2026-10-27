import { Router } from 'express';
import userService from '../services/userService.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import prisma from '../prisma/client.js';

const router = Router();

// Require authenticated user with COMPANY_ADMIN or HR_MANAGER
router.use(authenticate, requireRole('COMPANY_ADMIN', 'HR_MANAGER'));

/**
 * GET /api/v1/company/roles
 * Catalog of the 8 roles with names and salary visibility
 */
router.get('/roles', async (req, res, next) => {
  try {
    const roles = await prisma.$base().roles.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({
      status: 'success',
      data: roles,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/company/users
 * List users belonging to the authenticated user's company
 */
router.get('/users', async (req, res, next) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_COMPANY_ID',
        message: 'Company context required',
      });
    }

    const users = await userService.listUsers(companyId);
    res.json({
      status: 'success',
      count: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/company/users/invite
 * Invite a user and assign one or more of the 7 roles, with scope
 */
router.post('/users/invite', async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { email, employee_id, role_assignments } = req.body;

    const result = await userService.inviteUser({
      companyId,
      email,
      employeeId: employee_id,
      roleAssignments: role_assignments || [{ roleCode: 'EMPLOYEE', scopeType: 'Company' }],
      invitedBy: req.user.userId,
    });

    res.status(201).json({
      status: 'success',
      message: `User '${email}' invited successfully`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/company/users/:id/roles
 * Update roles and scopes for a user
 */
router.put('/users/:id/roles', async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { role_assignments } = req.body;

    const updated = await userService.updateUserRoles({
      companyId,
      userId: req.params.id,
      roleAssignments: role_assignments || [],
      updatedBy: req.user.userId,
    });

    res.json({
      status: 'success',
      message: 'User roles updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/company/users/bulk-create-employees
 * Bulk-create employee logins for active employees without accounts
 */
router.post('/users/bulk-create-employees', async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const result = await userService.bulkCreateEmployeeLogins({
      companyId,
      createdBy: req.user.userId,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/company/users/:id/status
 * Activate or Disable a user
 */
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { status } = req.body;

    const updated = await userService.updateUserStatus({
      companyId,
      userId: req.params.id,
      status,
      updatedBy: req.user.userId,
    });

    res.json({
      status: 'success',
      message: `User status changed to '${status}'`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/company/users/:id/unlock
 * Unlock a locked user account (resets failed attempts and lockout timer)
 */
router.post('/users/:id/unlock', async (req, res, next) => {
  try {
    const companyId = req.companyId;

    const updated = await userService.unlockUser({
      companyId,
      userId: req.params.id,
      updatedBy: req.user.userId,
    });

    res.json({
      status: 'success',
      message: 'User account unlocked successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
