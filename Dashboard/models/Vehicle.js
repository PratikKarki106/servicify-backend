import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: String,
    required: true,
    trim: true
  },
  plateNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  mileage: {
    type: Number,
    required: true,
    min: 0
  },
  lastService: {
    type: Date,
    default: Date.now
  },
  nextService: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 3 months from now
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;