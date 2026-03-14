import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },   // userId (number as string) or 'admin'
    senderRole: { type: String, enum: ["user", "admin"], required: true },
    receiverId: { type: String, required: true }, // 'admin' or userId
    receiverRole: { type: String, enum: ["user", "admin"], required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

export default mongoose.model("Message", MessageSchema);
