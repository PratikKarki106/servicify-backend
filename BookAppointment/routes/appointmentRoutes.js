import express from 'express';
import {
  createAppointment,
  getSlotAvailability,
  getAppointmentsByUser,
  getAppointmentById,
  getAllAppointments,
  updateAppointmentStatus,  // Add this
  updateAppointment        // Add this if needed
} from '../controllers/appointmentController.js';

const router = express.Router();

// Existing routes
router.get('/appointment', getAllAppointments);  
router.post('/', createAppointment);
router.get('/availability', getSlotAvailability);
router.get('/user/:userId', getAppointmentsByUser);
router.get('/appointment/:id', getAppointmentById);


// NEW: Add update routes
router.patch('/appointment/:id/status', updateAppointmentStatus);  // For status updates only
router.put('/appointment/:id', updateAppointment);  // For full updates (optional)

export default router;