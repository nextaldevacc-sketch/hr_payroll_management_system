import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().email('Valid email address is required'),
  employee_id: z.string().optional().nullable(),
  role_assignments: z.array(
    z.object({
      roleCode: z.string().min(1, 'roleCode is required'),
      scopeType: z.enum(['Company', 'Branch', 'Department', 'Self']).default('Company'),
      scopeId: z.string().optional().nullable(),
    })
  ).min(1, 'At least one role assignment is required'),
});

export const updateRolesSchema = z.object({
  role_assignments: z.array(
    z.object({
      roleCode: z.string().min(1, 'roleCode is required'),
      scopeType: z.enum(['Company', 'Branch', 'Department', 'Self']).default('Company'),
      scopeId: z.string().optional().nullable(),
    })
  ).min(1, 'At least one role assignment is required'),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['Active', 'Disabled']),
});

export default {
  inviteUserSchema,
  updateRolesSchema,
  updateUserStatusSchema,
};
