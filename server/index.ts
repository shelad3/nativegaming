import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import marketplaceRoutes from './routes/marketplace';
import tournamentRoutes from './routes/tournaments';
import mediaRoutes from './routes/media';
import messageRoutes from './routes/messages';
import clanRoutes from './routes/clans';
import forumRoutes from './routes/forums';
import adminRoutes from './routes/admin';
import themeRoutes from './routes/themes';

import { initializeSocket } from './socketHandler';
import { Notification } from './models/Notification';
import Transaction from './models/Transaction';
import User from './models/User';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true })); // Updated to allow both dev ports
app.use(express.json());

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nativecodex';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO Setup
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST']
    }
});

// Attach IO to request for controllers
app.use((req, res, next) => {
    (req as any).io = io;
    next();
});

// Initialize Socket Handler
initializeSocket(io);

// Stripe Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-12-15.clover' as any }); // Updated API version

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/clans', clanRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', themeRoutes); // Themes/Subscriptions route root varies, checked files to match

// Webhook for Stripe (Needs raw body, so handled before JSON parser if possible, but here separate route specific middleware)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        console.error('[WEBHOOK] Missing signature or secret');
        return res.status(400).send('Webhook Error: Missing signature');
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
        console.error('[WEBHOOK] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        try {
            const existingTransaction = await Transaction.findOne({
                stripeSessionId: session.id,
                status: 'completed'
            });

            if (existingTransaction) {
                return res.json({ received: true });
            }

            const { userId, codeBitsAwarded } = session.metadata as any;
            const user = await User.findById(userId);
            if (user) {
                user.codeBits = (user.codeBits || 0) + parseInt(codeBitsAwarded);
                await user.save();

                await Transaction.findOneAndUpdate(
                    { stripeSessionId: session.id },
                    { status: 'completed', stripePaymentIntentId: session.payment_intent as string }
                );

                const notification = await Notification.create({
                    userId,
                    type: 'SYSTEM',
                    content: `Payment successful! ${codeBitsAwarded} CodeBits have been added to your account.`
                });

                io.to(`user_${userId}`).emit('new_notification', notification);
            }
        } catch (err) {
            console.error('[WEBHOOK] Processing error:', err);
            return res.status(500).json({ error: 'Webhook processing failed' });
        }
    }

    res.json({ received: true });
});

// Basic Health Check
app.get('/', (req, res) => {
    res.send('NativeCodeX Coordinates Received. System Online.');
});

// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('System Malfunction');
});

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
