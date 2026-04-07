import express from 'express';
import {
  getVehicles,
  getVehicle,
  addVehicle,
  updateVehicle,
  deleteVehicle
} from '../Controllers/vehicleController.js';
const router = express.Router();

// Get all vehicles for current user
router.get('/', getVehicles);

// Get single vehicle
router.get('/:id', getVehicle);

// Add new vehicle
router.post('/', addVehicle);

// Update vehicle
router.put('/:id', updateVehicle);

// Delete vehicle
router.delete('/:id', deleteVehicle);

export default router;