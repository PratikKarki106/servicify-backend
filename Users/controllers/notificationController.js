import Notification from "../models/Notification.js";

// Get all notifications for a user
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(50); // Limit to last 50 notifications

    res.json({ 
      success: true, 
      notifications 
    });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);
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
    
    const notification = await Notification.findByIdAndUpdate(
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

// Mark all notifications as read for a user
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Notification.updateMany(
      { userId, read: false },
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

// Create a new notification (for internal use)
export const createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, metadata } = req.body;
    
    const notification = new Notification({
      userId,
      title,
      message,
      type: type || 'general',
      metadata: metadata || {}
    });

    await notification.save();

    res.status(201).json({ 
      success: true, 
      notification 
    });
  } catch (error) {
    console.error("CREATE NOTIFICATION ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get unread notification count for a user
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const count = await Notification.countDocuments({ 
      userId, 
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