import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true },// your custom auto-increment userId
    serviceType: {
      type: String,
      enum: ["servicing", "repair", "checkup", "wash"],
      required: true,
    },
    vehicleInfo: {
      model: { type: String, required: true },
      color: { type: String, required: true },
      numberPlate: { type: String, required: true },
      kilometerRun: { type: Number },
      notes: { type: String },
      imageUrl: { type: String }, 
    },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // e.g. "10:30 AM"
    pickupRequired: { type: Boolean, default: false },
    pickupAddress: { type: String },
    status: { type: String, enum: ["booked", "confirmed", "completed", "canceled"], default: "booked" },
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", AppointmentSchema);