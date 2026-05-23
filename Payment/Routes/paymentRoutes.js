// servicify-backend/Payment/routes/paymentRoutes.js

import express from 'express';
import {
    initiatePayment,
    khaltiCallback,
    esewaCallback,
    verifyPayment,
    getPaymentHistory,
    getTotalIncome
} from '../controllers/paymentController.js';
import { authenticateJWT } from '../../Users/middleware/authenticateJWT.js';

const router = express.Router();

// Public routes (called by payment gateways)
router.get('/khalti/callback', khaltiCallback);
router.get('/esewa/callback', esewaCallback);
router.post('/esewa/callback', esewaCallback);

// Protected routes (require authentication)
router.post('/initiate', authenticateJWT, initiatePayment);
router.post('/verify', authenticateJWT, verifyPayment);
router.get('/history', authenticateJWT, getPaymentHistory);
router.get('/admin/total-income', authenticateJWT, getTotalIncome);

export default router;