const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    plan: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        required: true
    },
    status: {
        type: String,
        enum: ['created', 'active', 'halted', 'cancelled', 'expired'],
        default: 'created'
    },

    // Razorpay identifiers
    razorpayOrderId:        { type: String },
    razorpayPaymentId:      { type: String },
    razorpaySubscriptionId: { type: String },

    // Billing
    amountPaise:   { type: Number },   // amount in paise (₹499 = 49900)
    currency:      { type: String, default: 'INR' },

    // Period
    currentPeriodStart: { type: Date },
    currentPeriodEnd:   { type: Date },

    // Webhook event log (last 10 events for debugging)
    events: [{
        event:     String,
        payload:   mongoose.Schema.Types.Mixed,
        receivedAt: { type: Date, default: Date.now }
    }]

}, { timestamps: true });

// Helper: given a plan key return monthly amount in paise
subscriptionSchema.statics.planAmount = function(plan) {
    const amounts = { free: 0, pro: 49900, enterprise: 149900 };
    return amounts[plan] ?? 0;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);