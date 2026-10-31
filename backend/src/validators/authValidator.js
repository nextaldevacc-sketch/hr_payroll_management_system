import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[a-zA-Z]/, 'Password must contain letters')
    .regex(/\d/, 'Password must contain numbers'),
});

export const setPasswordInviteSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[a-zA-Z]/, 'Password must contain letters')
    .regex(/\d/, 'Password must contain numbers'),
});

export default {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setPasswordInviteSchema,
};
