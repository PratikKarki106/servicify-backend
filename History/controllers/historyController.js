import Appointment from '../../BookAppointment/models/Appointment.js';
import Payment from '../../Payment/models/Payment.js';
import PackagePurchase from '../../Payment/models/PackagePurchase.js';
import User from '../../Users/models/User.js';

/**
 * Group items by date
 */
const groupByDate = (items, type) => {
  const groups = {};

  items.forEach(item => {
    const dateKey = type === 'appointment' 
      ? new Date(item.createdAt).toISOString().split('T')[0]
      : new Date(item.purchasedAt).toISOString().split('T')[0];

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        items: [],
        totalRevenue: 0,
        appointmentCount: 0,
        packageCount: 0
      };
    }

    groups[dateKey].items.push(item);
    
    if (type === 'appointment') {
      groups[dateKey].totalRevenue += item.totalAmount || 0;
      groups[dateKey].appointmentCount += 1;
    } else {
      groups[dateKey].totalRevenue += item.amount || 0;
      groups[dateKey].packageCount += 1;
    }
  });

  return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * Calculate total amount for an appointment
 */
const calculateAppointmentTotal = (appointment) => {
  if (!appointment.billItems || !appointment.billItems.length) {
    return 0;
  }
  return appointment.billItems.reduce((sum, item) => {
    return sum + (item.itemPrice || 0) + (item.serviceCharge || 0);
  }, 0);
};

/**
 * Get history data with filters
 */
export const getHistory = async (req, res) => {
  try {
    const {
      type = 'all',
      status = 'all',
      startDate,
      endDate,
      page = 1,
      limit = 50,
      export: isExport
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.$gte = startDate ? new Date(startDate) : new Date('2000-01-01');
      dateFilter.$lte = endDate ? new Date(endDate) : new Date();
    }

    let appointments = [];
    let packages = [];

    // Fetch appointments
    if (type === 'all' || type === 'appointment') {
      const appointmentFilter = {};
      
      if (Object.keys(dateFilter).length > 0) {
        appointmentFilter.createdAt = dateFilter;
      }

      if (status !== 'all') {
        appointmentFilter.status = status;
      }

      appointments = await Appointment.find(appointmentFilter)
        .sort({ createdAt: -1 })
        .lean();

      // Calculate total amount and add payment status
      appointments = await Promise.all(
        appointments.map(async (apt) => {
          const totalAmount = calculateAppointmentTotal(apt);
          
          // Get payment status
          const payment = await Payment.findOne({ 
            appointmentId: apt.appointmentId 
          }).lean();

          return {
            ...apt,
            totalAmount,
            paymentStatus: payment?.paymentStatus || 'initiated'
          };
        })
      );

      // Filter by status if needed
      if (status !== 'all') {
        appointments = appointments.filter(apt => apt.status === status);
      }
    }

    // Fetch packages
    if (type === 'all' || type === 'package') {
      const packageFilter = {};
      
      if (Object.keys(dateFilter).length > 0) {
        packageFilter.purchasedAt = dateFilter;
      }

      if (status !== 'all') {
        packageFilter.paymentStatus = status;
      }

      packages = await PackagePurchase.find(packageFilter)
        .populate('packageId', 'name')
        .lean();

      // Get user details and payment status
      packages = await Promise.all(
        packages.map(async (pkg) => {
          const payment = await Payment.findOne({ 
            _id: pkg.paymentId 
          }).lean();

          const user = await User.findById(pkg.userId).lean();

          return {
            ...pkg,
            packageName: pkg.packageId?.name || 'Unknown Package',
            userEmail: user?.email || 'Unknown',
            userName: user?.name || 'Unknown',
            paymentStatus: payment?.paymentStatus || pkg.isActive ? 'completed' : 'failed'
          };
        })
      );

      // Filter by status if needed
      if (status !== 'all' && type === 'package') {
        packages = packages.filter(pkg => pkg.paymentStatus === status);
      }
    }

    // Combine and sort by date
    let allItems = [];
    
    if (type === 'all') {
      // Combine both types
      allItems = [
        ...appointments.map(apt => ({ ...apt, _type: 'appointment' })),
        ...packages.map(pkg => ({ ...pkg, _type: 'package' }))
      ];
      
      // Sort by creation/purchase date
      allItems.sort((a, b) => {
        const dateA = a._type === 'appointment' ? a.createdAt : a.purchasedAt;
        const dateB = b._type === 'appointment' ? b.createdAt : b.purchasedAt;
        return new Date(dateB) - new Date(dateA);
      });
    } else if (type === 'appointment') {
      allItems = appointments.map(apt => ({ ...apt, _type: 'appointment' }));
    } else {
      allItems = packages.map(pkg => ({ ...pkg, _type: 'package' }));
    }

    // Apply pagination if not exporting
    let paginatedItems = allItems;
    let totalPages = 1;
    
    if (!isExport) {
      paginatedItems = allItems.slice(skip, skip + limitNum);
      totalPages = Math.ceil(allItems.length / limitNum);
    }

    // Group by date
    const appointmentItems = paginatedItems.filter(item => item._type === 'appointment');
    const packageItems = paginatedItems.filter(item => item._type === 'package');

    const appointmentGroups = groupByDate(appointmentItems, 'appointment');
    const packageGroups = groupByDate(packageItems, 'package');

    // Merge groups
    const allGroups = {};
    
    [...appointmentGroups, ...packageGroups].forEach(group => {
      if (!allGroups[group.date]) {
        allGroups[group.date] = {
          date: group.date,
          items: [],
          totalRevenue: 0,
          appointmentCount: 0,
          packageCount: 0
        };
      }
      
      allGroups[group.date].items.push(...group.items);
      allGroups[group.date].totalRevenue += group.totalRevenue;
      allGroups[group.date].appointmentCount += group.appointmentCount;
      allGroups[group.date].packageCount += group.packageCount;
    });

    // Sort items within each group by time
    const groups = Object.values(allGroups)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => {
          const timeA = a._type === 'appointment' ? a.time : '00:00';
          const timeB = b._type === 'appointment' ? b.time : '00:00';
          return timeB.localeCompare(timeA);
        })
      }));

    // Calculate summary
    const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0) +
                         packages.reduce((sum, pkg) => sum + (pkg.amount || 0), 0);

    res.json({
      success: true,
      data: {
        groups,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: allItems.length,
          itemsPerPage: limitNum
        },
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalAppointments: appointments.length,
          totalPackages: packages.length
        }
      }
    });
  } catch (error) {
    console.error('[History Controller] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch history data',
      error: error.message 
    });
  }
};

