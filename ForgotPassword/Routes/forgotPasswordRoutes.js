// ForgotPassword/Routes/forgotPasswordRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';  // ← Change this to import
import {
  requestPin,
  verifyPin,
  resetPassword,
  resendPin
} from '../controllers/forgotPasswordController.js';

const router = express.Router();

const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per windowMs
  message: 'Too many PIN requests. Please try again later.'
});

// Routes
router.post('/request-pin', requestPin);
router.post('/verify-pin', verifyPin);
router.post('/reset-password', resetPassword);
router.post('/resend-pin', resendPin);

export default router;