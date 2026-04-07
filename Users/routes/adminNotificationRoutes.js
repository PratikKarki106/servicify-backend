import express from 'express';
import {
  getAdminNotifications,
  markAsRead,
  markAllAsRead,
  createAdminNotification,
  getUnreadCount,
  deleteNotification
} from '../controllers/adminNotificationController.js';

const router = express.Router();

// GET routes
router.get('/', getAdminNotifications); // Get all admin notifications
router.get('/unread-count', getUnreadCount); // Get unread count

// PUT/PATCH routes
router.patch('/:notificationId/read', markAsRead); // Mark a single notification as read
router.patch('/mark-all-read', markAllAsRead); // Mark all notifications as read

// POST route
router.post('/', createAdminNotification); // Create a new admin notification

// DELETE route
router.delete('/:notificationId', deleteNotification); // Delete a notification

export default router;
