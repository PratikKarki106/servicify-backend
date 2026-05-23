import mongoose from "mongoose";

const LoyaltyOfferSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    pointsRequired: { type: Number, required: true, min: 0 },
    valueInRupees: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    conditionsJson: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("LoyaltyOffer", LoyaltyOfferSchema);
