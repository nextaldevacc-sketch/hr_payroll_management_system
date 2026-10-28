import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  name_ar: z.string().optional(),
  trade_license_no: z.string().min(2, 'Trade license number is required'),
  emirate: z.string().default('Dubai'),
  mol_establishment_id: z.string().optional(),
  bank_routing_code: z.string().optional(),
  admin_email: z.string().email('Valid admin email is required'),
  admin_name: z.string().optional(),
  default_cutoff_day: z.coerce.number().min(1).max(31).default(25),
});

export const updateCompanyStatusSchema = z.object({
  status: z.enum(['Active', 'Suspended', 'Archived']),
});

export const supportGrantSchema = z.object({
  platform_user_id: z.string().optional(),
  granted_by: z.string().optional(),
  reason: z.string().min(5, 'Reason is required for support grant'),
  hours: z.coerce.number().min(1).max(72).default(2),
});

export default {
  createCompanySchema,
  updateCompanyStatusSchema,
  supportGrantSchema,
};
