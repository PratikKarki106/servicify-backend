import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  // Revenue tracking
  revenue: {
    type: Number,
    default: 0
  },
  
  // Appointment reference
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  
  // Service type (Servicing, Repair, Checkup, Wash)
  serviceType: {
    type: String,
    enum: ['Servicing', 'Repair', 'Checkup', 'Wash'],
    required: true
  },
  
  // Status (Completed, In Progress, Pending, Cancelled, Confirmed)
  status: {
    type: String,
    enum: ['Completed', 'In Progress', 'Pending', 'Cancelled', 'Confirmed'],
    required: true
  },
  
  // Date for tracking
  date: {
    type: Date,
    default: Date.now
  },
  
  // Additional metadata
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Index for efficient querying
analyticsSchema.index({ date: -1 });
analyticsSchema.index({ status: 1 });
analyticsSchema.index({ serviceType: 1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;
