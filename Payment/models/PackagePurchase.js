// servicify-backend/Payment/models/PackagePurchase.js

import mongoose from 'mongoose';

const packagePurchaseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
        required: true
    },
    packageName: {
        type: String,
        required: true
    },

    // Credits tracking
    totalCredits: {
        type: Number,
        required: true
    },
    usedCredits: {
        type: Number,
        default: 0
    },
    remainingCredits: {
        type: Number,
        required: true
    },

    // Payment details
    amount: {
        type: Number,
        required: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },

    // Validity
    expiryDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },

    purchasedAt: {
        type: Date,
        default: Date.now
    }
});

// Method to check if package is valid
packagePurchaseSchema.methods.isValid = function() {
    return this.isActive &&
           this.expiryDate > new Date() &&
           this.remainingCredits > 0;
};

// Method to use a credit
packagePurchaseSchema.methods.useCredit = function() {
    if (!this.isValid()) {
        throw new Error('Package is not valid');
    }
    this.usedCredits += 1;
    this.remainingCredits -= 1;
    return this.save();
};

export default mongoose.model('PackagePurchase', packagePurchaseSchema);