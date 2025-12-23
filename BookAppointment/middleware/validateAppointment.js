// middleware/validateAppointment.js
import errorMessages from "../../utils/errorMessages.js";

export const validateAppointment = (req, res, next) => {
  const { serviceType, vehicleInfo, date, time } = req.body;
  if (!serviceType || !vehicleInfo || !date || !time) {
    return res.status(400).json({
      success: false,
      code: "MISSING_FIELDS",
      message: errorMessages.MISSING_FIELDS,
    });
  }
  next();
};