import mongoose from 'mongoose';

const userPackageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },
  
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  totalCredits: {
    type: Number,
    required: true,
    min: [1, 'Total credits must be at least 1']
  },
  
  usedCredits: {
    type: Number,
    default: 0,
    min: [0, 'Used credits cannot be negative']
  },
  
  remainingCredits: {
    type: Number,
    default: function() {
      return this.totalCredits;
    },
    min: [0, 'Remaining credits cannot be negative']
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Track usage history
  usageHistory: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceBooking'
    },
    usedDate: {
      type: Date,
      default: Date.now
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle'
    },
    notes: String
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
userPackageSchema.index({ user: 1, package: 1 }, { unique: true });
userPackageSchema.index({ user: 1, isActive: 1 });

// Pre-save middleware to calculate remaining credits
userPackageSchema.pre('save', function(next) {
  this.remainingCredits = this.totalCredits - this.usedCredits;
  this.isActive = this.remainingCredits > 0;
  this.updatedAt = Date.now();
  next();
});

// Method to use a credit
userPackageSchema.methods.useCredit = function(serviceId, vehicleId, notes = '') {
  if (this.remainingCredits < 1) {
    throw new Error('No credits remaining');
  }
  
  this.usedCredits += 1;
  this.usageHistory.push({
    serviceId,
    vehicleId,
    notes,
    usedDate: new Date()
  });
  
  return this.save();
};

// Method to refund a credit
userPackageSchema.methods.refundCredit = function(serviceId) {
  const usageIndex = this.usageHistory.findIndex(
    usage => usage.serviceId.toString() === serviceId.toString()
  );
  
  if (usageIndex === -1) {
    throw new Error('Service not found in usage history');
  }
  
  this.usedCredits = Math.max(0, this.usedCredits - 1);
  this.usageHistory.splice(usageIndex, 1);
  
  return this.save();
};

// Static method to get user's active packages
userPackageSchema.statics.getUserActivePackages = function(userId) {
  return this.find({
    user: userId,
    isActive: true,
    remainingCredits: { $gt: 0 }
  }).populate('package');
};

const UserPackage = mongoose.model('UserPackage', userPackageSchema);

export default UserPackage;