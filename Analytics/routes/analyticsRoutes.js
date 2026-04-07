import express from 'express';
import {
  getAnalyticsDashboard,
  getRevenueAnalytics,
  getStatusDistributionController,
  getServiceTypeBreakdownController,
  getAppointmentsTrendController,
  getKpiMetricsController
} from '../controllers/analyticsController.js';
import { authenticateJWT } from '../../Users/middleware/authenticateJWT.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateJWT);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get complete analytics dashboard data
 * @access  Private (Admin)
 */
router.get('/dashboard', getAnalyticsDashboard);

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue data only
 * @access  Private (Admin)
 */
router.get('/revenue', getRevenueAnalytics);

/**
 * @route   GET /api/analytics/status-distribution
 * @desc    Get status distribution data
 * @access  Private (Admin)
 */
router.get('/status-distribution', getStatusDistributionController);

/**
 * @route   GET /api/analytics/service-types
 * @desc    Get service type breakdown
 * @access  Private (Admin)
 */
router.get('/service-types', getServiceTypeBreakdownController);

/**
 * @route   GET /api/analytics/appointments-trend
 * @desc    Get appointments trend data
 * @access  Private (Admin)
 */
router.get('/appointments-trend', getAppointmentsTrendController);

/**
 * @route   GET /api/analytics/kpi-metrics
 * @desc    Get KPI metrics
 * @access  Private (Admin)
 */
router.get('/kpi-metrics', getKpiMetricsController);

export default router;
