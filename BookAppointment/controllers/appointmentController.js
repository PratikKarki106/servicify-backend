import Appointment from "../models/Appointment.js";
import Notification from "../../Users/models/Notification.js";
import AdminNotification from "../../Users/models/AdminNotification.js";
import errorMessages from "../../utils/errorMessages.js";

// 🔢 Slot limits per service
const SLOT_LIMITS = {
  servicing: 3,
  repair: 2,
  checkup: 2,
  wash: 2,
};

const SERVICE_SLOTS = {
  servicing: [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'
  ],
  repair: [
    '09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'
  ], 
  checkup: [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'
  ], 
  wash: [
    '09:00 AM', '09:20 AM', '09:40 AM', '10:00 AM',
    '10:20 AM', '10:40 AM', '11:00 AM', '11:20 AM',
    '11:40 AM', '12:00 PM', '02:00 PM', '02:20 PM',
    '02:40 PM', '03:00 PM', '03:20 PM', '03:40 PM',
    '04:00 PM', '04:20 PM', '04:40 PM', '05:00 PM',
    '05:20 PM', '05:40 PM', '06:00 PM'
  ],
};


// Helper function to create notification
const createNotificationForAppointment = async (userId, title, message, type, appointmentId) => {
  try {
    const notification = new Notification({
      userId: Number(userId),
      title,
      message,
      type,
      metadata: {
        appointmentId: appointmentId.toString(),
        link: `/user/history/${appointmentId}` // Link to appointment history
      }
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error("NOTIFICATION CREATION ERROR:", error);
    // Don't throw error as it shouldn't affect the main appointment creation
  }
};

// Helper function to create admin notification
const createAdminNotification = async (title, message, type, metadata, priority = 'medium') => {
  try {
    const notification = new AdminNotification({
      title,
      message,
      type,
      metadata,
      priority
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error("ADMIN NOTIFICATION CREATION ERROR:", error);
    // Don't throw error as it shouldn't affect the main operation
  }
};

// ✅ Create new appointment
export const createAppointment = async (req, res) => {
  try {
    const {
      userId,
      serviceType,
      vehicleInfo,
      date,
      time,
      pickupRequired,
      pickupAddress,
      email,
      name,
      contactNumber
    } = req.body;

    if (!userId || !serviceType || !vehicleInfo || !date || !time ) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 🧠 Determine service pool
    let servicePool = [serviceType];
    if (serviceType === "repair" || serviceType === "checkup") {
      servicePool = ["repair", "checkup"];
    }

    // 🔢 Count existing appointments for this date/time/service pool
    const existingCount = await Appointment.countDocuments({
      date,
      time,
      serviceType: { $in: servicePool },
    });

    const limit = SLOT_LIMITS[serviceType];
    if (!limit) {
      return res.status(400).json({ message: "Invalid service type" });
    }

    if (existingCount >= limit) {
      return res.status(409).json({
        success: false,
        message: "Slot full for selected service",
      });
    }

    const lastestAppointment = await Appointment.findOne()
    .sort({appointmentId: -1})
    .select('appointmentId');

    let nextAppointmentId = 1;
    if (lastestAppointment && lastestAppointment.appointmentId) {
      nextAppointmentId = lastestAppointment.appointmentId + 1; 

    }
    // 📝 Create appointment
    const appointment = new Appointment({
      userId: Number(userId),
      appointmentId: nextAppointmentId,
      serviceType,
      vehicleInfo,
      date,
      time,
      pickupRequired,
      pickupAddress: pickupRequired ? pickupAddress : undefined,
      email,
      name,
      contactNumber
    });

    await appointment.save();

    // Create admin notification for new booking
    await createAdminNotification(
      "New Appointment Booking",
      `New ${serviceType} appointment booked for ${date} at ${time}`,
      "booking",
      {
        appointmentId: appointment.appointmentId.toString(),
        userId: appointment.userId,
        serviceType: appointment.serviceType,
        link: `/admin/view-appointment`
      },
      'high'
    );

    // Get the io instance to emit WebSocket events
    const io = req.app.get('io');

    // Emit WebSocket event for real-time updates to admin
    if (io) {
      // Emit to admin room for real-time dashboard updates
      io.to('admin_room').emit('new_appointment', {
        appointmentId: appointment.appointmentId,
        serviceType: appointment.serviceType,
        date: appointment.date,
        time: appointment.time,
        message: 'New appointment created'
      });
      // Emit to the specific user
      io.to(`user_${userId}`).emit('appointment_created', {
        appointment: appointment.toObject()
      });

      // Emit to admin room for admin dashboard updates
      io.to('admin_room').emit('appointment_created', {
        appointment: appointment.toObject(),
        message: `New appointment created for user ${userId}`
      });
    }

    // Create notification for successful appointment booking
    await createNotificationForAppointment(
      userId,
      "Appointment Booked Successfully!",
      `Your ${serviceType} appointment has been booked for ${date} at ${time}.`,
      "appointment",
      appointment.appointmentId
    );

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    console.error("APPOINTMENT ERROR 👉", error);
    res.status(500).json({ message: error.message });
  }
};


export const getSlotAvailability = async (req, res) => {
  try {
    const { date, serviceType } = req.query;
    if (!date || !serviceType) return res.status(400).json({ message: "Date and serviceType required" });


    const slots = SERVICE_SLOTS[serviceType];
    if (!slots) return res.status(400).json({ message: "Invalid service type" });

    // Shared pool logic
    let pool = [serviceType];
    if (serviceType === "repair" || serviceType === "checkup") pool = ["repair", "checkup"];

    const availability = await Promise.all(
      slots.map(async (time) => {
        const count = await Appointment.countDocuments({
          date,
          time,
          serviceType: { $in: pool }
        });
        return { time, available: count < SLOT_LIMITS[serviceType] };
      })
    );

    res.json({ success: true, availability });

  } catch (err) {
    console.error("AVAILABILITY ERROR 👉", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



// Get all appointments for a user
export const getAppointmentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const appointments = await Appointment.find({ userId: Number(userId) });

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        success: false,
        code: "APPOINTMENT_NOT_FOUND",
        message: errorMessages.APPOINTMENT_NOT_FOUND,
      });
    }

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: "DB_QUERY_FAILED",
      message: errorMessages.DB_QUERY_FAILED,
      error: error.message,
    });
  }
};

