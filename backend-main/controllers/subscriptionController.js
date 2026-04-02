// controllers/subscriptionController.js
const crypto       = require('crypto');
const Razorpay     = require('razorpay');
const User         = require('../models/User');
const Subscription = require('../models/Subscription');

// Initialise Razorpay — keys come from .env
const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const PLAN_AMOUNTS = { free: 0, pro: 49900, enterprise: 149900 }; // paise

// ─── POST /api/subscriptions/subscribe ────────────────────────────────────────
// Creates a Razorpay order and returns order details to frontend
const subscribe = async (req, res) => {
    try {
        const { plan } = req.body;

        if (!['pro', 'enterprise'].includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
        }

        const amount = PLAN_AMOUNTS[plan];

        const order = await razorpay.orders.create({
            amount,
            currency: 'INR',
            receipt:  `rcpt_${Date.now()}`,
            notes:    { userId: String(req.user._id), plan }
        });

        // Save a pending subscription record
        await Subscription.create({
            user:            req.user._id,
            plan,
            status:          'created',
            razorpayOrderId: order.id,
            amountPaise:     amount,
            currentPeriodStart: new Date()
        });

        res.json({
            success: true,
            order: {
                id:       order.id,
                amount:   order.amount,
                currency: order.currency
            },
            // Send key to frontend so it can open the Razorpay popup
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Subscribe error:', err);
        res.status(500).json({ success: false, message: 'Could not initiate payment.' });
    }
};

// ─── POST /api/subscriptions/verify ───────────────────────────────────────────
// Verifies the Razorpay payment signature and activates the plan
const verify = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
            return res.status(400).json({ success: false, message: 'Missing payment fields.' });
        }

        // HMAC-SHA256 signature check
        const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expected  = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expected !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }

        // Activate plan on User
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);

        await User.findByIdAndUpdate(req.user._id, {
            plan,
            planExpiresAt:   expiry,
            aiMessagesUsed:  0,
            aiMessagesResetAt: new Date()
        });

        // Update subscription record
        await Subscription.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id },
            {
                status:           'active',
                razorpayPaymentId: razorpay_payment_id,
                currentPeriodEnd:  expiry
            }
        );

        res.json({ success: true, message: `${plan} plan activated!`, plan, expiresAt: expiry });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ success: false, message: 'Verification error.' });
    }
};

// ─── POST /api/subscriptions/webhook ──────────────────────────────────────────
// Razorpay webhook — handles renewals, failures, cancellations
// Must be registered in Razorpay dashboard pointing to this endpoint
const webhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const body      = JSON.stringify(req.body);
        const expected  = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

        if (expected !== signature) {
            return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
        }

        const { event, payload } = req.body;
        const payment = payload?.payment?.entity;

        if (event === 'payment.captured' && payment) {
            const userId = payment.notes?.userId;
            const plan   = payment.notes?.plan;

            if (userId && plan) {
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + 1);

                await User.findByIdAndUpdate(userId, {
                    plan,
                    planExpiresAt: expiry,
                    aiMessagesUsed: 0,
                    aiMessagesResetAt: new Date()
                });

                // Log event on subscription record
                await Subscription.findOneAndUpdate(
                    { razorpayOrderId: payment.order_id },
                    {
                        status: 'active',
                        razorpayPaymentId: payment.id,
                        currentPeriodEnd: expiry,
                        $push: { events: { $each: [{ event, payload: payment }], $slice: -10 } }
                    }
                );
            }
        }

        if (event === 'subscription.halted' || event === 'subscription.cancelled') {
            const sub    = payload?.subscription?.entity;
            const userId = sub?.notes?.userId;

            if (userId) {
                await User.findByIdAndUpdate(userId, { plan: 'free', planExpiresAt: null });
                await Subscription.findOneAndUpdate(
                    { razorpaySubscriptionId: sub.id },
                    {
                        status: event === 'subscription.halted' ? 'halted' : 'cancelled',
                        $push: { events: { $each: [{ event, payload: sub }], $slice: -10 } }
                    }
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).json({ success: false });
    }
};

// ─── GET /api/subscriptions/status ────────────────────────────────────────────
// Returns current plan info for the logged-in user
const status = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('plan planExpiresAt aiMessagesUsed aiMessagesResetAt');
        const { PLAN_LIMITS } = require('../middleware/planGuard');
        const limits = PLAN_LIMITS[user.plan || 'free'];

        res.json({
            success: true,
            plan:           user.plan || 'free',
            planExpiresAt:  user.planExpiresAt,
            aiMessages: {
                used:    user.aiMessagesUsed || 0,
                limit:   limits.aiMessages,
                resetAt: user.aiMessagesResetAt
            },
            limits: {
                projects:   limits.projects === Infinity ? null : limits.projects,
                exports:    limits.exports,
                multiFloor: limits.multiFloor,
                viz3d:      limits.viz3d
            }
        });
    } catch (err) {
        console.error('Status error:', err);
        res.status(500).json({ success: false, message: 'Could not fetch plan status.' });
    }
};

module.exports = { subscribe, verify, webhook, status };