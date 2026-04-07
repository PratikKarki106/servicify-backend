import express from 'express';
import { getDashboardStats } from '../controllers/adminDashboardController.js';
import { authenticateJWT } from '../../Users/middleware/authenticateJWT.js';

const router = express.Router();

// Get admin dashboard stats for today
router.get('/stats', authenticateJWT, getDashboardStats);

export default router;
