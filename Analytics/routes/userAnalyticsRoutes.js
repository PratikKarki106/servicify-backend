import express from 'express';
import {
  getUserAnalyticsDashboard,
  getUserSpendingData,
  getUserServiceUsageController,
  getUserKpiMetricsController
} from '../controllers/userAnalyticsController.js';
import { authenticateJWT } from '../../Users/middleware/authenticateJWT.js';

const router = express.Router();

// All user analytics routes require authentication
router.use(authenticateJWT);

/**
 * @route   GET /api/analytics/user/dashboard
 * @desc    Get complete user analytics dashboard data
 * @access  Private (User)
 */
router.get('/dashboard', getUserAnalyticsDashboard);

/**
 * @route   GET /api/analytics/user/spending
 * @desc    Get user spending data only
 * @access  Private (User)
 */
router.get('/spending', getUserSpendingData);

/**
 * @route   GET /api/analytics/user/service-usage
 * @desc    Get user service usage data
 * @access  Private (User)
 */
router.get('/service-usage', getUserServiceUsageController);

/**
 * @route   GET /api/analytics/user/kpi-metrics
 * @desc    Get user KPI metrics
 * @access  Private (User)
 */
router.get('/kpi-metrics', getUserKpiMetricsController);

export default router;
