import Appointment from "../models/Appointment.js";
import errorMessages from "../../utils/errorMessages.js";

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
    } = req.body;

    if (!userId || !serviceType || !vehicleInfo || !date || !time) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);

    const existing = await Appointment.findOne({
      date: appointmentDate,
      time,
    });

    if (existing) {
      return res.status(409).json({ message: "Slot unavailable" });
    }

    const appointment = new Appointment({
      userId: Number(userId),
      serviceType,
      vehicleInfo,
      date: appointmentDate,
      time,
      pickupRequired,
      pickupAddress: pickupRequired ? pickupAddress : undefined,
    });

    await appointment.save();

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    console.error("APPOINTMENT ERROR 👉", error);
    res.status(500).json({ message: error.message });
  }
};


// ✅ Get all appointments for a user
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
