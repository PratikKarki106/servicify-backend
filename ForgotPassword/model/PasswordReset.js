import mongoose from 'mongoose';

const passswordResetSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    pin:{
        type: String,
        required: true
    },
    pinExpires: {
        type: Date,
        required: true
    },
    resetToken: String,
    tokenExpires: Date,
    attempts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 1800
    }
});

export default mongoose.model('PasswordReset', passswordResetSchema);