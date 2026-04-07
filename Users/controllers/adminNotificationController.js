import AdminNotification from "../models/AdminNotification.js";

// Get all admin notifications
export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await AdminNotification.find()
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(50); // Limit to last 50 notifications

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error("GET ADMIN NOTIFICATIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark a notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await AdminNotification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("MARK AS READ ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    await AdminNotification.updateMany(
      { read: false },
      { read: true }
    );

    res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("MARK ALL AS READ ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a new admin notification (for internal use)
export const createAdminNotification = async (req, res) => {
  try {
    const { title, message, type, metadata, priority } = req.body;

    const notification = new AdminNotification({
      title,
      message,
      type: type || 'general',
      metadata: metadata || {},
      priority: priority || 'medium'
    });

    await notification.save();

    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("CREATE ADMIN NOTIFICATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get unread notification count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await AdminNotification.countDocuments({
      read: false
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error("GET UNREAD COUNT ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await AdminNotification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully"
    });
  } catch (error) {
    console.error("DELETE NOTIFICATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
