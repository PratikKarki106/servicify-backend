import Appointment from '../../BookAppointment/models/Appointment.js';
import Payment from '../../Payment/models/Payment.js';
import PackagePurchase from '../../Payment/models/PackagePurchase.js';

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
    const dayOfWeek = endDate.getDay();
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeFrame === 'monthly') {
    startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
};

/**
 * Calculate total amount from billItems
 */
const calculateTotalAmount = (billItems) => {
  if (!billItems || !Array.isArray(billItems)) return 0;
  return billItems.reduce((sum, item) => {
    const itemTotal = (item.itemPrice || 0) + (item.serviceCharge || 0);
    return sum + itemTotal;
  }, 0);
};

/**
 * Get weekly spending data for user
 */
export const getUserWeeklySpending = async (userId, userObjectId, startDate, endDate) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const spendingData = [];

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(startDate);
    dayStart.setDate(startDate.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    // Get appointment spending
    const appointments = await Appointment.find({
      userId: userId,
      createdAt: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });

    const appointmentAmount = appointments.reduce((sum, apt) => sum + calculateTotalAmount(apt.billItems), 0);

    // Get package purchase spending
    const packagePayments = await Payment.find({
      userId: userObjectId,
      paymentType: 'package',
      paymentStatus: 'completed',
      createdAt: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });

    const packageAmount = packagePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    spendingData.push({
      day: days[dayStart.getDay()],
      amount: Math.round(appointmentAmount + packageAmount)
    });
  }

  return spendingData;
};

/**
 * Get monthly spending data for user
 */
export const getUserMonthlySpending = async (userId, userObjectId, startDate, endDate) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const spendingData = [];

  const currentMonth = endDate.getMonth();
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(endDate.getFullYear(), currentMonth - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get appointment spending
    const appointments = await Appointment.find({
      userId: userId,
      createdAt: {
        $gte: monthStart,
        $lte: monthEnd
      }
    });

    const appointmentAmount = appointments.reduce((sum, apt) => sum + calculateTotalAmount(apt.billItems), 0);

    // Get package purchase spending
    const packagePayments = await Payment.find({
      userId: userObjectId,
      paymentType: 'package',
      paymentStatus: 'completed',
      createdAt: {
        $gte: monthStart,
        $lte: monthEnd
      }
    });

    const packageAmount = packagePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    spendingData.push({
      month: months[monthDate.getMonth()],
      amount: Math.round(appointmentAmount + packageAmount)
    });
  }

  return spendingData;
};

/**
 * Get user service usage breakdown
 */
export const getUserServiceUsage = async (userId, startDate, endDate) => {
  const serviceTypes = ['servicing', 'repair', 'checkup', 'wash'];
  const colors = {
    'servicing': '#8b5cf6',
    'repair': '#06b6d4',
    'checkup': '#10b981',
    'wash': '#f59e0b'
  };

  const breakdown = [];

  for (const serviceType of serviceTypes) {
    const count = await Appointment.countDocuments({
      userId: userId,
      serviceType: serviceType,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (count > 0) {
      breakdown.push({
        name: serviceType.charAt(0).toUpperCase() + serviceType.slice(1),
        count,
        color: colors[serviceType]
      });
    }
  }

  return breakdown;
};

/**
 * Get monthly comparison data (this month vs last month)
 */
export const getMonthlyComparison = async (userId, endDate) => {
  const currentMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const currentMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0, 23, 59, 59, 999);
  const lastMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
  const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0, 23, 59, 59, 999);

  const serviceTypes = ['servicing', 'repair', 'checkup', 'wash'];
  const comparison = [];

  for (const serviceType of serviceTypes) {
    const thisMonthCount = await Appointment.countDocuments({
      userId: userId,
      serviceType: serviceType,
      createdAt: {
        $gte: currentMonthStart,
        $lte: currentMonthEnd
      }
    });

    const lastMonthCount = await Appointment.countDocuments({
      userId: userId,
      serviceType: serviceType,
      createdAt: {
        $gte: lastMonthStart,
        $lte: lastMonthEnd
      }
    });

    if (thisMonthCount > 0 || lastMonthCount > 0) {
      comparison.push({
        category: serviceType.charAt(0).toUpperCase() + serviceType.slice(1),
        thisMonth: thisMonthCount,
        lastMonth: lastMonthCount
      });
    }
  }

  return comparison;
};

