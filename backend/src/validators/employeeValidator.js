import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employee_code: z.string().optional(),
  name: z.string().min(2, 'Name is required'),
  arabic_name: z.string().optional(),
  work_email: z.string().email('Valid work email is required').optional().nullable(),
  company_visa_id: z.string().min(1, 'Company visa is required'),
  branch_id: z.string().min(1, 'Branch is required'),
  joining_date: z.string().min(1, 'Joining date is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  gender: z.enum(['Male', 'Female']).default('Male'),
  residency_type: z.enum(['UAENational', 'Expat']).optional(),
  mohre_person_id: z.string().optional().nullable(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['Pre-Joined', 'New Joined', 'Active', 'Suspended', 'Transferred', 'Archived']),
});

export const verifyEmployeeSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']).default('APPROVE'),
  comment: z.string().optional(),
});

export default {
  createEmployeeSchema,
  updateStatusSchema,
  verifyEmployeeSchema,
};