// ✅ Get single appointment by ID
export const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findOne({ appointmentId: parseInt(appointmentId) });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        code: "APPOINTMENT_NOT_FOUND",
        message: errorMessages.APPOINTMENT_NOT_FOUND,
      });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: "DB_QUERY_FAILED",
      message: errorMessages.DB_QUERY_FAILED,
      error: error.message,
    });
  }
};


// Get all appointments (for admin/dashboard view)
export const getAllAppointments = async (req, res) => {
  try {
    let { 
      page = 1, 
      limit = 10, 
      serviceType, 
      status, 
      date,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // ✅ Parse to numbers
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};

    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.status = status;

    if (date) {
      // Filter by exact date match (match the date string stored in the database)
      filter.date = date;
    }

    const skip = (page - 1) * limit;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const appointments = await Appointment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)   // ✅ already number
      .lean();

    const total = await Appointment.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error("GET ALL APPOINTMENTS ERROR 👉", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch appointments"
    });
  }
};


// In your appointment controller file (after getAllAppointments)

// ✅ Update appointment status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    // Validate status value
    const validStatuses = ['booked', 'confirmed', 'in-progress', 'payment', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Valid values: " + validStatuses.join(', ')
      });
    }

    const appointment = await Appointment.findOne({ appointmentId: parseInt(appointmentId) });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        code: "APPOINTMENT_NOT_FOUND",
        message: errorMessages.APPOINTMENT_NOT_FOUND,
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "Cannot update status of a cancelled appointment",
        appointmentId: appointment.appointmentId,
        currentStatus: appointment.status
      });
    }

    // Store the previous status to determine notification message
    const previousStatus = appointment.status;

    // Update status and set updatedAt timestamp
    appointment.status = status;
    appointment.updatedAt = new Date();

    await appointment.save();

    // Get the io instance to emit WebSocket events
    const io = req.app.get('io');

    // Emit WebSocket event for real-time updates
    if (io) {
      // Emit to the specific user
      io.to(`user_${appointment.userId}`).emit('appointment_status_updated', {
        appointmentId: appointment.appointmentId,
        status: status,
        previousStatus: previousStatus,
        message: `Appointment status updated to ${status}`
      });

      // Emit to admin room for admin dashboard updates
      io.to('admin_room').emit('appointment_status_updated', {
        appointmentId: appointment.appointmentId,
        userId: appointment.userId,
        status: status,
        previousStatus: previousStatus,
        message: `Appointment ${appointment.appointmentId} status updated to ${status} for user ${appointment.userId}`
      });
    }

    // Create notification based on status change
    if (previousStatus !== status) {
      let notificationTitle = "";
      let notificationMessage = "";

      switch (status) {
        case 'confirmed':
          notificationTitle = "Appointment Confirmed!";
          notificationMessage = `Your appointment for ${appointment.serviceType} on ${appointment.date} at ${appointment.time} has been confirmed.`;
          break;
        case 'cancelled':
          notificationTitle = "Appointment Cancelled";
          notificationMessage = `Your appointment for ${appointment.serviceType} on ${appointment.date} at ${appointment.time} has been cancelled.`;
          break;
        case 'completed':
          notificationTitle = "Service Completed!";
          notificationMessage = `Your ${appointment.serviceType} service has been completed successfully.`;
          break;
        case 'in-progress':
          notificationTitle = "Service In Progress";
          notificationMessage = `Your ${appointment.serviceType} service is now in progress.`;
          break;
        case 'payment':
          notificationTitle = "Payment Due";
          notificationMessage = `Your ${appointment.serviceType} service is complete. Please proceed with payment to finish.`;
          break;
        default:
          notificationTitle = "Appointment Status Updated";
          notificationMessage = `Your appointment status has been updated to ${status}.`;
      }

      // Send notification to the user
      await createNotificationForAppointment(
        appointment.userId,
        notificationTitle,
        notificationMessage,
        "appointment",
        appointment.appointmentId
      );
    }

    res.json({
      success: true,
      message: "Appointment status updated successfully",
      appointment
    });

  } catch (error) {
    console.error("UPDATE APPOINTMENT STATUS ERROR 👉", error);
    res.status(500).json({
      success: false,
      code: "DB_UPDATE_FAILED",
      message: errorMessages.DB_UPDATE_FAILED || "Failed to update appointment status",
      error: error.message,
    });
  }
};

