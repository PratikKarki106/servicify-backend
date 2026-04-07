import mongoose from "mongoose";

// Define vehicle info schema separately
const VehicleInfoSchema = new mongoose.Schema({
  name: { type: String },
  model: { type: String, required: true },
  color: { type: String, required: true },
  numberPlate: { type: String, required: true },
  kilometerRun: { type: Number },
  notes: { type: String },
  imageUrl: { type: String },
});

// Define bill item schema
const BillItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  itemPrice: { type: Number, required: true },
  serviceCharge: { type: Number, default: 0 }
}, { _id: false });

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentId: {type: Number, required: true, unique: true },
    userId: { type: Number, required: true },// your custom auto-increment userId
    serviceType: {
      type: String,
      enum: ["servicing", "repair", "checkup", "wash"],
      required: true,
    },
    vehicleInfo: { type: VehicleInfoSchema, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    pickupRequired: { type: Boolean, default: false },
    pickupAddress: { type: String },
    status: { type: String, enum: ["booked", "confirmed", "in-progress", "payment", "completed", "cancelled"], default: "booked" },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
    email: { type: String },
    name: { type: String },
    contactNumber: { type: String },
    billItems: { type: [BillItemSchema], default: [] },
  },
  {
    timestamps: true,
    minimize: false  // This ensures that empty objects and undefined fields are not removed
  }
);

export default mongoose.model("Appointment", AppointmentSchema);