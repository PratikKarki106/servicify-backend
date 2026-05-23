import Analytics from '../models/Analytics.js';
import Appointment from '../../BookAppointment/models/Appointment.js';
import PackagePurchase from '../../Payment/models/PackagePurchase.js';
import Purchase from '../../Catalogue/models/Purchase.js';

/**
 * Calculate total amount for an appointment from bill items
 */
const calculateAppointmentTotal = (apt) => {
  if (!apt.billItems || !apt.billItems.length) return 0;
  return apt.billItems.reduce((sum, item) => {
    return sum + (item.itemPrice || 0) + (item.serviceCharge || 0);
  }, 0);
};

/**
 * Get date range based on timeFrame
 */
const getDateRange = (timeFrame, customDateRange) => {
  const endDate = new Date();
  let startDate = new Date();

  if (timeFrame === 'daily') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (timeFrame === 'weekly') {
    // 1 Month of data for "Weekly" mode as requested
    startDate = new Date(endDate);
    startDate.setMonth(endDate.getMonth() - 1);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeFrame === 'monthly') {
    // 12 Months of data for "Monthly" mode
    startDate = new Date(endDate);
    startDate.setFullYear(endDate.getFullYear() - 1);
    startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
};

/**
 * Get weekly revenue data with comparison to last week.
 * Always anchored on the current week's Sunday so days appear Sun–Sat.
 */
export const getWeeklyRevenue = async (_startDate, _endDate) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const revenueData = [];

  // Anchor to THIS week's Sunday (Sun = 0)
  const now = new Date();
  const currentWeekSunday = new Date(now);
  currentWeekSunday.setDate(now.getDate() - now.getDay()); // go back to Sunday
  currentWeekSunday.setHours(0, 0, 0, 0);

  // ── Current week (Sun → Sat) ──────────────────────────────────────────
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(currentWeekSunday);
    dayStart.setDate(currentWeekSunday.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['completed', 'confirmed', 'in-progress', 'payment'] }
    });
    const apptRevenue = appointments.reduce((sum, apt) => sum + calculateAppointmentTotal(apt), 0);

    const packagePurchases = await PackagePurchase.find({
      purchasedAt: { $gte: dayStart, $lte: dayEnd }
    });
    const pkgRevenue = packagePurchases.reduce((sum, pkg) => sum + (pkg.amount || 0), 0);

    const itemPurchases = await Purchase.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      paymentStatus: 'completed'
    });
    const itemRevenue = itemPurchases.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    revenueData.push({
      day: days[i],               // i already maps to Sun(0)..Sat(6)
      revenue: Math.round(apptRevenue + pkgRevenue + itemRevenue)
    });
  }

  // ── Previous week (same Sun → Sat, shifted −7 days) ───────────────────
  const lastWeekSunday = new Date(currentWeekSunday);
  lastWeekSunday.setDate(currentWeekSunday.getDate() - 7);

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(lastWeekSunday);
    dayStart.setDate(lastWeekSunday.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['completed', 'confirmed', 'in-progress', 'payment'] }
    });
    const apptRevenue = appointments.reduce((sum, apt) => sum + calculateAppointmentTotal(apt), 0);

    const packagePurchases = await PackagePurchase.find({
      purchasedAt: { $gte: dayStart, $lte: dayEnd }
    });
    const pkgRevenue = packagePurchases.reduce((sum, pkg) => sum + (pkg.amount || 0), 0);

    const itemPurchases = await Purchase.find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      paymentStatus: 'completed'
    });
    const itemRevenue = itemPurchases.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    if (revenueData[i]) {
      revenueData[i].lastWeek = Math.round(apptRevenue + pkgRevenue + itemRevenue);
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

  // If monthly timeframe, generate for the whole calendar year of the endDate
  const targetYear = endDate.getFullYear();
  
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(targetYear, m, 1);
    const monthEnd = new Date(targetYear, m + 1, 0, 23, 59, 59, 999);

    const appointments = await Appointment.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ['completed', 'confirmed', 'in-progress', 'payment'] }
    });
    const apptRevenue = appointments.reduce((sum, apt) => sum + calculateAppointmentTotal(apt), 0);

    const packagePurchases = await PackagePurchase.find({
      purchasedAt: { $gte: monthStart, $lte: monthEnd }
    });
    const pkgRevenue = packagePurchases.reduce((sum, pkg) => sum + (pkg.amount || 0), 0);

    const itemPurchases = await Purchase.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
      paymentStatus: 'completed'
    });
    const itemRevenue = itemPurchases.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    const revenue = apptRevenue + pkgRevenue + itemRevenue;
    
    revenueData.push({
      month: months[m],
      revenue: Math.round(revenue)
    });
  }

  return revenueData;
};

