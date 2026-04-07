import mongoose from "mongoose";

const adminNotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['appointment', 'service', 'booking', 'cancellation', 'payment', 'general'],
    default: 'general'
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    // Additional data related to the notification
    appointmentId: { type: String },
    userId: { type: Number },
    serviceType: { type: String },
    link: { type: String } // Link to redirect when clicking notification
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

export default mongoose.model("AdminNotification", adminNotificationSchema);
