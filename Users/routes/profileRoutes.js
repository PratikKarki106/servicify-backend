import express from 'express';
import {
  getProfile,
  updateProfile,
  uploadProfilePictureController as uploadProfilePicture,
  deleteProfilePictureController as deleteProfilePicture,
  upload
} from '../controllers/profileController.js';
import { authenticateJWT } from '../middleware/authenticateJWT.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateJWT);

// Profile routes
router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/upload-picture', upload.single('profilePicture'), uploadProfilePicture);
router.delete('/delete-picture', deleteProfilePicture);

export default router;
