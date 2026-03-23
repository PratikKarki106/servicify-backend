import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    // Who made the payment
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // What type of payment
    paymentType: {
        type: String,
        enum: ['appointment', 'package'],
        required: true
    },

    // For appointment payments (stores the numeric appointmentId)
    appointmentId: {
        type: Number,  // Changed from ObjectId to Number to match Appointment model
        ref: 'Appointment'
    },
    // Also store the MongoDB _id for reference if needed
    appointmentDbId: {
        type: mongoose.Schema.Types.ObjectId
    },

    // For package payments
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package'
    },
    packagePurchaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PackagePurchase'
    },

    // Khalti specific fields
    khaltiPidx: {
        type: String,
        unique: true,
        sparse: true  // Allows null values but ensures uniqueness if provided
    },
    khaltiTransactionId: String,
    purchaseOrderId: {
        type: String,
        required: true,
        unique: true
    },

    // Amount (store in rupees for your records)
    amount: {
        type: Number,
        required: true
    },
    amountInPaisa: {
        type: Number,
        required: true
    },

    // Status tracking
    paymentStatus: {
        type: String,
        enum: ['initiated', 'completed', 'failed', 'refunded'],
        default: 'initiated'
    },
    khaltiStatus: String,  // Raw status from Khalti

    // Timestamps
    initiatedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,

    // Callback data
    callbackData: mongoose.Schema.Types.Mixed,  // Store raw callback for debugging

}, {
    timestamps: true  // Adds createdAt and updatedAt automatically
});

// Index for faster queries
paymentSchema.index({ userId: 1, paymentStatus: 1 });
paymentSchema.index({ khaltiPidx: 1 });
paymentSchema.index({ purchaseOrderId: 1 });
paymentSchema.index({ appointmentId: 1 });  // Index for appointment lookups

export default mongoose.model('Payment', paymentSchema);