/**
 * Get service categories with detailed info
 */
export const getServiceCategories = async (userId, startDate, endDate) => {
  const serviceTypes = ['servicing', 'repair', 'checkup', 'wash'];
  const categories = [];

  for (const serviceType of serviceTypes) {
    const appointments = await Appointment.find({
      userId: userId,
      serviceType: serviceType,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const count = appointments.length;
    const totalAmount = appointments.reduce((sum, apt) => sum + calculateTotalAmount(apt.billItems), 0);

    if (count > 0) {
      categories.push({
        name: serviceType.charAt(0).toUpperCase() + serviceType.slice(1),
        count,
        totalAmount: Math.round(totalAmount)
      });
    }
  }

  return categories;
};

/**
 * Get activity radar data
 */
export const getActivityRadar = async (userId, userObjectId, startDate, endDate) => {
  const appointments = await Appointment.find({
    userId: userId,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  });

  const totalServices = appointments.length;
  const appointmentAmount = appointments.reduce((sum, apt) => sum + calculateTotalAmount(apt.billItems), 0);

  // Get package spending
  const packagePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'package',
    paymentStatus: 'completed',
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  });

  const packageAmount = packagePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalAmount = appointmentAmount + packageAmount;

  const completedCount = appointments.filter(apt => apt.status === 'completed').length;
  const satisfactionScore = totalServices > 0 ? Math.round((completedCount / totalServices) * 100) : 0;

  return [
    { dimension: 'Services', value: Math.min(totalServices * 10, 100) },
    { dimension: 'Spending', value: Math.min(totalAmount / 100, 100) },
    { dimension: 'Completion', value: satisfactionScore },
    { dimension: 'Engagement', value: Math.min(totalServices * 15, 100) },
    { dimension: 'Loyalty', value: Math.min(totalServices * 20, 100) },
    { dimension: 'Satisfaction', value: satisfactionScore }
  ];
};

/**
 * Get spending comparison (weekly and monthly)
 */
export const getSpendingComparison = async (userId, userObjectId, endDate) => {
  // Weekly comparison (this week vs last week)
  const currentWeekStart = new Date(endDate);
  const dayOfWeek = currentWeekStart.getDay();
  currentWeekStart.setDate(endDate.getDate() - dayOfWeek);
  currentWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(currentWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(currentWeekStart);
  lastWeekEnd.setMilliseconds(-1);

  // Get appointment spending for current week
  const currentWeekAppointments = await Appointment.find({
    userId: userId,
    createdAt: { $gte: currentWeekStart, $lte: endDate }
  });

  const currentWeekAppointmentSpending = currentWeekAppointments.reduce(
    (sum, apt) => sum + calculateTotalAmount(apt.billItems), 0
  );

  const lastWeekAppointments = await Appointment.find({
    userId: userId,
    createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd }
  });

  const lastWeekAppointmentSpending = lastWeekAppointments.reduce(
    (sum, apt) => sum + calculateTotalAmount(apt.billItems), 0
  );

  // Get package spending for current week
  const currentWeekPackagePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'package',
    paymentStatus: 'completed',
    createdAt: { $gte: currentWeekStart, $lte: endDate }
  });

  const currentWeekPackageSpending = currentWeekPackagePayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  const lastWeekPackagePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'package',
    paymentStatus: 'completed',
    createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd }
  });

  const lastWeekPackageSpending = lastWeekPackagePayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  // Monthly comparison (this month vs last month)
  const currentMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const lastMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
  const lastMonthEnd = new Date(currentMonthStart);
  lastMonthEnd.setMilliseconds(-1);

  // Get appointment spending for current month
  const currentMonthAppointments = await Appointment.find({
    userId: userId,
    createdAt: { $gte: currentMonthStart, $lte: endDate }
  });

  const currentMonthAppointmentSpending = currentMonthAppointments.reduce(
    (sum, apt) => sum + calculateTotalAmount(apt.billItems), 0
  );

  const lastMonthAppointments = await Appointment.find({
    userId: userId,
    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
  });

  const lastMonthAppointmentSpending = lastMonthAppointments.reduce(
    (sum, apt) => sum + calculateTotalAmount(apt.billItems), 0
  );

  // Get package spending for current month
  const currentMonthPackagePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'package',
    paymentStatus: 'completed',
    createdAt: { $gte: currentMonthStart, $lte: endDate }
  });

  const currentMonthPackageSpending = currentMonthPackagePayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  const lastMonthPackagePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'package',
    paymentStatus: 'completed',
    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
  });

  const lastMonthPackageSpending = lastMonthPackagePayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  return {
    weekly: {
      current: Math.round(currentWeekAppointmentSpending + currentWeekPackageSpending),
      previous: Math.round(lastWeekAppointmentSpending + lastWeekPackageSpending)
    },
    monthly: {
      current: Math.round(currentMonthAppointmentSpending + currentMonthPackageSpending),
      previous: Math.round(lastMonthAppointmentSpending + lastMonthPackageSpending)
    }
  };
};

