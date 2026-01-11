import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 1
  },
  serviceCount: {
    type: Number,
    required: true,
    min: 1
  },
  purchaseDeadline: {
    type: Date,
    required: true
  },
  description: String,
  benefits: [String],
  serviceType: {
    type: String,
    default: 'general'
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

const Package = mongoose.model('Package', packageSchema);
export default Package;