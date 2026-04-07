import express from 'express';
import { getUserStats } from '../controllers/dashboardController.js';
import { authenticateJWT } from '../../Users/middleware/authenticateJWT.js';

const router = express.Router();

// Get user dashboard stats (requires authentication)
router.get('/stats', authenticateJWT, getUserStats);

export default router;