/**
 * Get quick stats
 */
export const getQuickStats = async (userId) => {
  const appointments = await Appointment.find({ userId: userId });

  const completedServices = appointments.filter(apt => apt.status === 'completed').length;
  const ongoingServices = appointments.filter(apt => ['confirmed', 'in-progress', 'payment'].includes(apt.status)).length;
  const cancelledServices = appointments.filter(apt => apt.status === 'cancelled').length;

  return {
    completedServices,
    ongoingServices,
    totalReviews: completedServices, // Assuming each completed service has a review opportunity
    cancelledServices
  };
};

/**
 * Get KPI metrics for user
 */
export const getUserKpiMetrics = async (userId, userObjectId, startDate, endDate) => {
  const appointments = await Appointment.find({
    userId: userId,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  });

  const appointmentSpent = appointments.reduce((sum, apt) => sum + calculateTotalAmount(apt.billItems), 0);
  const totalServices = appointments.length;
  const activeServices = appointments.filter(apt => ['confirmed', 'in-progress', 'payment'].includes(apt.status)).length;

  // Get package spending
  const packagePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'package',
    paymentStatus: 'completed',
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  });

  const packageSpent = packagePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalSpent = appointmentSpent + packageSpent;

  // Calculate spending trend (compare with previous period)
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const previousPeriodStart = new Date(startDate.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
  
  const previousAppointments = await Appointment.find({
    userId: userId,
    createdAt: {
      $gte: previousPeriodStart,
      $lt: startDate
    }
  });

  const previousAppointmentSpending = previousAppointments.reduce(
    (sum, apt) => sum + calculateTotalAmount(apt.billItems), 0
  );

  const previousPackagePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'package',
    paymentStatus: 'completed',
    createdAt: {
      $gte: previousPeriodStart,
      $lt: startDate
    }
  });

  const previousPackageSpending = previousPackagePayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  const previousTotalSpent = previousAppointmentSpending + previousPackageSpending;

  let spendingTrend = 'stable';
  if (totalSpent > previousTotalSpent * 1.1) {
    spendingTrend = 'up';
  } else if (totalSpent < previousTotalSpent * 0.9) {
    spendingTrend = 'down';
  }

  let serviceTrend = 'stable';
  if (totalServices > previousAppointments.length * 1.1) {
    serviceTrend = 'up';
  } else if (totalServices < previousAppointments.length * 0.9) {
    serviceTrend = 'down';
  }

  return {
    totalSpent: Math.round(totalSpent),
    totalServices,
    avgRating: 0, // Reviews not implemented yet
    activeServices,
    spendingTrend,
    serviceTrend
  };
};

