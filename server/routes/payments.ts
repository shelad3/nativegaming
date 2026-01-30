/**
 * Payment Routes - Pesapal Integration
 * 
 * Handles CodeBits purchases through Pesapal payment gateway
 */

import { Router } from 'express';
import { pesapalService } from '../services/pesapal';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { Notification } from '../models/Notification';
import { protect } from '../middleware/authMiddleware';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

// CodeBits packages configuration
const PACKAGES = {
    starter: {
        codeBits: 500,
        price: 499, // $4.99 in cents
        currency: 'USD',
        description: 'Starter Pack - 500 CodeBits'
    },
    popular: {
        codeBits: 1200,
        price: 999, // $9.99 in cents
        currency: 'USD',
        description: 'Popular Pack - 1200 CodeBits (20% Bonus)'
    },
    elite: {
        codeBits: 5000,
        price: 3999, // $39.99 in cents
        currency: 'USD',
        description: 'Elite Pack - 5000 CodeBits (25% Bonus)'
    }
};

/**
 * POST /api/payments/create-checkout
 * Create a Pesapal checkout session
 */
router.post('/create-checkout', paymentLimiter, async (req, res) => {
    try {
        const { userId, packageId } = req.body;

        if (!userId || !packageId) {
            return res.status(400).json({ error: 'Missing userId or packageId' });
        }

        const pkg = PACKAGES[packageId as keyof typeof PACKAGES];
        if (!pkg) {
            return res.status(400).json({ error: 'Invalid package ID' });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create pending transaction record
        const transaction = await Transaction.create({
            userId,
            amount: pkg.price,
            currency: pkg.currency,
            codeBitsAwarded: pkg.codeBits,
            packageId,
            status: 'pending',
            paymentProvider: 'pesapal',
            createdAt: new Date()
        });

        // Create Pesapal payment request
        const paymentResponse = await pesapalService.createPaymentRequest({
            userId,
            amount: pkg.price,
            currency: pkg.currency,
            description: pkg.description,
            email: user.email,
            phoneNumber: user.phoneNumber,
            firstName: user.username,
            lastName: user.username
        });

        // Update transaction with Pesapal tracking ID
        transaction.pesapalOrderTrackingId = paymentResponse.orderTrackingId;
        transaction.pesapalTransactionId = paymentResponse.transactionId;
        await transaction.save();

        console.log(`[PAYMENT] Checkout created for user ${userId}, package: ${packageId}`);

        res.json({
            url: paymentResponse.paymentUrl,
            transactionId: transaction._id,
            orderTrackingId: paymentResponse.orderTrackingId
        });
    } catch (error: any) {
        console.error('[PAYMENT] Checkout creation failed:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

/**
 * POST /api/payments/ipn
 * Pesapal IPN (Instant Payment Notification) webhook
 */
router.post('/ipn', async (req, res) => {
    try {
        const notification = req.body;

        console.log('[IPN] Received notification:', notification);

        // Process the IPN notification
        const status = await pesapalService.handleIPNNotification(notification);

        // Pesapal V3 notification fields: OrderTrackingId, MerchantReference
        const trackingId = notification.OrderTrackingId || notification.pesapal_transaction_tracking_id;

        if (status.isCompleted) {
            // Find the transaction by Pesapal tracking ID
            const transaction = await Transaction.findOne({
                pesapalOrderTrackingId: trackingId
            });

            if (!transaction) {
                console.error('[IPN] Transaction not found');
                return res.status(404).json({ error: 'Transaction not found' });
            }

            // Check if already processed
            if (transaction.status === 'completed') {
                console.log('[IPN] Transaction already processed');
                return res.json({ received: true, message: 'Already processed' });
            }

            // Update user's CodeBits
            const user = await User.findById(transaction.userId);
            if (user) {
                user.codeBits = (user.codeBits || 0) + transaction.codeBitsAwarded;
                await user.save();

                // Update transaction status
                transaction.status = 'completed';
                transaction.completedAt = new Date();
                await transaction.save();

                // Create notification
                const notif = await Notification.create({
                    userId: user._id,
                    type: 'SYSTEM',
                    content: `Payment successful! ${transaction.codeBitsAwarded} CodeBits have been added to your account.`
                });

                // Emit socket event if io is available
                const io = (req as any).io;
                if (io) {
                    io.to(`user_${user._id}`).emit('new_notification', notif);
                    io.to(`user_${user._id}`).emit('codebits_updated', { codeBits: user.codeBits });
                }

                console.log(`[IPN] Payment processed successfully for user ${user._id}`);
            }
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('[IPN] Processing error:', error);
        res.status(500).json({ error: 'IPN processing failed' });
    }
});

/**
 * GET /api/payments/ipn
 * Handle GET IPN notifications (if configured)
 */
router.get('/ipn', async (req, res) => {
    try {
        const notification = req.query;

        console.log('[IPN-GET] Received notification:', notification);

        // Convert to expected format
        const formattedNotification = {
            pesapal_merchant_reference: notification.pesapal_merchant_reference as string,
            pesapal_transaction_tracking_id: notification.OrderTrackingId as string,
            pesapal_notification_type: notification.pesapal_notification_type as string
        };

        // Process the notification
        await pesapalService.handleIPNNotification(formattedNotification);

        res.send('IPN_RECEIVED');
    } catch (error: any) {
        console.error('[IPN-GET] Processing error:', error);
        res.status(500).send('IPN_PROCESSING_FAILED');
    }
});

/**
 * GET /api/payments/verify/:orderTrackingId
 * Manually verify a payment status
 */
router.get('/verify/:orderTrackingId', protect, async (req, res) => {
    try {
        const { orderTrackingId } = req.params;

        const status = await pesapalService.verifyTransaction(orderTrackingId);

        res.json(status);
    } catch (error: any) {
        console.error('[PAYMENT] Verification failed:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

/**
 * GET /api/payments/history
 * Get user's payment history
 */
router.get('/history', protect, async (req, res) => {
    try {
        const userId = (req as any).userId;

        const transactions = await Transaction.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(transactions);
    } catch (error: any) {
        console.error('[PAYMENT] Failed to get history:', error);
        res.status(500).json({ error: 'Failed to get payment history' });
    }
});

export default router;
