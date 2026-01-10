import Appointment from "../models/Appointment.js";
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

    if (!userId || !serviceType || !vehicleInfo || !date || !time) {
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

    // 📝 Create appointment
    const appointment = new Appointment({
      userId: Number(userId),
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
    const appointments = await Appointment.find({ userId });

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
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

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
      const filterDate = date;

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
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    // Validate status value
    const validStatuses = ['booked', 'confirmed', 'cancelled', 'completed', 'in-progress'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Valid values: " + validStatuses.join(', ')
      });
    }

    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        code: "APPOINTMENT_NOT_FOUND",
        message: errorMessages.APPOINTMENT_NOT_FOUND,
      });
    }

    // Update status and set updatedAt timestamp
    appointment.status = status;
    appointment.updatedAt = new Date();
    
    await appointment.save();

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
    const { id } = req.params;
    const updates = req.body;

    const appointment = await Appointment.findById(id);
    
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