import mongoose from "mongoose";

const RedemptionLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "LoyaltyOffer", required: true },
    orderId: { type: String, required: true, index: true },
    pointsUsed: { type: Number, required: true, min: 0 },
    discountApplied: { type: Number, required: true, min: 0 },
    redeemedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.model("RedemptionLog", RedemptionLogSchema);
