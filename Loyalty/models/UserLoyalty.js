import mongoose from "mongoose";

const UserLoyaltySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    pointsBalance: { type: Number, default: 0, min: 0 },
    lifetimePointsEarned: { type: Number, default: 0, min: 0 },
    lifetimePointsRedeemed: { type: Number, default: 0, min: 0 },
    lastActivityDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("UserLoyalty", UserLoyaltySchema);
