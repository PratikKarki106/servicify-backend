import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: Number, // Reference to user ID
    required: true,
    index: true
  },
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
    enum: ['appointment', 'service', 'offer', 'reminder', 'general'],
    default: 'general'
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    // Additional data related to the notification
    appointmentId: { type: String },
    serviceId: { type: String },
    link: { type: String } // Link to redirect user when clicking notification
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

export default mongoose.model("Notification", notificationSchema);