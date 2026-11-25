import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setPasswordInviteSchema,
  mfaVerifySchema,
  mfaEnrolInitSchema,
  mfaEnrolConfirmSchema,
} from '../validators/authValidator.js';
import authController from '../controllers/authController.js';

const router = Router();

const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'TOO_MANY_ATTEMPTS',
    message: 'Too many MFA verification attempts. Please try again after 15 minutes.',
  },
});

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', optionalAuthenticate, authController.getCurrentUser);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/set-password-invite', validate(setPasswordInviteSchema), authController.setPasswordFromInvite);
router.post('/change-password', authenticate, authController.changePassword);

// MFA endpoints
router.post('/mfa/enrol-init', optionalAuthenticate, validate(mfaEnrolInitSchema), authController.mfaEnrolInit);
router.post(
  '/mfa/enrol-confirm',
  optionalAuthenticate,
  mfaLimiter,
  validate(mfaEnrolConfirmSchema),
  authController.mfaEnrolConfirm
);
router.post('/mfa/verify', mfaLimiter, validate(mfaVerifySchema), authController.mfaVerify);
router.get('/mfa/status', authenticate, authController.mfaStatus);

export default router;
