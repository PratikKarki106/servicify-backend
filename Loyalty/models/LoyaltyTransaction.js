import mongoose from "mongoose";

const LoyaltyTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["earn", "redeem", "expire", "adjust", "reverse"],
      required: true,
    },
    amount: { type: Number, required: true }, // positive for earn, negative for redeem/expire
    referenceId: { type: String, default: null }, // order_id / payment_id / manual reference
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("LoyaltyTransaction", LoyaltyTransactionSchema);
