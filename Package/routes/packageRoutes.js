import express from 'express';
import {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    getPackageStatistics,
    getUserPackages
} from '../controllers/PackageControllers.js';
import { authenticateJWT } from '../../Users/middleware/authenticateJWT.js';

const router = express.Router();

// Public routes
router.get('/', getAllPackages);
router.get('/:id', getPackageById);

// User routes (require authentication)
router.get('/user/my-packages', authenticateJWT, getUserPackages);

// Admin routes (no auth for now)
router.post('/', createPackage);
router.put('/:id', updatePackage);
router.delete('/:id', deletePackage);
router.get('/admin/statistics', getPackageStatistics);

export default router;