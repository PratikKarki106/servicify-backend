import express from 'express';
import {
  createAppointment,
  getSlotAvailability,
  getAppointmentsByUser,
  getAppointmentById,
  getAllAppointments,
  updateAppointmentStatus,
  updateAppointment,
  cancelAppointment,
  updateBillItems
} from '../controllers/appointmentController.js';

const router = express.Router();

// Existing routes
router.get('/appointment', getAllAppointments);
router.post('/', createAppointment);
router.get('/availability', getSlotAvailability);
router.get('/user/:userId', getAppointmentsByUser);
router.get('/appointment/:appointmentId', getAppointmentById);

// Update routes
router.patch('/appointment/:appointmentId/status', updateAppointmentStatus);
router.put('/appointment/:appointmentId', updateAppointment);
router.patch('/appointment/cancel/:appointmentId', cancelAppointment);
router.put('/appointment/:appointmentId/bill', updateBillItems);

export default router;