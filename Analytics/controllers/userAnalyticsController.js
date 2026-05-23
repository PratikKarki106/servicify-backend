import Appointment from '../../BookAppointment/models/Appointment.js';
import Payment from '../../Payment/models/Payment.js';
import PackagePurchase from '../../Payment/models/PackagePurchase.js';

/**
 * Get date range based on timeFrame
 */
const getDateRange = (timeFrame, customDateRange) => {
  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);

  if (customDateRange?.startDate && customDateRange?.endDate) {
    startDate = new Date(customDateRange.startDate);
    endDate = new Date(customDateRange.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  if (timeFrame === 'weekly') {
    const dayOfWeek = now.getDay();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (timeFrame === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
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

    // Get appointment spending from completed payments
    const appointmentPayments = await Payment.find({
      userId: userObjectId,
      paymentType: 'appointment',
      paymentStatus: 'completed',
      createdAt: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });

    const appointmentAmount = appointmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Get package purchase spending from completed payments
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

    // Get catalog purchase spending from completed payments
    const purchasePayments = await Payment.find({
      userId: userObjectId,
      paymentType: 'purchase',
      paymentStatus: 'completed',
      createdAt: {
        $gte: dayStart,
        $lte: dayEnd
      }
    });

    const purchaseAmount = purchasePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    spendingData.push({
      day: days[dayStart.getDay()],
      amount: Math.round(appointmentAmount + packageAmount + purchaseAmount)
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

  const targetYear = endDate.getFullYear();
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthStart = new Date(targetYear, monthIndex, 1, 0, 0, 0, 0);
    const monthEnd = new Date(targetYear, monthIndex + 1, 0, 23, 59, 59, 999);

    // Get appointment spending from completed payments
    const appointmentPayments = await Payment.find({
      userId: userObjectId,
      paymentType: 'appointment',
      paymentStatus: 'completed',
      createdAt: {
        $gte: monthStart,
        $lte: monthEnd
      }
    });

    const appointmentAmount = appointmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Get package purchase spending from completed payments
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

    // Get catalog purchase spending from completed payments
    const purchasePayments = await Payment.find({
      userId: userObjectId,
      paymentType: 'purchase',
      paymentStatus: 'completed',
      createdAt: {
        $gte: monthStart,
        $lte: monthEnd
      }
    });

    const purchaseAmount = purchasePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    spendingData.push({
      month: months[monthIndex],
      amount: Math.round(appointmentAmount + packageAmount + purchaseAmount)
    });
  }

  return spendingData;
};

/**
 * Get user service usage breakdown
 */
export const getUserServiceUsage = async (userId, userObjectId, startDate, endDate) => {
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

  // Get purchase count
  const purchaseCount = await Payment.countDocuments({
    userId: userObjectId,
    paymentType: 'purchase',
    paymentStatus: 'completed',
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  });

  if (purchaseCount > 0) {
    breakdown.push({
      name: 'Purchases',
      count: purchaseCount,
      color: '#ec4899'
    });
  }

  return breakdown;
};

/**
 * Get monthly comparison data (this month vs last month)
 */
export const getMonthlyComparison = async (userId, userObjectId, endDate) => {
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

  // Compare purchases
  const currentPurchaseCount = await Payment.countDocuments({
    userId: userObjectId,
    paymentType: 'purchase',
    paymentStatus: 'completed',
    createdAt: {
      $gte: currentMonthStart,
      $lte: currentMonthEnd
    }
  });

  const lastPurchaseCount = await Payment.countDocuments({
    userId: userObjectId,
    paymentType: 'purchase',
    paymentStatus: 'completed',
    createdAt: {
      $gte: lastMonthStart,
      $lte: lastMonthEnd
    }
  });

  if (currentPurchaseCount > 0 || lastPurchaseCount > 0) {
    comparison.push({
      category: 'Purchases',
      thisMonth: currentPurchaseCount,
      lastMonth: lastPurchaseCount
    });
  }

  return comparison;
};

/**
 * Get service categories with detailed info
 */
export const getServiceCategories = async (userId, userObjectId, startDate, endDate) => {
  const serviceTypes = ['servicing', 'repair', 'checkup', 'wash'];
  const categories = [];

  for (const serviceType of serviceTypes) {
    // Get appointments for this service type in the date range
    const appointments = await Appointment.find({
      userId: userId,
      serviceType: serviceType,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const count = appointments.length;
    
    let totalAmount = 0;
    
    // Only query payments if there are appointments
    if (count > 0) {
      // Get the MongoDB _ids of these appointments
      const appointmentDbIds = appointments.map(apt => apt._id);
      
      // Get completed payments for these appointments
      const appointmentPayments = await Payment.find({
        userId: userObjectId,
        paymentType: 'appointment',
        paymentStatus: 'completed',
        appointmentDbId: { $in: appointmentDbIds }
      });

      totalAmount = appointmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      categories.push({
        name: serviceType.charAt(0).toUpperCase() + serviceType.slice(1),
        count,
        totalAmount: Math.round(totalAmount)
      });
    }
  }

  // Add Purchases category
  const purchasePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'purchase',
    paymentStatus: 'completed',
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  });

  if (purchasePayments.length > 0) {
    const purchaseAmount = purchasePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    categories.push({
      name: 'Purchases',
      count: purchasePayments.length,
      totalAmount: Math.round(purchaseAmount)
    });
  }

  return categories;
};

/**
 * Get activity radar data
 */
export const getActivityRadar = async (userId, userObjectId, startDate, endDate, allTime = false) => {
  const appointmentQuery = allTime 
    ? { userId: userId }
    : { 
        userId: userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

  const appointments = await Appointment.find(appointmentQuery);

  const totalServices = appointments.length;

  // Get appointment spending from completed payments
  const appointmentPaymentQuery = allTime
    ? {
        userId: userObjectId,
        paymentType: 'appointment',
        paymentStatus: 'completed'
      }
    : {
        userId: userObjectId,
        paymentType: 'appointment',
        paymentStatus: 'completed',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

  const appointmentPayments = await Payment.find(appointmentPaymentQuery);
  const appointmentAmount = appointmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Get package spending
  const packagePaymentQuery = allTime
    ? {
        userId: userObjectId,
        paymentType: 'package',
        paymentStatus: 'completed'
      }
    : {
        userId: userObjectId,
        paymentType: 'package',
        paymentStatus: 'completed',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

  const packagePayments = await Payment.find(packagePaymentQuery);
  const packageAmount = packagePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Get purchase spending
  const purchasePaymentQuery = allTime
    ? {
        userId: userObjectId,
        paymentType: 'purchase',
        paymentStatus: 'completed'
      }
    : {
        userId: userObjectId,
        paymentType: 'purchase',
        paymentStatus: 'completed',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

  const purchasePayments = await Payment.find(purchasePaymentQuery);
  const purchaseAmount = purchasePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalAmount = appointmentAmount + packageAmount + purchaseAmount;

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

  // Get appointment spending for current week from completed payments
  const currentWeekAppointmentPayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'appointment',
    paymentStatus: 'completed',
    createdAt: { $gte: currentWeekStart, $lte: endDate }
  });

  const currentWeekAppointmentSpending = currentWeekAppointmentPayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  // Get appointment spending for last week from completed payments
  const lastWeekAppointmentPayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'appointment',
    paymentStatus: 'completed',
    createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd }
  });

  const lastWeekAppointmentSpending = lastWeekAppointmentPayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
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

  // Get purchase spending for current week
  const currentWeekPurchasePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'purchase',
    paymentStatus: 'completed',
    createdAt: { $gte: currentWeekStart, $lte: endDate }
  });

  const currentWeekPurchaseSpending = currentWeekPurchasePayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  const lastWeekPurchasePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'purchase',
    paymentStatus: 'completed',
    createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd }
  });

  const lastWeekPurchaseSpending = lastWeekPurchasePayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  // Monthly comparison (this month vs last month)
  const currentMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const lastMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
  const lastMonthEnd = new Date(currentMonthStart);
  lastMonthEnd.setMilliseconds(-1);

  // Get appointment spending for current month from completed payments
  const currentMonthAppointmentPayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'appointment',
    paymentStatus: 'completed',
    createdAt: { $gte: currentMonthStart, $lte: endDate }
  });

  const currentMonthAppointmentSpending = currentMonthAppointmentPayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  // Get appointment spending for last month from completed payments
  const lastMonthAppointmentPayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'appointment',
    paymentStatus: 'completed',
    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
  });

  const lastMonthAppointmentSpending = lastMonthAppointmentPayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
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

  // Get purchase spending for current month
  const currentMonthPurchasePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'purchase',
    paymentStatus: 'completed',
    createdAt: { $gte: currentMonthStart, $lte: endDate }
  });

  const currentMonthPurchaseSpending = currentMonthPurchasePayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  const lastMonthPurchasePayments = await Payment.find({
    userId: userObjectId,
    paymentType: 'purchase',
    paymentStatus: 'completed',
    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
  });

  const lastMonthPurchaseSpending = lastMonthPurchasePayments.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  return {
    weekly: {
      current: Math.round(currentWeekAppointmentSpending + currentWeekPackageSpending + currentWeekPurchaseSpending),
      previous: Math.round(lastWeekAppointmentSpending + lastWeekPackageSpending + lastWeekPurchaseSpending)
    },
    monthly: {
      current: Math.round(currentMonthAppointmentSpending + currentMonthPackageSpending + currentMonthPurchaseSpending),
      previous: Math.round(lastMonthAppointmentSpending + lastMonthPackageSpending + lastMonthPurchaseSpending)
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
export const getUserKpiMetrics = async (userId, userObjectId, startDate, endDate, allTime = false) => {
  const appointmentQuery = allTime 
    ? { userId: userId }
    : { 
        userId: userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

  const appointments = await Appointment.find(appointmentQuery);

  const totalServices = appointments.length;
  const activeServices = appointments.filter(apt => ['confirmed', 'in-progress', 'payment'].includes(apt.status)).length;

  // Get appointment spending from completed payments
  const paymentQuery = allTime
    ? {
        userId: userObjectId,
        paymentType: 'appointment',
        paymentStatus: 'completed'
      }
    : {
        userId: userObjectId,
        paymentType: 'appointment',
        paymentStatus: 'completed',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

  const appointmentPayments = await Payment.find(paymentQuery);
  const appointmentSpent = appointmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Get package spending from completed payments
  const packageQuery = allTime
    ? {
        userId: userObjectId,
        paymentType: 'package',
        paymentStatus: 'completed'
      }
    : {
        userId: userObjectId,
        paymentType: 'package',
        paymentStatus: 'completed',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

  const packagePayments = await Payment.find(packageQuery);
  const packageSpent = packagePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Get purchase spending from completed payments
  const purchaseQuery = allTime
    ? {
        userId: userObjectId,
        paymentType: 'purchase',
        paymentStatus: 'completed'
      }
    : {
        userId: userObjectId,
        paymentType: 'purchase',
        paymentStatus: 'completed',
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

  const purchasePayments = await Payment.find(purchaseQuery);
  const purchaseSpent = purchasePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalSpent = appointmentSpent + packageSpent + purchaseSpent;

  // Calculate spending trend (compare with previous period) - only for date-filtered data
  let spendingTrend = 'stable';
  let serviceTrend = 'stable';

  if (!allTime) {
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const previousPeriodStart = new Date(startDate.getTime() - (daysDiff * 24 * 60 * 60 * 1000));

    // Get previous period appointment spending
    const previousAppointmentPayments = await Payment.find({
      userId: userObjectId,
      paymentType: 'appointment',
      paymentStatus: 'completed',
      createdAt: {
        $gte: previousPeriodStart,
        $lt: startDate
      }
    });

    const previousAppointmentSpending = previousAppointmentPayments.reduce(
      (sum, p) => sum + (p.amount || 0), 0
    );

    // Get previous period package spending
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

    // Get previous period purchase spending
    const previousPurchasePayments = await Payment.find({
      userId: userObjectId,
      paymentType: 'purchase',
      paymentStatus: 'completed',
      createdAt: {
        $gte: previousPeriodStart,
        $lt: startDate
      }
    });

    const previousPurchaseSpending = previousPurchasePayments.reduce(
      (sum, p) => sum + (p.amount || 0), 0
    );

    const previousTotalSpent = previousAppointmentSpending + previousPackageSpending + previousPurchaseSpending;

    // Get previous period appointments for service trend comparison
    const previousAppointments = await Appointment.find({
      userId: userId,
      createdAt: {
        $gte: previousPeriodStart,
        $lt: startDate
      }
    });

    if (totalSpent > previousTotalSpent * 1.1) {
      spendingTrend = 'up';
    } else if (totalSpent < previousTotalSpent * 0.9) {
      spendingTrend = 'down';
    }

    if (totalServices > previousAppointments.length * 1.1) {
      serviceTrend = 'up';
    } else if (totalServices < previousAppointments.length * 0.9) {
      serviceTrend = 'down';
    }
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
      getUserServiceUsage(userId, userObjectId, startDate, endDate),
      getMonthlyComparison(userId, userObjectId, endDate),
      getServiceCategories(userId, userObjectId, startDate, endDate),
      getActivityRadar(userId, userObjectId, startDate, endDate, true), // allTime=true for activity radar
      getSpendingComparison(userId, userObjectId, endDate),
      getQuickStats(userId),
      getUserKpiMetrics(userId, userObjectId, startDate, endDate, true) // allTime=true for KPI metrics
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
    const userObjectId = req.user._id;
    const { startDate: customStart, endDate: customEnd } = req.query;
    
    const { startDate, endDate } = getDateRange('monthly', {
      startDate: customStart,
      endDate: customEnd
    });

    const serviceUsage = await getUserServiceUsage(userId, userObjectId, startDate, endDate);
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
    const { startDate: customStart, endDate: customEnd, allTime } = req.query;
    const userId = req.user.userId;
    const userObjectId = req.user._id;

    const isAllTime = allTime === 'true';

    if (isAllTime) {
      const kpiMetrics = await getUserKpiMetrics(userId, userObjectId, null, null, true);
      return res.json(kpiMetrics);
    }

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
