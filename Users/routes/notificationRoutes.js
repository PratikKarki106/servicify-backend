import express from 'express';
import { 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead, 
  createNotification,
  getUnreadCount
} from '../controllers/notificationController.js';

const router = express.Router();

// GET routes
router.get('/user/:userId', getUserNotifications); // Get all notifications for a user
router.get('/user/:userId/unread-count', getUnreadCount); // Get unread count for a user

// PUT/PATCH routes
router.patch('/:notificationId/read', markAsRead); // Mark a single notification as read
router.patch('/user/:userId/mark-all-read', markAllAsRead); // Mark all notifications as read for a user

// POST route
router.post('/', createNotification); // Create a new notification (internal use)

export default router;