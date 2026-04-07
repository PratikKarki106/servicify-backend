import User from '../models/User.js';
import Appointment from '../../BookAppointment/models/Appointment.js';
import Payment from '../../Payment/models/Payment.js';
import PackagePurchase from '../../Payment/models/PackagePurchase.js';
import Vehicle from '../../Dashboard/models/Vehicle.js';
import { deleteProfilePicture } from '../../services/minio.js';

// Get all users with pagination and filters
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip(skip)
      .select('-password');

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single user details with all related data
export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user's appointments
    const appointments = await Appointment.find({ userId: user.userId })
      .sort({ createdAt: -1 });

    // Get user's payments
    const payments = await Payment.find({ userId: user._id })
      .sort({ createdAt: -1 });

    // Get user's package purchases
    const packagePurchases = await PackagePurchase.find({ userId: user._id })
      .populate('packageId')
      .sort({ purchasedAt: -1 });

    // Get user's vehicles
    const vehicles = await Vehicle.find({ userId: user.userId })
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalSpent = payments
      .filter(p => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const activePackages = packagePurchases.filter(
      pkg => pkg.isActive && pkg.expiryDate > new Date() && pkg.remainingCredits > 0
    ).length;

    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const upcomingAppointments = appointments.filter(a => 
      ['booked', 'confirmed', 'in-progress'].includes(a.status)
    ).length;

    // Generate profile picture URL if exists
    let profilePictureUrl = null;
    if (user.profilePicture) {
      try {
        const { getProfilePictureUrl } = await import('../../services/minio.js');
        profilePictureUrl = await getProfilePictureUrl(user.profilePicture);
      } catch (error) {
        console.error('Error generating profile picture URL:', error.message);
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          profilePictureUrl
        },
        statistics: {
          totalSpent,
          totalAppointments: appointments.length,
          completedAppointments,
          upcomingAppointments,
          activePackages,
          totalPackages: packagePurchases.length,
          totalVehicles: vehicles.length
        },
        appointments,
        payments,
        packagePurchases,
        vehicles
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user, message: `User role updated to ${role}` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete profile picture from MinIO if exists
    if (user.profilePicture) {
      try {
        await deleteProfilePicture(user.profilePicture);
      } catch (error) {
        console.error('Error deleting profile picture:', error.message);
      }
    }

    // Delete related data
    await Promise.all([
      Appointment.deleteMany({ userId: user.userId }),
      Payment.deleteMany({ userId: user._id }),
      PackagePurchase.deleteMany({ userId: user._id }),
      Vehicle.deleteMany({ userId: user.userId })
    ]);

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({ success: true, message: 'User and all related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user statistics for dashboard
export const getUserStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const verifiedUsers = await User.countDocuments({ role: 'user', isVerified: true });

    // Get new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: startOfMonth }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalAdmins,
        verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        newUsersThisMonth
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
