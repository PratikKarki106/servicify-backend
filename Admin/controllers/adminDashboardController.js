import Appointment from '../../BookAppointment/models/Appointment.js';
import Payment from '../../Payment/models/Payment.js';

// @desc    Get admin dashboard stats for today
// @route   GET /admin/dashboard/stats
// @access  Private (Admin)
export const getDashboardStats = async (req, res) => {
    try {
        const { date } = req.query;
        
        // Parse the date parameter or use today's date
        const targetDate = date ? new Date(date) : new Date();
        
        // Set date range for the target day (midnight to 11:59:59 PM)
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log('Fetching stats for date:', targetDate.toISOString(), 'from:', startOfDay.toISOString(), 'to:', endOfDay.toISOString());

        // Count appointments for today (all statuses)
        const appointmentsToday = await Appointment.countDocuments({
            date: targetDate.toISOString().split('T')[0] // Match the date string
        });

        console.log('Appointments today:', appointmentsToday);

        // Count pending repairs (repair service type with pending/in-progress status)
        const pendingRepairs = await Appointment.countDocuments({
            serviceType: 'repair',
            status: { $in: ['booked', 'confirmed', 'in-progress'] },
            date: targetDate.toISOString().split('T')[0]
        });

        console.log('Pending repairs:', pendingRepairs);

        // Count completed services for today
        const completedServices = await Appointment.countDocuments({
            status: 'completed',
            updatedAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        console.log('Completed services:', completedServices);

        // Calculate total income from completed payments today
        const payments = await Payment.find({
            paymentStatus: 'completed',
            completedAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        const totalIncome = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

        console.log('Total income:', totalIncome);

        res.json({
            success: true,
            appointmentsToday,
            totalIncome: Math.round(totalIncome),
            pendingRepairs,
            completedServices
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching dashboard stats'
        });
    }
};
