// servicify-backend/Payment/routes/paymentRoutes.js

import express from 'express';
import {
    initiatePayment,
    khaltiCallback,
    verifyPayment,
    getPaymentHistory,
    getTotalIncome
} from '../controllers/paymentController.js';
import { authenticateJWT } from '../../Users/middleware/authenticateJWT.js';

const router = express.Router();

// Public routes (called by Khalti)
router.get('/khalti/callback', khaltiCallback);

// Protected routes (require authentication)
router.post('/initiate', authenticateJWT, initiatePayment);
router.post('/verify', authenticateJWT, verifyPayment);
router.get('/history', authenticateJWT, getPaymentHistory);
router.get('/admin/total-income', authenticateJWT, getTotalIncome);

export default router;