import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true },
    name: String,
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['user', 'admin' ], default: 'user' },
    password: { type: String }, 
  },
  { timestamps: true }
);

// Pre-save hook to convert email to lowercase
UserSchema.pre("save", function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

export default mongoose.model("User", UserSchema);
