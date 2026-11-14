import userService from '../services/userService.js';
import mfaService from '../services/mfaService.js';
import prisma from '../lib/prisma.js';

export async function listRoles(req, res, next) {
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
}

export async function listUsers(req, res, next) {
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
}

export async function inviteUser(req, res, next) {
  try {
    const companyId = req.companyId;
    const { email, employee_id, role_assignments } = req.body;

    const result = await userService.inviteUser({
      companyId,
      email,
      employeeId: employee_id,
      roleAssignments: role_assignments || [{ roleCode: 'EMPLOYEE', scopeType: 'Company' }],
      invitedBy: req.user.userId || req.user.id || null,
    });

    res.status(201).json({
      status: 'success',
      message: `User '${email}' invited successfully`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRoles(req, res, next) {
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
}

export async function getBulkCreatePreview(req, res, next) {
  try {
    const companyId = req.companyId;
    const result = await userService.getBulkCreatePreview({ companyId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function bulkCreateEmployeeLogins(req, res, next) {
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
}

export async function updateUserStatus(req, res, next) {
  try {
    const companyId = req.companyId;
    const { status } = req.body;

    if (req.user?.userId === req.params.id && status === 'Disabled') {
      return res.status(400).json({
        status: 'error',
        code: 'CANNOT_DEACTIVATE_SELF',
        message: 'You cannot deactivate your own account',
      });
    }

    const updated = await userService.updateUserStatus({
      companyId,
      userId: req.params.id,
      status,
      updatedBy: req.user?.userId,
    });

    res.json({
      status: 'success',
      message: `User status changed to '${status}'`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function unlockUser(req, res, next) {
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
}

export async function resetMfa(req, res, next) {
  try {
    const adminUserId = req.user.userId;
    const targetUserId = req.params.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    const result = await mfaService.resetUserMfaByAdmin(adminUserId, targetUserId, { ipAddress });

    res.json({
      status: 'success',
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  listRoles,
  listUsers,
  inviteUser,
  updateUserRoles,
  getBulkCreatePreview,
  bulkCreateEmployeeLogins,
  updateUserStatus,
  unlockUser,
  resetMfa,
};
