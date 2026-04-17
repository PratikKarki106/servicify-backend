import mongoose from 'mongoose';

const catalogSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  versionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Version',
    required: true
  },
  ccId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CC',
    required: true
  },
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
  imageUrl: {
    type: String,
    default: ''
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