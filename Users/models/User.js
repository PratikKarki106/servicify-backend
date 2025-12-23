import mongoose from "mongoose";

// Counter schema
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model("Counter", CounterSchema);

const UserSchema = new mongoose.Schema(
  {
    userId: { type: Number, unique: true }, // Auto-increment field
    googleId: { type: String, unique: true, sparse: true },
    name: String,
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    password: { type: String }
  },
  { timestamps: true }
);

// Pre-save hook for userId auto-increment
UserSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.userId = counter.seq;
  }

  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

export default mongoose.model("User", UserSchema);