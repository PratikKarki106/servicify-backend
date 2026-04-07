import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  actualPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountedPrice: {
    type: Number,
    required: true,
    min: 1
  },
  purchaseDeadline: {
    type: Date,
    required: true
  },
  features: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.length <= 5;
      },
      message: 'Features cannot exceed 5 items'
    }
  },
  serviceType: {
    type: String,
    default: 'general'
  },
  credits: {
    type: Number,
    required: true,
    min: 0
  },
  validityDays: {
    type: Number,
    default: 365
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalPurchases: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual to check if package is expired
packageSchema.virtual('isExpired').get(function() {
  return new Date(this.purchaseDeadline) < new Date();
});

// Virtual to check if package is available
packageSchema.virtual('isAvailable').get(function() {
  return this.isActive && !this.isExpired;
});

const Package = mongoose.model('Package', packageSchema);
export default Package;