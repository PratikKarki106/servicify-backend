import express from 'express';
import { getHistory, exportHistory } from '../controllers/historyController.js';
import { authenticateJWT } from '../../Users/middleware/authenticateJWT.js';

const router = express.Router();

// All history routes require authentication
router.use(authenticateJWT);

/**
 * @route   GET /api/history
 * @desc    Get complete history with filters
 * @access  Private (Admin)
 * @query   type: 'all' | 'appointment' | 'package'
 * @query   status: 'all' | 'booked' | 'confirmed' | 'in-progress' | 'payment' | 'completed' | 'cancelled'
 * @query   startDate: YYYY-MM-DD
 * @query   endDate: YYYY-MM-DD
 * @query   page: number
 * @query   limit: number
 */
router.get('/', getHistory);

/**
 * @route   GET /api/history/export
 * @desc    Export history to CSV
 * @access  Private (Admin)
 */
router.get('/export', exportHistory);

export default router;