/**
 * Main controller to fetch user analytics dashboard
 */
export const getUserAnalyticsDashboard = async (req, res) => {
  try {
    const { timeFrame = 'weekly', startDate: customStart, endDate: customEnd } = req.query;
    const userId = req.user.userId; // Numeric userId for Appointment queries
    const userObjectId = req.user._id; // ObjectId for Payment/PackagePurchase queries

    const { startDate, endDate } = getDateRange(timeFrame, {
      startDate: customStart,
      endDate: customEnd
    });

    // Fetch all data in parallel
    const [
      spendingHistory,
      serviceUsage,
      monthlyComparison,
      serviceCategories,
      activityRadar,
      spendingComparison,
      quickStats,
      kpiMetrics
    ] = await Promise.all([
      timeFrame === 'weekly'
        ? getUserWeeklySpending(userId, userObjectId, startDate, endDate)
        : getUserMonthlySpending(userId, userObjectId, startDate, endDate),
      getUserServiceUsage(userId, startDate, endDate),
      getMonthlyComparison(userId, endDate),
      getServiceCategories(userId, startDate, endDate),
      getActivityRadar(userId, userObjectId, startDate, endDate),
      getSpendingComparison(userId, userObjectId, endDate),
      getQuickStats(userId),
      getUserKpiMetrics(userId, userObjectId, startDate, endDate)
    ]);

    res.json({
      spendingHistory,
      serviceUsage,
      monthlyComparison,
      serviceCategories,
      activityRadar,
      spendingComparison,
      quickStats,
      kpiMetrics
    });
  } catch (error) {
    console.error('[User Analytics Controller] Error:', error);
    res.status(500).json({
      message: 'Failed to fetch user analytics data',
      error: error.message
    });
  }
};

/**
 * Get user spending data only
 */
export const getUserSpendingData = async (req, res) => {
  try {
    const { timeFrame = 'weekly', startDate: customStart, endDate: customEnd } = req.query;
    const userId = req.user.userId;
    const userObjectId = req.user._id;

    const { startDate, endDate } = getDateRange(timeFrame, {
      startDate: customStart,
      endDate: customEnd
    });

    const spendingHistory = timeFrame === 'weekly'
      ? await getUserWeeklySpending(userId, userObjectId, startDate, endDate)
      : await getUserMonthlySpending(userId, userObjectId, startDate, endDate);

    res.json(spendingHistory);
  } catch (error) {
    console.error('[User Analytics Controller] Error:', error);
    res.status(500).json({
      message: 'Failed to fetch spending data',
      error: error.message
    });
  }
};

/**
 * Get user service usage only
 */
export const getUserServiceUsageController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate: customStart, endDate: customEnd } = req.query;
    
    const { startDate, endDate } = getDateRange('monthly', {
      startDate: customStart,
      endDate: customEnd
    });

    const serviceUsage = await getUserServiceUsage(userId, startDate, endDate);
    res.json(serviceUsage);
  } catch (error) {
    console.error('[User Analytics Controller] Error:', error);
    res.status(500).json({
      message: 'Failed to fetch service usage data',
      error: error.message
    });
  }
};

/**
 * Get user KPI metrics only
 */
export const getUserKpiMetricsController = async (req, res) => {
  try {
    const { startDate: customStart, endDate: customEnd } = req.query;
    const userId = req.user.userId;
    const userObjectId = req.user._id;

    const { startDate, endDate } = getDateRange('monthly', {
      startDate: customStart,
      endDate: customEnd
    });

    const kpiMetrics = await getUserKpiMetrics(userId, userObjectId, startDate, endDate);
    res.json(kpiMetrics);
  } catch (error) {
    console.error('[User Analytics Controller] Error:', error);
    res.status(500).json({
      message: 'Failed to fetch KPI metrics',
      error: error.message
    });
  }
};
