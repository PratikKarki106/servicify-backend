import Appointment from '../../BookAppointment/models/Appointment.js';
import Payment from '../../Payment/models/Payment.js';

// @desc    Get user dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private (requires authentication)
export const getUserStats = async (req, res) => {
  try {
    // req.user contains the full user object from authenticateJWT
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('Fetching stats for user:', user._id, 'userId:', user.userId);

    // Fetch total services (completed appointments) - uses numeric userId
    const totalServices = await Appointment.countDocuments({
      userId: user.userId,
      status: 'completed'
    });

    console.log('Total services:', totalServices);

    // Fetch total spent from completed payments - uses ObjectId _id
    // Amount is stored as-is from frontend
    const payments = await Payment.find({
      userId: user._id,
      paymentStatus: 'completed'
    });

    console.log('Payments found:', payments.length);

    // Sum all payment amounts
    const totalSpent = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    console.log('Total spent:', totalSpent);

    // Calculate loyalty points (1 point per Rs. 100 spent)
    const loyaltyPoints = Math.floor(totalSpent / 100);

    // Fetch upcoming services (booked, confirmed, or in-progress appointments) - uses numeric userId
    const upcomingServices = await Appointment.countDocuments({
      userId: user.userId,
      status: { $in: ['booked', 'confirmed', 'in-progress'] }
    });

    console.log('Upcoming services:', upcomingServices);

    res.json({
      totalServices,
      totalSpent: Math.round(totalSpent),
      upcomingServices,
      loyaltyPoints
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard stats' });
  }
};
