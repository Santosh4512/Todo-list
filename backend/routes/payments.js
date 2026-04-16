const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const createRazorpayInstance = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        throw new Error('Razorpay keys are not configured');
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

router.post('/create-order', authenticateToken, async (req, res) => {
    try {
        const razorpay = createRazorpayInstance();
        const orderOptions = {
            amount: 49900,
            currency: 'INR',
            receipt: `receipt_${req.user.id}_${Date.now()}`,
            payment_capture: 1,
        };

        const order = await razorpay.orders.create(orderOptions);
        res.json({ order, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error('Razorpay order creation failed:', error);
        res.status(500).json({ error: error.message || 'Failed to create payment order' });
    }
});

router.post('/verify-payment', authenticateToken, async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment verification data' });
        }

        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        db.run(
            'UPDATE users SET subscription_status = ?, subscription_reference = ? WHERE id = ?',
            ['active', razorpay_order_id, req.user.id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update subscription status' });
                }
                res.json({ message: 'Subscription activated', subscriptionStatus: 'active' });
            }
        );
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

module.exports = router;
