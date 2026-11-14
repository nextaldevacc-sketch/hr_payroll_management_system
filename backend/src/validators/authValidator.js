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

export const mfaVerifySchema = z.object({
  mfa_token: z.string().min(1, 'MFA token is required'),
  code: z.string().min(1, 'Verification code is required'),
});

export const mfaEnrolInitSchema = z.object({
  mfa_token: z.string().optional(),
});

export const mfaEnrolConfirmSchema = z.object({
  code: z.string().min(6, 'Verification code must be at least 6 characters'),
  mfa_token: z.string().optional(),
});

export default {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setPasswordInviteSchema,
  mfaVerifySchema,
  mfaEnrolInitSchema,
  mfaEnrolConfirmSchema,
};
