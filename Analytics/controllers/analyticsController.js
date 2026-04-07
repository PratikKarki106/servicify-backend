import Analytics from '../models/Analytics.js';
import Appointment from '../../BookAppointment/models/Appointment.js';

/**
 * Get date range based on timeFrame
 */
const getDateRange = (timeFrame, customDateRange) => {
  if (customDateRange?.startDate && customDateRange?.endDate) {
    return {
      startDate: new Date(customDateRange.startDate),
      endDate: new Date(customDateRange.endDate)
    };
  }

  const endDate = new Date();
  let startDate = new Date();

  if (timeFrame === 'weekly') {
    // Get start of current week
    const dayOfWeek = endDate.getDay();
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeFrame === 'monthly') {
    // Get start of current month
    startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  }

  return { startDate, endDate };
};

/**
 * Get weekly revenue data with comparison to last week
 */
export const getWeeklyRevenue = async (startDate, endDate) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const revenueData = [];

  // Get current week data
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(startDate);
    dayStart.setDate(startDate.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: dayStart,
        $lte: dayEnd
      },
      status: { $in: ['Completed', 'Confirmed', 'In Progress'] }
    });

    const revenue = appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    revenueData.push({
      day: days[dayStart.getDay()],
      revenue: Math.round(revenue)
    });
  }

  // Get last week data for comparison
  const lastWeekStart = new Date(startDate);
  lastWeekStart.setDate(startDate.getDate() - 7);
  const lastWeekEnd = new Date(endDate);
  lastWeekEnd.setDate(endDate.getDate() - 7);

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(lastWeekStart);
    dayStart.setDate(lastWeekStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: dayStart,
        $lte: dayEnd
      },
      status: { $in: ['Completed', 'Confirmed', 'In Progress'] }
    });

    const revenue = appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    
    if (revenueData[i]) {
      revenueData[i].lastWeek = Math.round(revenue);
    }
  }

  return revenueData;
};

/**
 * Get monthly revenue data
 */
export const getMonthlyRevenue = async (startDate, endDate) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueData = [];

  // Generate data for the past 12 months
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // Only include months within the requested range
    if (monthStart >= startDate && monthStart <= endDate) {
      const appointments = await Appointment.find({
        appointmentDate: {
          $gte: monthStart,
          $lte: monthEnd
        },
        status: { $in: ['Completed', 'Confirmed', 'In Progress'] }
      });

      const revenue = appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
      
      revenueData.push({
        month: months[monthDate.getMonth()],
        revenue: Math.round(revenue)
      });
    }
  }

  return revenueData;
};

/**
 * Get status distribution data
 */
