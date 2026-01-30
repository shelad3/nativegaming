import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// Config & Security
import { validateEnvironment, getEnvironmentSummary } from './config/validateEnv';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { pesapalService } from './services/pesapal';

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
import paymentRoutes from './routes/payments';
import postRoutes from './routes/posts';
import socialRoutes from './routes/social';
import streamRoutes from './routes/streams';
import activitiesRoutes from './routes/activities';
import matchRoutes from './routes/matches';

import { initializeSocket } from './socketHandler';
import './services/firebaseAdmin'; // Initialize Firebase Admin
import { Notification } from './models/Notification';
import Transaction from './models/Transaction';
import User from './models/User';

dotenv.config({ path: '.env.local' });
dotenv.config();

// Validate environment variables before starting
try {
    validateEnvironment();
    console.log('📊 Environment Configuration:');
    console.log(getEnvironmentSummary());
} catch (error: any) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Security Middleware - Apply helmet first
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS Configuration - Use environment variable for production
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000']
    : ['http://localhost:5173', 'http://localhost:3000'];

if (process.env.NODE_ENV === 'production') {
    console.log('🔒 Production CORS enabled for:', process.env.FRONTEND_URL || 'NONE (Check FRONTEND_URL)');
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Body parsing
app.use(express.json());

// Static File Serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/clips', express.static(path.join(__dirname, '../public/clips')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rate limiting for all API routes
app.use('/api/', apiLimiter);

// Database Connection - No fallback in production
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is required');
    process.exit(1);
}
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(() => console.log('✅ Connected to MongoDB at', MONGODB_URI.split('@').pop()))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('⚠️ Server will start but API endpoints requiring DB will fail until connection is established.');
    });

// Socket.IO Setup
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000', 'http://10.10.6.170:3000'],
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

// Initialize Pesapal IPN on startup
pesapalService.registerIPN()
    .then(() => console.log('✅ Pesapal IPN registered'))
    .catch(err => console.warn('⚠️  Pesapal IPN registration failed:', err.message));

// --- ROUTES ---
// Auth routes with stricter rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/leaderboard', async (req, res) => {
    try {
        const users = await User.find()
            .sort({ codeBits: -1, 'stats.xp': -1 })
            .limit(50);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Leaderboard sync failure' });
    }
});
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/clans', clanRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', themeRoutes);
app.use('/api/payments', paymentRoutes);

// DEPRECATED: Stripe webhook - Commented out during Pesapal migration
// Will be removed completely after full migration is verified
/*
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        console.error('[WEBHOOK] Missing signature or secret');
        return res.status(400).send('Webhook Error: Missing signature');
    }

    let event: any;

    try {
        // Stripe webhook verification would go here
        // event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
        console.error('[WEBHOOK] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Stripe checkout.session.completed handling
    // ... (keeping for reference during migration)

    res.json({ received: true });
});
*/

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));

    // Handle React routing, return all unknown requests to React app
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    // Basic Health Check for Development
    app.get('/', (req, res) => {
        res.send('NativeCodeX Coordinates Received. System Online (Dev Mode).');
    });
}

// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('System Malfunction');
});

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
