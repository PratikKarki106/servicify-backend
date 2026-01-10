import mongoose from 'mongoose';

const catalogSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  itemPrice: {
    type: Number,
    required: true,
    min: 0
  },
  serviceCharge: {
    type: Number,
    required: true,
    min: 0
  },
  estimatedTime: {
    type: Number, // in minutes
    required: true,
    min: 1
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0,
    default: function() {
      return this.itemPrice + this.serviceCharge;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps
catalogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Catalog', catalogSchema);