/**
 * Get status distribution data
 */
export const getStatusDistribution = async (startDate, endDate) => {
  const statuses = ['booked', 'confirmed', 'in-progress', 'payment', 'completed', 'cancelled'];
  const distribution = [];

  for (const status of statuses) {
    const count = await Appointment.countDocuments({
      status,
      createdAt: {
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
  const serviceTypes = ['servicing', 'repair', 'checkup', 'wash'];
  const breakdown = [];

  for (const serviceType of serviceTypes) {
    const count = await Appointment.countDocuments({
      serviceType,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (count > 0) {
      let displayName = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
      if (serviceType === 'checkup') {
        displayName = 'Check up';
      }
      breakdown.push({ name: displayName, count });
    }
  }

  return breakdown;
};

/**
 * Get appointments trend (weekly)
 */
export const getAppointmentsTrend = async (startDate, endDate, timeFrame = 'weekly') => {
  const trend = [];

  if (timeFrame === 'daily') {
    // Show 7 days: Sun Mon Tue Wed Thu Fri Sat
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Assuming Sunday start of current week
    const currentDay = new Date();
    const dayOfWeek = currentDay.getDay();
    const weekStart = new Date(currentDay);
    weekStart.setDate(currentDay.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const dStart = new Date(weekStart);
      dStart.setDate(weekStart.getDate() + i);
      const dEnd = new Date(dStart);
      dEnd.setHours(23, 59, 59, 999);

      const count = await Appointment.countDocuments({
        createdAt: { $gte: dStart, $lte: dEnd }
      });

      trend.push({ day: days[i], count });
    }
  } else if (timeFrame === 'weekly') {
    // Show 4 weeks: Week 1 to Week 4 of the last month
    for (let i = 0; i < 4; i++) {
      const wStart = new Date(startDate);
      wStart.setDate(startDate.getDate() + (i * 7));
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);

      const count = await Appointment.countDocuments({
        createdAt: { $gte: wStart, $lte: wEnd }
      });

      trend.push({ week: `Week ${i + 1}`, count });
    }
  } else if (timeFrame === 'monthly') {
    // Show 12 months: Jan to Dec
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    for (let m = 0; m < 12; m++) {
      const mStart = new Date(currentYear, m, 1);
      const mEnd = new Date(currentYear, m + 1, 0, 23, 59, 59, 999);

      const count = await Appointment.countDocuments({
        createdAt: { $gte: mStart, $lte: mEnd }
      });

      trend.push({ month: months[m], count });
    }
  }

  return trend;
};

/**
 * Get KPI metrics
 */
export const getKpiMetrics = async (startDate, endDate) => {
  const appointmentsQuery = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  const appointments = await Appointment.find({
    ...appointmentsQuery,
    status: { $in: ['completed', 'confirmed', 'in-progress', 'payment'] }
  });
  const apptRevenue = appointments.reduce((sum, apt) => sum + calculateAppointmentTotal(apt), 0);

  const packagePurchases = await PackagePurchase.find({
    purchasedAt: { $gte: startDate, $lte: endDate }
  });
  const pkgRevenue = packagePurchases.reduce((sum, pkg) => sum + (pkg.amount || 0), 0);

  const itemPurchases = await Purchase.find({
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: 'completed'
  });
  const itemRevenue = itemPurchases.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

  const totalRevenue = apptRevenue + pkgRevenue + itemRevenue;

  // Get total appointments
  const totalAppointments = await Appointment.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  // Get completed appointments
  const completedAppointments = await Appointment.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
    status: 'completed'
  });

  // Get remaining services (pending work)
  // All-time or within range? User said "remaining services to show the pending work"
  // Usually pending work is an absolute value (all-time pending) but lets filter by range if provided 
  // or better, show all appointments that are not completed/cancelled.
  const remainingServices = await Appointment.countDocuments({
    status: { $in: ['booked', 'confirmed', 'in-progress', 'payment'] }
  });

  // Calculate completion rate
  const completionRate = totalAppointments > 0 
    ? Math.round((completedAppointments / totalAppointments) * 100) 
    : 0;

  // Calculate average daily services
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
  const avgDailyServices = Math.round(totalAppointments / daysDiff);

  return {
    totalRevenue: Math.round(totalRevenue),
    totalAppointments,
    completionRate,
    avgDailyServices,
    remainingServices
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
      getAppointmentsTrend(startDate, endDate, timeFrame),
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
