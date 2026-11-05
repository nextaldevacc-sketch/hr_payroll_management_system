import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setPasswordInviteSchema,
} from '../validators/authValidator.js';
import authController from '../controllers/authController.js';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', optionalAuthenticate, authController.getCurrentUser);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/set-password-invite', validate(setPasswordInviteSchema), authController.setPasswordFromInvite);

export default router;
