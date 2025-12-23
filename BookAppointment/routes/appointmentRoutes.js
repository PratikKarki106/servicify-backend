import express from "express";
import { createAppointment, getAppointmentsByUser, getAppointmentById } from "../controllers/appointmentController.js";
import { validateAppointment } from "../middleware/validateAppointment.js";

const router = express.Router();

router.post("/", validateAppointment, createAppointment);
router.get("/user/:userId", getAppointmentsByUser);
router.get("/:id", getAppointmentById); 

export default router;