/**
 * Export history to CSV
 */
export const exportHistory = async (req, res) => {
  try {
    const { type = 'all', status = 'all', startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.$gte = startDate ? new Date(startDate) : new Date('2000-01-01');
      dateFilter.$lte = endDate ? new Date() : new Date();
    }

    let appointments = [];
    let packages = [];

    // Fetch appointments
    if (type === 'all' || type === 'appointment') {
      const appointmentFilter = {};
      if (Object.keys(dateFilter).length > 0) {
        appointmentFilter.createdAt = dateFilter;
      }
      if (status !== 'all') {
        appointmentFilter.status = status;
      }

      appointments = await Appointment.find(appointmentFilter)
        .sort({ createdAt: -1 })
        .lean();

      appointments = await Promise.all(
        appointments.map(async (apt) => {
          const totalAmount = calculateAppointmentTotal(apt);
          const payment = await Payment.findOne({ appointmentId: apt.appointmentId }).lean();
          return {
            ...apt,
            totalAmount,
            paymentStatus: payment?.paymentStatus || 'initiated',
            _type: 'appointment'
          };
        })
      );
    }

    // Fetch packages
    if (type === 'all' || type === 'package') {
      const packageFilter = {};
      if (Object.keys(dateFilter).length > 0) {
        packageFilter.purchasedAt = dateFilter;
      }

      packages = await PackagePurchase.find(packageFilter)
        .populate('packageId', 'name')
        .lean();

      packages = await Promise.all(
        packages.map(async (pkg) => {
          const payment = await Payment.findOne({ _id: pkg.paymentId }).lean();
          const user = await User.findById(pkg.userId).lean();
          return {
            ...pkg,
            packageName: pkg.packageId?.name || 'Unknown Package',
            userEmail: user?.email || 'Unknown',
            userName: user?.name || 'Unknown',
            paymentStatus: payment?.paymentStatus || pkg.isActive ? 'completed' : 'failed',
            _type: 'package'
          };
        })
      );
    }

    // Combine and sort
    let allItems = [];
    if (type === 'all') {
      allItems = [
        ...appointments.map(apt => ({ ...apt, _type: 'appointment' })),
        ...packages.map(pkg => ({ ...pkg, _type: 'package' }))
      ];
      allItems.sort((a, b) => {
        const dateA = a._type === 'appointment' ? a.createdAt : a.purchasedAt;
        const dateB = b._type === 'appointment' ? b.createdAt : b.purchasedAt;
        return new Date(dateB) - new Date(dateA);
      });
    } else if (type === 'appointment') {
      allItems = appointments;
    } else {
      allItems = packages;
    }

    // Generate CSV
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Type,Service/Package,Customer,Vehicle/Details,Status,Amount\n';

    allItems.forEach(item => {
      const date = item._type === 'appointment' 
        ? new Date(item.createdAt).toLocaleDateString()
        : new Date(item.purchasedAt).toLocaleDateString();

      const type = item._type === 'appointment' ? 'Appointment' : 'Package';
      
      const serviceOrPackage = item._type === 'appointment'
        ? item.serviceType
        : item.packageName;

      const customer = item._type === 'appointment'
        ? item.name
        : item.userName;

      const details = item._type === 'appointment'
        ? `${item.vehicleInfo?.name || ''} ${item.vehicleInfo?.model || ''}`
        : `${item.totalCredits} credits`;

      const status = item._type === 'appointment'
        ? item.status
        : item.paymentStatus;

      const amount = item._type === 'appointment'
        ? item.totalAmount || 0
        : item.amount || 0;

      csvContent += `${date},${type},${serviceOrPackage},${customer},${details},${status},${amount}\n`;
    });

    // Set headers and send
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=history-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('[History Controller] Error exporting:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export history',
      error: error.message 
    });
  }
};
