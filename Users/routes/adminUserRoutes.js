import express from 'express';
import {
  getAllUsers,
  getUserDetails,
  updateUserRole,
  deleteUser,
  getUserStatistics
} from '../controllers/adminUserController.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';
import { authorizeRoles } from '../middleware/authorizedRoles.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

// User management routes
router.get('/', getAllUsers);
router.get('/statistics', getUserStatistics);
router.get('/:id', getUserDetails);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
