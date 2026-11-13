import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import auditService from './auditService.js';
import authService from './authService.js';
import { invalidateUserSession } from '../middleware/authCache.js';

export class UserService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  /**
   * List users for a company
   */
  async listUsers(companyId) {
    const users = await this.prisma.$base().users.findMany({
      where: { company_id: companyId },
      include: {
        employee: {
          select: {
            id: true,
            employee_code: true,
            name: true,
            arabic_name: true,
            work_email: true,
          },
        },
        user_roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      status: u.status,
      failed_logins: u.failed_logins,
      locked_until: u.locked_until,
      is_locked: Boolean(u.locked_until && u.locked_until > new Date()),
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      employee: u.employee,
      roles: u.user_roles.map((ur) => ({
        role_id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
        sees_salary: ur.role.sees_salary,
        scope_type: ur.scope_type,
        scope_id: ur.scope_id,
      })),
    }));
  }

  async validateScopeAssignment(companyId, scopeType, scopeId) {
    if (!scopeType || scopeType === 'Company') return;
    if (!scopeId || scopeId === 'All') {
      const err = new Error(`scope_id is required when scope_type is '${scopeType}'`);
      err.status = 400;
      err.code = 'INVALID_SCOPE';
      throw err;
    }
    if (scopeType === 'CompanyVisa') {
      const visa = await this.prisma.$base().company_visas.findFirst({
        where: { id: scopeId, company_id: companyId },
      });
      if (!visa) {
        const err = new Error('Specified company visa does not belong to your company');
        err.status = 400;
        err.code = 'INVALID_VISA';
        throw err;
      }
    } else if (scopeType === 'Branch') {
      const branch = await this.prisma.$base().branches.findFirst({
        where: { id: scopeId, company_id: companyId },
      });
      if (!branch) {
        const err = new Error('Specified branch does not belong to your company');
        err.status = 400;
        err.code = 'INVALID_BRANCH';
        throw err;
      }
    } else if (scopeType === 'Department') {
      const dept = await this.prisma.$base().departments.findFirst({
        where: { id: scopeId, company_id: companyId },
      });
      if (!dept) {
        const err = new Error('Specified department does not belong to your company');
        err.status = 400;
        err.code = 'INVALID_DEPARTMENT';
        throw err;
      }
    }
  }

  /**
   * Invite a user to the company and assign one or more roles and scopes
   */
  async inviteUser({
    companyId,
    email,
    employeeId = null,
    roleAssignments = [], // [{ roleCode, scopeType: 'Company' | 'CompanyVisa' | 'Branch' | 'Department', scopeId }]
    invitedBy,
  }) {
    if (!companyId || !email) {
      const err = new Error('companyId and email are required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const cleanEmail = email.trim().toLowerCase();

    // A5: If only EMPLOYEE role is assigned, an employee record must be linked
    const isOnlyEmployeeRole = Array.isArray(roleAssignments) &&
      roleAssignments.length === 1 &&
      roleAssignments[0].roleCode === 'EMPLOYEE';

    if (isOnlyEmployeeRole && !employeeId) {
      const err = new Error('Inviting a user with only the Employee role must be linked to an existing employee record.');
      err.status = 400;
      err.code = 'EMPLOYEE_LINK_REQUIRED';
      throw err;
    }

    // Check if email already registered
    const existing = await this.prisma.$base().users.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      const err = new Error(`User with email '${cleanEmail}' is already registered`);
      err.status = 400;
      err.code = 'EMAIL_EXISTS';
      throw err;
    }

    // Default temporary password
    const tempPassword = 'Tmp!' + crypto.randomBytes(6).toString('hex') + 'A9';
    const passwordHash = await authService.hashPassword(tempPassword);

    const user = await this.prisma.$base().users.create({
      data: {
        company_id: companyId,
        email: cleanEmail,
        employee_id: employeeId || null,
        password_hash: passwordHash,
        status: 'Active',
        must_change_password: true,
        created_by: invitedBy,
      },
    });

    // Validate all scope assignments first
    for (const assignment of roleAssignments) {
      await this.validateScopeAssignment(companyId, assignment.scopeType, assignment.scopeId);
    }

    // Assign roles
    const assignedRoles = [];
    for (const assignment of roleAssignments) {
      const role = await this.prisma.$base().roles.findUnique({
        where: { code: assignment.roleCode },
      });

      if (role) {
        const ur = await this.prisma.$base().user_roles.create({
          data: {
            company_id: companyId,
            user_id: user.id,
            role_id: role.id,
            scope_type: assignment.scopeType || 'Company',
            scope_id: assignment.scopeId || null,
            created_by: invitedBy,
          },
          include: { role: true },
        });
        assignedRoles.push(ur);
      }
    }

    const inviteToken = await authService.generateInviteToken(user);
    const emailDeliveryFailed = Boolean(authService.lastInviteDeliveryFailed);

    await auditService.log({
      companyId,
      userId: invitedBy,
      action: 'INVITE_USER',
      tableName: 'users',
      recordId: user.id,
      newValues: {
        email: cleanEmail,
        employeeId,
        roles: roleAssignments.map((r) => r.roleCode),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        roles: assignedRoles.map((ur) => ({
          code: ur.role.code,
          name: ur.role.name,
          scope_type: ur.scope_type,
          scope_id: ur.scope_id,
        })),
      },
      inviteToken,
      inviteUrl: `/login?tab=invite&token=${inviteToken}`,
      tempPassword,
      emailDeliveryFailed,
    };
  }

  /**
   * Update a user's roles and scopes
   */
  async updateUserRoles({ companyId, userId, roleAssignments = [], updatedBy }) {
    const user = await this.prisma.$base().users.findUnique({
      where: { id: userId },
    });

    if (!user || user.company_id !== companyId) {
      const err = new Error('User not found in this company');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Validate all scope assignments first
    for (const assignment of roleAssignments) {
      await this.validateScopeAssignment(companyId, assignment.scopeType, assignment.scopeId);
    }

    // Remove existing roles for this user in this company
    await this.prisma.$base().user_roles.deleteMany({
      where: {
        company_id: companyId,
        user_id: userId,
      },
    });

    // Add new assignments
    const newAssigned = [];
    for (const assignment of roleAssignments) {
      const role = await this.prisma.$base().roles.findUnique({
        where: { code: assignment.roleCode },
      });

      if (role) {
        const ur = await this.prisma.$base().user_roles.create({
          data: {
            company_id: companyId,
            user_id: userId,
            role_id: role.id,
            scope_type: assignment.scopeType || 'Company',
            scope_id: assignment.scopeId || null,
            created_by: updatedBy,
          },
          include: { role: true },
        });
        newAssigned.push(ur);
      }
    }

    // Bump user token_version so existing sessions reflect new permissions
    await this.prisma.$base().users.update({
      where: { id: userId },
      data: { token_version: { increment: 1 } },
    });

    invalidateUserSession(userId);

    await auditService.log({
      companyId,
      userId: updatedBy,
      action: 'UPDATE_ROLES',
      tableName: 'user_roles',
      recordId: userId,
      newValues: { roles: roleAssignments },
    });

    return newAssigned;
  }

  /**
   * Preview bulk-create employee logins: returns eligible and skipped employees with reasons
   */
  async getBulkCreatePreview({ companyId }) {
    const allEmployees = await this.prisma.$base().employees.findMany({
      where: { company_id: companyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            password_hash: true,
          },
        },
      },
      orderBy: { employee_code: 'asc' },
    });

    const eligible = [];
    const skipped = [];

    for (const emp of allEmployees) {
      const hasActiveLogin = emp.user && emp.user.password_hash !== 'UNINITIALIZED_INVITE';
      if (emp.status === 'Terminated' || emp.status === 'Suspended') {
        skipped.push({
          id: emp.id,
          name: emp.name,
          employeeCode: emp.employee_code,
          email: emp.work_email || null,
          reason: 'inactive',
        });
      } else if (hasActiveLogin) {
        skipped.push({
          id: emp.id,
          name: emp.name,
          employeeCode: emp.employee_code,
          email: emp.work_email || null,
          reason: 'already has login',
        });
      } else if (!emp.work_email || !emp.work_email.trim()) {
        skipped.push({
          id: emp.id,
          name: emp.name,
          employeeCode: emp.employee_code,
          email: null,
          reason: 'no email',
        });
      } else {
        eligible.push({
          id: emp.id,
          name: emp.name,
          employeeCode: emp.employee_code,
          email: emp.work_email.trim(),
        });
      }
    }

    return {
      totalEmployees: allEmployees.length,
      eligibleCount: eligible.length,
      skippedCount: skipped.length,
      eligible,
      skipped,
    };
  }

  /**
   * Bulk-create employee logins for employees without user accounts
   */
  async bulkCreateEmployeeLogins({ companyId, createdBy }) {
    const preview = await this.getBulkCreatePreview({ companyId });
    const eligibleEmployees = preview.eligible;

    const employeeRole = await this.prisma.$base().roles.findUnique({
      where: { code: 'EMPLOYEE' },
    });

    if (!employeeRole) {
      const err = new Error('Employee role definition not found');
      err.status = 500;
      err.code = 'CONFIG_ERROR';
      throw err;
    }

    const createdUsers = [];
    const errors = [];

    for (const emp of eligibleEmployees) {
      const email = emp.email.toLowerCase();

      try {
        const existing = await this.prisma.$base().users.findUnique({
          where: { email },
        });

        if (existing) {
          if (existing.password_hash === 'UNINITIALIZED_INVITE') {
            const tempPassword = 'Tmp!' + crypto.randomBytes(6).toString('hex') + 'A9';
            const passwordHash = await authService.hashPassword(tempPassword);
            await this.prisma.$base().users.update({
              where: { id: existing.id },
              data: {
                password_hash: passwordHash,
                must_change_password: true,
                status: 'Active',
                employee_id: emp.id,
              },
            });

            const existingRole = await this.prisma.$base().user_roles.findFirst({
              where: { user_id: existing.id, role_id: employeeRole.id },
            });
            if (!existingRole) {
              await this.prisma.$base().user_roles.create({
                data: {
                  company_id: companyId,
                  user_id: existing.id,
                  role_id: employeeRole.id,
                  scope_type: 'Self',
                  created_by: createdBy,
                },
              });
            }

            const token = await authService.generateInviteToken(existing);
            createdUsers.push({
              userId: existing.id,
              employeeId: emp.id,
              employeeCode: emp.employeeCode,
              email: existing.email,
              tempPassword,
              inviteToken: token,
              inviteUrl: `/login?tab=invite&token=${token}`,
            });
            continue;
          }

          if (!existing.employee_id) {
            await this.prisma.$base().users.update({
              where: { id: existing.id },
              data: { employee_id: emp.id },
            });
          }
          continue;
        }

        const tempPassword = 'Tmp!' + crypto.randomBytes(6).toString('hex') + 'A9';
        const passwordHash = await authService.hashPassword(tempPassword);

        const newUser = await this.prisma.$base().users.create({
          data: {
            company_id: companyId,
            employee_id: emp.id,
            email,
            password_hash: passwordHash,
            status: 'Active',
            must_change_password: true,
            created_by: createdBy,
          },
        });

        await this.prisma.$base().user_roles.create({
          data: {
            company_id: companyId,
            user_id: newUser.id,
            role_id: employeeRole.id,
            scope_type: 'Self',
            created_by: createdBy,
          },
        });

        const token = await authService.generateInviteToken(newUser);
        createdUsers.push({
          userId: newUser.id,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          email,
          tempPassword,
          inviteToken: token,
          inviteUrl: `/login?tab=invite&token=${token}`,
        });
      } catch (err) {
        errors.push({ employee_id: emp.id, email, error: err.message });
      }
    }

    await auditService.log({
      companyId,
      userId: createdBy,
      action: 'BULK_CREATE_LOGINS',
      tableName: 'users',
      recordId: companyId,
      newValues: { created_count: createdUsers.length, error_count: errors.length },
    });

    return {
      status: 'success',
      total_eligible: eligibleEmployees.length,
      created_count: createdUsers.length,
      users: createdUsers,
      skipped: preview.skipped,
      errors,
    };
  }

  /**
   * Update user status (Active / Disabled / Unlock)
   */
  async updateUserStatus({ companyId, userId, status, updatedBy }) {
    const user = await this.prisma.$base().users.findUnique({
      where: { id: userId },
    });

    if (!user || user.company_id !== companyId) {
      const err = new Error('User not found in this company');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const data = {
      status,
      token_version: { increment: 1 },
    };
    if (status === 'Active') {
      data.locked_until = null;
      data.failed_logins = 0;
    } else if (status === 'Disabled') {
      data.deactivated_at = new Date();
    }

    const updated = await this.prisma.$base().users.update({
      where: { id: userId },
      data,
    });

    invalidateUserSession(userId);

    await auditService.log({
      companyId,
      userId: updatedBy,
      action: `USER_STATUS_${status.toUpperCase()}`,
      tableName: 'users',
      recordId: userId,
      oldValues: { status: user.status },
      newValues: { status },
    });

    return updated;
  }

  /**
   * Unlock a locked user account (resets failure counter and lockout timer)
   */
  async unlockUser({ companyId, userId, updatedBy }) {
    const user = await this.prisma.$base().users.findUnique({
      where: { id: userId },
    });

    if (!user || user.company_id !== companyId) {
      const err = new Error('User not found in this company');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await this.prisma.$base().users.update({
      where: { id: userId },
      data: {
        status: 'Active',
        failed_logins: 0,
        locked_until: null,
        token_version: { increment: 1 },
      },
    });

    invalidateUserSession(userId);

    await auditService.log({
      companyId,
      userId: updatedBy,
      action: 'UNLOCK_USER',
      tableName: 'users',
      recordId: userId,
      oldValues: { failed_logins: user.failed_logins, locked_until: user.locked_until, status: user.status },
      newValues: { failed_logins: 0, locked_until: null, status: 'Active' },
    });

    return updated;
  }
}

export const userService = new UserService();
export default userService;