// ✅ Update appointment details (optional, if you want full update)
export const updateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const updates = req.body;

    const appointment = await Appointment.findOne({ appointmentId: parseInt(appointmentId) });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        code: "APPOINTMENT_NOT_FOUND",
        message: errorMessages.APPOINTMENT_NOT_FOUND,
      });
    }

    const allowedUpdates = [
      'serviceType',
      'vehicleInfo',
      'date',
      'time',
      'pickupRequired',
      'pickupAddress',
      'email',
      'name',
      'contactNumber'
    ];

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        appointment[key] = updates[key];
      }
    });

    appointment.updatedAt = new Date();

    await appointment.save();

    res.json({
      success: true,
      message: "Appointment updated successfully",
      appointment
    });

  } catch (error) {
    console.error("UPDATE APPOINTMENT ERROR 👉", error);
    res.status(500).json({
      success: false,
      code: "DB_UPDATE_FAILED",
      message: errorMessages.DB_UPDATE_FAILED || "Failed to update appointment",
      error: error.message,
    });
  }
};


// In your backend controller file, add this function:
export const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findOne({ appointmentId: parseInt(appointmentId) });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        code: "APPOINTMENT_NOT_FOUND",
        message: errorMessages.APPOINTMENT_NOT_FOUND,
      });
    }

    // Check if appointment can be cancelled
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Appointment is already ${appointment.status} and cannot be cancelled`
      });
    }

    // Update appointment status
    appointment.status = 'cancelled';
    appointment.cancellationReason = cancellationReason || 'Cancelled by user';
    appointment.cancelledAt = new Date();
    appointment.updatedAt = new Date();

    await appointment.save();

    // Get io instance for WebSocket
    const io = req.app.get('io');

    // Emit WebSocket events
    if (io) {
      io.to(`user_${appointment.userId}`).emit('appointment_cancelled', {
        appointmentId: appointment.appointmentId,
        message: `Appointment cancelled successfully`
      });

      io.to('admin_room').emit('appointment_cancelled', {
        appointmentId: appointment.appointmentId,
        userId: appointment.userId,
        message: `Appointment ${appointment.appointmentId} cancelled by user ${appointment.userId}`
      });
    }

    // Create notification
    await createNotificationForAppointment(
      appointment.userId,
      "Appointment Cancelled",
      `Your ${appointment.serviceType} appointment for ${appointment.date} at ${appointment.time} has been cancelled.`,
      "appointment",
      appointment.appointmentId
    );

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
      appointment
    });

  } catch (error) {
    console.error("CANCEL APPOINTMENT ERROR 👉", error);
    res.status(500).json({
      success: false,
      code: "DB_UPDATE_FAILED",
      message: errorMessages.DB_UPDATE_FAILED || "Failed to cancel appointment",
      error: error.message,
    });
  }
};

// ✅ Update bill items for an appointment
export const updateBillItems = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { billItems } = req.body;

    console.log("📝 UPDATE BILL ITEMS - Appointment ID:", appointmentId);
    console.log("📝 UPDATE BILL ITEMS - Bill Items:", billItems);

    if (!billItems || !Array.isArray(billItems)) {
      return res.status(400).json({
        success: false,
        message: "Bill items array is required"
      });
    }

    const appointment = await Appointment.findOne({ appointmentId: parseInt(appointmentId) });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        code: "APPOINTMENT_NOT_FOUND",
        message: errorMessages.APPOINTMENT_NOT_FOUND,
      });
    }

    // Update bill items
    appointment.billItems = billItems;
    appointment.updatedAt = new Date();

    await appointment.save();

    console.log("✅ Bill items saved successfully for appointment:", appointmentId);

    // Get io instance for WebSocket
    const io = req.app.get('io');

    // Emit WebSocket event for bill update
    if (io) {
      io.to(`user_${appointment.userId}`).emit('bill_updated', {
        appointmentId: appointment.appointmentId,
        message: `Bill has been updated for your appointment`
      });
    }

    res.json({
      success: true,
      message: "Bill items updated successfully",
      appointment
    });

  } catch (error) {
    console.error("UPDATE BILL ITEMS ERROR 👉", error);
    res.status(500).json({
      success: false,
      code: "DB_UPDATE_FAILED",
      message: errorMessages.DB_UPDATE_FAILED || "Failed to update bill items",
      error: error.message,
    });
  }
};