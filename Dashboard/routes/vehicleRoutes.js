import express from 'express';
import multer from 'multer';
import {
  getVehicles,
  getVehicle,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getPendingVehicles,
  verifyVehicle,
  rejectVehicle,
  updateVehicleStatus
} from '../Controllers/vehicleController.js';
const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all vehicles for current user
router.get('/', getVehicles);

// Get single vehicle
router.get('/:id', getVehicle);

// Add new vehicle (with file upload)
router.post('/', upload.single('image'), addVehicle);

// Update vehicle
router.put('/:id', updateVehicle);

// Delete vehicle
router.delete('/:id', deleteVehicle);

// Admin routes
// Get all vehicles (with status filter: pending, verified, rejected)
router.get('/admin/vehicles', getPendingVehicles);

// Verify a vehicle
router.put('/admin/vehicles/:id/verify', verifyVehicle);

// Reject a vehicle
router.put('/admin/vehicles/:id/reject', rejectVehicle);

// Update vehicle status (change to any status)
router.put('/admin/vehicles/:id/update-status', updateVehicleStatus);

export default router;