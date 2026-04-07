import mongoose from 'mongoose';

const emailVerificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    pin: {
        type: String,
        required: true
    },
    pinExpires: {
        type: Date,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 1800 // Expires after 30 minutes
    }
});

export default mongoose.model('EmailVerification', emailVerificationSchema);