export const getStatusDistribution = async (startDate, endDate) => {
  const statuses = ['Completed', 'In Progress', 'Pending', 'Cancelled', 'Confirmed'];
  const distribution = [];

  for (const status of statuses) {
    const count = await Appointment.countDocuments({
      status,
      appointmentDate: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (count > 0) {
      distribution.push({ name: status, value: count });
    }
  }

  return distribution;
};

/**
 * Get service type breakdown
 */
export const getServiceTypeBreakdown = async (startDate, endDate) => {
  const serviceTypes = ['Servicing', 'Repair', 'Checkup', 'Wash'];
  const breakdown = [];

  for (const serviceType of serviceTypes) {
    const count = await Appointment.countDocuments({
      serviceType,
      appointmentDate: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (count > 0) {
      breakdown.push({ name: serviceType, count });
    }
  }

  return breakdown;
};

/**
 * Get appointments trend (weekly)
 */
export const getAppointmentsTrend = async (startDate, endDate) => {
  const trend = [];
  const weeks = 8; // Show last 8 weeks

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Only count weeks within range
    if (weekEnd <= endDate) {
      const count = await Appointment.countDocuments({
        appointmentDate: {
          $gte: weekStart,
          $lte: weekEnd
        }
      });

      trend.push({
        week: `W${weeks - i}`,
        count
      });
    }
  }

  return trend;
};

/**
 * Get KPI metrics
 */
export const getKpiMetrics = async (startDate, endDate) => {
  // Get total revenue
  const appointments = await Appointment.find({
    appointmentDate: {
      $gte: startDate,
      $lte: endDate
    },
    status: { $in: ['Completed', 'Confirmed', 'In Progress'] }
  });

  const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);

  // Get total appointments
  const totalAppointments = await Appointment.countDocuments({
    appointmentDate: {
      $gte: startDate,
      $lte: endDate
    }
  });

  // Get completed appointments
  const completedAppointments = await Appointment.countDocuments({
    status: 'Completed',
    appointmentDate: {
      $gte: startDate,
      $lte: endDate
    }
  });

  // Calculate completion rate
  const completionRate = totalAppointments > 0 
    ? Math.round((completedAppointments / totalAppointments) * 100) 
    : 0;

  // Calculate average daily services
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const avgDailyServices = daysDiff > 0 ? Math.round(totalAppointments / daysDiff) : 0;

  return {
    totalRevenue: Math.round(totalRevenue),
    totalAppointments,
    completionRate,
    avgDailyServices
  };
};

/**
 * Main controller to fetch all analytics data
 */
export const getAnalyticsDashboard = async (req, res) => {
  try {
    const { timeFrame = 'weekly', startDate: customStart, endDate: customEnd } = req.query;
    
    const { startDate, endDate } = getDateRange(timeFrame, { 
      startDate: customStart, 
      endDate: customEnd 
    });

    // Fetch all data in parallel
    const [revenue, status, serviceTypes, appointmentsTrend, kpiMetrics] = await Promise.all([
      timeFrame === 'weekly' 
        ? getWeeklyRevenue(startDate, endDate)
        : getMonthlyRevenue(startDate, endDate),
      getStatusDistribution(startDate, endDate),
      getServiceTypeBreakdown(startDate, endDate),
      getAppointmentsTrend(startDate, endDate),
      getKpiMetrics(startDate, endDate)
    ]);

    res.json({
      revenue,
      status,
      serviceTypes,
      appointmentsTrend,
      kpiMetrics
    });
  } catch (error) {
    console.error('[Analytics Controller] Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch analytics data',
      error: error.message 
    });
  }
};

/**
 * Get revenue data only
 */
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { timeFrame = 'weekly', startDate: customStart, endDate: customEnd } = req.query;
    
    const { startDate, endDate } = getDateRange(timeFrame, { 
      startDate: customStart, 
      endDate: customEnd 
    });

    const revenue = timeFrame === 'weekly' 
      ? await getWeeklyRevenue(startDate, endDate)
      : await getMonthlyRevenue(startDate, endDate);

    res.json(revenue);
  } catch (error) {
    console.error('[Analytics Controller] Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch revenue data',
      error: error.message 
    });
  }
};

/**
 * Get status distribution only
 */
export const getStatusDistributionController = async (req, res) => {
  try {
    const { startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate } = getDateRange('monthly', { 
      startDate: customStart, 
      endDate: customEnd 
    });

    const status = await getStatusDistribution(startDate, endDate);
    res.json(status);
  } catch (error) {
    console.error('[Analytics Controller] Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch status distribution',
      error: error.message 
    });
  }
};

/**
 * Get service type breakdown only
 */
export const getServiceTypeBreakdownController = async (req, res) => {
  try {
    const { startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate } = getDateRange('monthly', { 
      startDate: customStart, 
      endDate: customEnd 
    });

    const serviceTypes = await getServiceTypeBreakdown(startDate, endDate);
    res.json(serviceTypes);
  } catch (error) {
    console.error('[Analytics Controller] Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch service type breakdown',
      error: error.message 
    });
  }
};

/**
 * Get appointments trend only
 */
export const getAppointmentsTrendController = async (req, res) => {
  try {
    const { startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate } = getDateRange('weekly', { 
      startDate: customStart, 
      endDate: customEnd 
    });

    const trend = await getAppointmentsTrend(startDate, endDate);
    res.json(trend);
  } catch (error) {
    console.error('[Analytics Controller] Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch appointments trend',
      error: error.message 
    });
  }
};

/**
 * Get KPI metrics only
 */
export const getKpiMetricsController = async (req, res) => {
  try {
    const { startDate: customStart, endDate: customEnd } = req.query;
    const { startDate, endDate } = getDateRange('monthly', { 
      startDate: customStart, 
      endDate: customEnd 
    });

    const metrics = await getKpiMetrics(startDate, endDate);
    res.json(metrics);
  } catch (error) {
    console.error('[Analytics Controller] Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch KPI metrics',
      error: error.message 
    });
  }
};
