import mongoose from "mongoose";

const CartItemSchema = new mongoose.Schema(
  {
    catalogItemId: { type: mongoose.Schema.Types.ObjectId, ref: "Catalog", required: true },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    itemSnapshot: {
      itemName: String,
      imageUrl: String,
      serviceCharge: Number,
      estimatedTime: Number,
    },
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    items: { type: [CartItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Cart", CartSchema);
