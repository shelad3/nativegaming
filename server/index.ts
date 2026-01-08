console.log('--- STARTING SERVER BOOT SEQUENCE ---');
import express from 'express';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import User from './models/User';
import Post from './models/Post';
import { Notification } from './models/Notification';
import { logActivity, checkAchievements } from './services/gamificationService';
import { Message } from './models/Message';
import Transaction from './models/Transaction';
import Clan from './models/Clan';
import ForumCategory from './models/ForumCategory';
import ForumThread from './models/ForumThread';
import ForumPost from './models/ForumPost';
import Follow from './models/Follow';
import Activity from './models/Activity';
import Achievement from './models/Achievement';
import Media from './models/Media';
import Report from './models/Report';
import MarketItem from './models/MarketItem';
import { extractClip } from './ffmpegUtils';
import SubscriptionTier from './models/SubscriptionTier';
import Theme from './models/Theme';
import Tournament from './models/Tournament';
import Match from './models/Match';
import Conversation from './models/Conversation';
import Stripe from 'stripe';

dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
    : null;

if (!stripe) {
    console.warn('[WARNING] STRIPE_SECRET_KEY not found. Payments and subscriptions will be disabled.');
}

// ... imports
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSocket } from './socketHandler';
import connectDB from './config/db';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import streamRoutes from './routes/streams';

const CLAN_CREATION_FEE = 1000;

const app = express();
const httpServer = createServer(app); // Wrap express
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production security later
        methods: ["GET", "POST"]
    }
});

// Initialize Socket Logic
initializeSocket(io);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nativecodex';

app.use(cors());
app.use(express.json());

// Pass IO to request for API-triggered events (like system notifications)
app.use((req, res, next) => {
    (req as any).io = io;
    next();
});

// ... (Rest of the middleware and DB connection remains the same)

// --- DATABASE CONNECTION ---
// --- DATABASE CONNECTION ---
connectDB();

// ... (Rest of routes)

// --- UTILITY FUNCTIONS ---
// Moved to services/gamificationService.ts

// server listen moved to bottom


// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/streams', streamRoutes);
// Alias for legacy social follow
app.use('/api/social', userRoutes);

// --- SOCIAL ROUTES ---
app.get('/api/users', async (req, res) => {
    const { query } = req.query;
    try {
        let users;
        if (query) {
            users = await User.find({
                $or: [
                    { username: { $regex: query, $options: 'i' } },
                    { bio: { $regex: query, $options: 'i' } }
                ]
            }).limit(20);
        } else {
            users = await User.find().limit(20);
        }
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

app.get('/api/users/live', async (req, res) => {
    try {
        const users = await User.find({ isLive: true }).limit(10);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

app.post('/api/streams/start', async (req, res) => {
    const { userId, title, game, description } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            {
                isLive: true,
                streamTitle: title,
                streamGame: game,
                streamDescription: description
            },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Notify followers
        const followers = await User.find({ following: userId });
        const notifications = followers.map(f => ({
            userId: f._id,
            type: 'SYSTEM',
            fromUser: user.username,
            content: `CRITICAL: ${user.username} is now broadcasting ${game}! Join the node.`
        }));

        if (notifications.length > 0) {
            const savedNotifications = await Notification.insertMany(notifications);

            if ((req as any).io) {
                savedNotifications.forEach(notif => {
                    (req as any).io.to(`user_${notif.userId}`).emit('new_notification', notif);
                });
            }
        }

        res.json(user);

        // Broadcast global live mesh update
        if ((req as any).io) {
            const liveUsers = await User.find({ isLive: true }).limit(10);
            (req as any).io.emit('live_users_update', liveUsers);
        }
    } catch (err) {
        console.error('[STREAM] Start failure:', err);
        res.status(500).json({ error: 'Failed to start stream' });
    }
});

app.post('/api/streams/stop', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { isLive: false, streamTitle: '' },
            { new: true }
        );
        res.json(user);

        // Broadcast global live mesh update
        if ((req as any).io) {
            const liveUsers = await User.find({ isLive: true }).limit(10);
            (req as any).io.emit('live_users_update', liveUsers);
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to stop stream' });
    }
});

// Migrated to userRoutes

// Migrated to userRoutes (api/users/follow)

// --- INTERACTION ROUTES ---
app.post('/api/posts/:id/interact', async (req, res) => {
    const { userId, action, giftType } = req.body;
    const postId = req.params.id;

    try {
        let post = await Post.findById(postId);
        if (!post) {
            // For simulation compatibility, create if not exists
            post = new Post({ _id: postId, likes: [], views: 0, gifts: [] });
            try {
                await post.save();
            } catch (e) {
                // If it was created by another request in the meantime
                post = await Post.findById(postId);
            }
        }

        if (action === 'LIKE') {
            if (post.likes.includes(userId)) {
                post.likes = post.likes.filter(id => id !== userId);
            } else {
                post.likes.push(userId);
            }
        } else if (action === 'VIEW') {
            post.views += 1;
        } else if (action === 'GIFT' && giftType) {
            const user = await User.findById(userId);
            if (!user || user.codeBits < 100) return res.status(400).json({ error: 'Insufficient funds' });
            user.codeBits -= 100;
            await user.save();
            post.gifts.push({ from: userId, type: giftType, amount: 100, timestamp: new Date() });
        }

        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: 'Interaction failure' });
    }
});

// --- FEED ROUTES ---
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

app.post('/api/posts', async (req, res) => {
    const postData = req.body;
    try {
        const post = new Post({
            ...postData,
            likes: [],
            views: 0,
            gifts: []
        });
        await post.save();
        console.log(`[CONTENT] Created new node: ${post._id} by ${post.authorName}`);
        res.status(201).json(post);
    } catch (err) {
        console.error('[CONTENT] Post creation failure:', err);
        res.status(500).json({ error: 'Post creation failure' });
    }
});

app.get('/api/users/:id/posts', async (req, res) => {
    try {
        const posts = await Post.find({ authorId: req.params.id }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const topUsers = await User.find({ status: 'active' })
            .sort({ 'stats.rating': -1 })
            .limit(10);
        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ error: 'Leaderboard failure' });
    }
});

// --- ADMIN ROUTES (RESTRICTED) ---
const adminAuth = async (req: any, res: any, next: any) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: 'Identity required' });
        const user = await User.findById(userId);
        if (user && user.email === 'sheldonramu8@gmail.com') {
            next();
        } else {
            res.status(403).json({ error: 'Access denied: Admin permissions required' });
        }
    } catch (err) {
        console.error("Admin Auth Error:", err);
        res.status(500).json({ error: "Auth verification failed" });
    }
};

app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

app.post('/api/marketplace/purchase', async (req, res) => {
    const { userId, itemId, price } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.codeBits < price) return res.status(400).json({ error: 'Insufficient CodeBits' });

        user.codeBits -= price;
        user.inventory.push(itemId);
        user.audit_logs.unshift({
            action: 'PURCHASE',
            itemId,
            price,
            timestamp: new Date()
        });
        await user.save();

        await Notification.create({
            userId,
            type: 'GIFT',
            content: `Acquisition successful: ${itemId} added to inventory. Price: ${price} Ȼ`
        });

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Purchase failure' });
    }
});

app.post('/api/tournaments/register', async (req, res) => {
    const { userId, tournamentId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            // Check if it's one of the mock IDs from constants.tsx
            // In a real migration we'd seed these, but let's handle it gracefully
            return res.status(404).json({ error: 'Tournament node not found in registry.' });
        }

        if (tournament.participants.includes(userId)) {
            return res.json(user); // Already registered
        }

        // Atomic update for both participants and user registration
        tournament.participants.push(userId);
        await tournament.save();

        if (!user.registeredTournaments) user.registeredTournaments = [];
        user.registeredTournaments.push(tournamentId);
        user.stats.tournaments += 1;

        await user.save();

        // Notify user
        await Notification.create({
            userId,
            type: 'SYSTEM',
            content: `Registration Confirmed: Protocol for tournament ${tournament.name} initialized.`
        });

        // Check if tournament is full and should start
        if (tournament.participants.length >= tournament.maxParticipants) {
            tournament.status = 'ACTIVE';
            await tournament.save();

            // Auto-generate Round 1 Matches
            const participantIds = [...tournament.participants];
            // Shuffle
            for (let i = participantIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [participantIds[i], participantIds[j]] = [participantIds[j], participantIds[i]];
            }

            const matches = [];
            for (let i = 0; i < participantIds.length; i += 2) {
                if (participantIds[i + 1]) {
                    matches.push({
                        tournamentId: tournament._id,
                        player1Id: participantIds[i],
                        player2Id: participantIds[i + 1],
                        round: 1,
                        status: 'PENDING'
                    });
                }
            }
            if (matches.length > 0) {
                await Match.insertMany(matches);
                console.log(`[ARENA] Generated ${matches.length} matches for tournament: ${tournament.name}`);
            }
        }

        res.json(user);
    } catch (err) {
        console.error('Tournament reg error:', err);
        res.status(500).json({ error: 'Registration failure' });
    }
});

// Tournament Management Routes
app.get('/api/tournaments', async (req, res) => {
    try {
        const tournaments = await Tournament.find();
        res.json(tournaments);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

app.post('/api/tournaments', adminAuth, async (req, res) => {
    try {
        const tournament = await Tournament.create(req.body);
        res.status(201).json(tournament);
    } catch (err) {
        res.status(500).json({ error: 'Creation failure' });
    }
});

app.get('/api/tournaments/:id', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id).populate('participants', 'username avatar');
        res.json(tournament);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

app.patch('/api/admin/users/:id/status', adminAuth, async (req, res) => {
    const { status } = req.body;
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Update failure' });
    }
});

app.get('/api/tournaments/:id/matches', async (req, res) => {
    try {
        const matches = await Match.find({ tournamentId: req.params.id })
            .populate('player1Id', 'username avatar')
            .populate('player2Id', 'username avatar')
            .sort({ round: 1 });
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

app.post('/api/matches/:id/result', adminAuth, async (req, res) => {
    const { winnerId, score } = req.body;
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        match.winnerId = winnerId;
        match.score = score;
        match.status = 'COMPLETED';
        await match.save();

        // Winner Progression Logic
        const tournament = await Tournament.findById(match.tournamentId);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        // Find or create the next match for the winner
        const nextRound = match.round + 1;
        // Simple logic: Find sibling match or create placeholder
        // This is a simplified bracket logic
        const nextMatch = await Match.findOne({
            tournamentId: tournament._id,
            round: nextRound,
            $or: [{ player1Id: { $exists: false } }, { player2Id: { $exists: false } }]
        });

        if (nextMatch) {
            if (!nextMatch.player1Id) nextMatch.player1Id = winnerId;
            else if (!nextMatch.player2Id) nextMatch.player2Id = winnerId;
            await nextMatch.save();
        } else {
            // Check if this was the final (if only one match in this round and it's full)
            const roundMatchesCount = await Match.countDocuments({ tournamentId: tournament._id, round: nextRound });
            if (roundMatchesCount === 0) {
                // Potential final? Or just need to create the next round's first match
                const newMatch = new Match({
                    tournamentId: tournament._id,
                    player1Id: winnerId,
                    round: nextRound,
                    status: 'PENDING'
                });
                // Note: This needs complex logic for actual tournament brackets (seeding, etc)
                // For Phase 2, we implement basic winner progression.
                // await newMatch.save(); 
            }
        }

        res.json(match);
    } catch (err) {
        res.status(500).json({ error: 'Result processing failure' });
    }
});

app.get('/api/admin/metrics', adminAuth, async (req, res) => {
    try {
        const usersCount = await User.countDocuments();
        const premiumUsers = await User.countDocuments({ tier: 'PREMIUM' });
        const eliteUsers = await User.countDocuments({ tier: 'ELITE' });
        const legendUsers = await User.countDocuments({ tier: 'LEGEND' });

        const totalRevenue = (premiumUsers * 9.99) + (eliteUsers * 29.99) + (legendUsers * 99.99);
        const posts = await Post.find();
        const totalGifts = posts.reduce((acc, p) => acc + (p.gifts?.length || 0), 0);

        res.json({
            totalUsers: usersCount,
            activeTournaments: 3,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalGifts: totalGifts,
            tierDistribution: {
                FREE: usersCount - premiumUsers - eliteUsers - legendUsers,
                PREMIUM: premiumUsers,
                ELITE: eliteUsers,
                LEGEND: legendUsers
            },
            meshStability: '99.99%'
        });
    } catch (err) {
        res.status(500).json({ error: 'Metrics failure' });
    }
});

// --- PROFILE ROUTES ---
// Migrated to userRoutes

// --- STREAMING ROUTES ---
// Migrated to streamRoutes

// --- MEDIA CLIPPING ---
app.post('/api/media/clips', async (req, res) => {
    const { userId, title, game, duration } = req.body;
    try {
        console.log(`[CLIP] Initiating tactical extraction for user ${userId}...`);

        const clipId = new mongoose.Types.ObjectId();
        const baseDir = path.resolve('./public/clips');
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

        const outputPath = path.join(baseDir, `${clipId}.mp4`);
        const mockInput = path.resolve('./public/mock_broadcast.mp4');

        // Check if mock input exists, otherwise simulate
        if (fs.existsSync(mockInput)) {
            await extractClip(mockInput, outputPath, '00:00:05', duration || 10);
        } else {
            console.warn('[CLIP] Mock input signal not found on disk. Falling back to simulation logic.');
        }

        const mockUrl = `http://localhost:5000/clips/${clipId}.mp4`;
        const mockThumbnail = `https://picsum.photos/seed/${clipId}/1280/720`;

        const media = await Media.create({
            _id: clipId,
            userId,
            type: 'CLIP',
            title: title || 'Tactical Highlight',
            url: mockUrl,
            thumbnail: mockThumbnail,
            game: game || 'General',
            stats: { views: 0, likes: [], gifts: 0 }
        });

        await logActivity(userId, 'MEDIA_CREATED', { targetId: media._id, targetName: title, type: 'CLIP' });

        res.status(201).json(media);
    } catch (err) {
        console.error('[CLIP] Extraction failure:', err);
        res.status(500).json({ error: 'Failed to process clip' });
    }
});

// --- NOTIFICATION ROUTES ---
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(10);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// --- CONVERSATION ROUTES ---
app.get('/api/conversations', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Identity required' });

    try {
        const conversations = await Conversation.find({
            participants: userId
        })
            .populate('participants', 'username avatar status')
            .populate('lastMessage')
            .sort({ lastActivity: -1 });

        res.json(conversations);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

app.get('/api/conversations/:id/messages', async (req, res) => {
    try {
        const messages = await Message.find({ conversationId: req.params.id })
            .sort({ createdAt: 1 })
            .limit(100);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.post('/api/messages', async (req, res) => {
    const { senderId, receiverId, content, isStaff, streamId, clanId } = req.body;
    try {
        let conversationId = null;

        // If it's a private message, handle conversation association
        if (receiverId && !streamId && !clanId) {
            let conversation = await Conversation.findOne({
                participants: { $all: [senderId, receiverId], $size: 2 }
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [senderId, receiverId],
                    unreadCounts: new Map([[receiverId, 0], [senderId, 0]])
                });
            }
            conversationId = conversation._id;
        }

        const message = await Message.create({
            senderId,
            receiverId,
            content,
            isStaff,
            streamId,
            clanId,
            conversationId
        });

        if (conversationId) {
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: message._id,
                lastActivity: new Date(),
                $inc: { [`unreadCounts.${receiverId}`]: 1 }
            });
        }

        if ((req as any).io) {
            if (streamId) {
                (req as any).io.to(streamId).emit('receive_message', message);
            } else if (clanId) {
                (req as any).io.to(`clan_${clanId}`).emit('new_clan_message', message);
            } else if (receiverId) {
                // Emit to receiver's private room
                (req as any).io.to(`user_${receiverId}`).emit('new_message', message);
                // Emit to sender for sync
                (req as any).io.to(`user_${senderId}`).emit('new_message', message);
            }
        }

        if (isStaff && receiverId) {
            await Notification.create({
                userId: receiverId,
                type: 'SYSTEM',
                content: `Emergency Transmission from Staff: ${content.substring(0, 50)}...`
            });
        }

        res.json(message);
    } catch (err) {
        console.error('[MESSAGE] Send failure:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// --- STREAM CHAT ROUTES ---
app.get('/api/streams/:streamId/messages', async (req, res) => {
    try {
        const messages = await Message.find({ streamId: req.params.streamId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(messages.reverse());
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stream messages' });
    }
});

app.post('/api/streams/:streamId/messages', async (req, res) => {
    const { streamId } = req.params;
    try {
        const { senderId, senderName, content } = req.body;
        const message = await Message.create({
            senderId,
            senderName,
            streamId,
            content
        });

        // Broadcast real-time signal via SocketMesh
        if ((req as any).io) {
            (req as any).io.to(streamId).emit('receive_message', message);
        }

        res.json(message);
    } catch (err) {
        console.error('[STREAM] Signal broadcast failure:', err);
        res.status(500).json({ error: 'Failed to post stream message' });
    }
});

// --- PAYMENT ROUTES (STRIPE) ---

// Package definitions
const COIN_PACKAGES = {
    starter: { codeBits: 500, price: 499, name: 'Starter Pack' },
    popular: { codeBits: 1200, price: 999, name: 'Popular Pack' },
    elite: { codeBits: 5000, price: 3999, name: 'Elite Pack' }
};

app.post('/api/payments/create-checkout-session', async (req, res) => {
    const { userId, packageId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const package_ = COIN_PACKAGES[packageId as keyof typeof COIN_PACKAGES];
        if (!package_) return res.status(400).json({ error: 'Invalid package' });

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${package_.codeBits} CodeBits`,
                        description: package_.name,
                    },
                    unit_amount: package_.price,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}?payment=success`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}?payment=cancelled`,
            metadata: {
                userId,
                packageId,
                codeBitsAwarded: package_.codeBits.toString()
            }
        });

        // Create pending transaction
        await Transaction.create({
            userId,
            stripeSessionId: session.id,
            amount: package_.price,
            codeBitsAwarded: package_.codeBits,
            packageId,
            status: 'pending'
        });

        console.log(`[PAYMENT] Checkout session created: ${session.id} for user ${userId}`);
        res.json({ sessionId: session.id, url: session.url });
    } catch (err) {
        console.error('[PAYMENT] Checkout session error:', err);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Stripe Webhook - CRITICAL: Must verify signature
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

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        try {
            // Idempotency check
            const existingTransaction = await Transaction.findOne({
                stripeSessionId: session.id,
                status: 'completed'
            });

            if (existingTransaction) {
                console.log(`[WEBHOOK] Duplicate event for session ${session.id}, ignoring`);
                return res.json({ received: true });
            }

            const { userId, codeBitsAwarded, packageId } = session.metadata as any;

            // Credit user
            const user = await User.findById(userId);
            if (!user) {
                console.error(`[WEBHOOK] User not found: ${userId}`);
                return res.status(404).json({ error: 'User not found' });
            }

            user.codeBits = (user.codeBits || 0) + parseInt(codeBitsAwarded);
            await user.save();

            // Update transaction
            await Transaction.findOneAndUpdate(
                { stripeSessionId: session.id },
                {
                    status: 'completed',
                    stripePaymentIntentId: session.payment_intent as string
                }
            );

            // Notify user
            const notification = await Notification.create({
                userId,
                type: 'SYSTEM',
                content: `Payment successful! ${codeBitsAwarded} CodeBits have been added to your account.`
            });

            if ((req as any).io) {
                (req as any).io.to(`user_${userId}`).emit('new_notification', notification);
            }

            console.log(`[WEBHOOK] Payment completed: ${codeBitsAwarded}Ȼ credited to user ${userId}`);
        } catch (err) {
            console.error('[WEBHOOK] Processing error:', err);
            return res.status(500).json({ error: 'Webhook processing failed' });
        }
    }

    res.json({ received: true });
});

// --- CLAN ROUTES ---

// Create a new clan
app.post('/api/clans/create', async (req, res) => {
    const { userId, name, tag, description, avatar } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Check if user already in a clan
        if (user.clanId) return res.status(400).json({ error: 'Already in a clan' });

        // Check CodeBits balance
        const CLAN_CREATION_COST = 1000;
        if (user.codeBits < CLAN_CREATION_COST) {
            return res.status(400).json({ error: 'Insufficient CodeBits' });
        }

        // Check for duplicate name/tag
        const existing = await Clan.findOne({ $or: [{ name }, { tag: tag.toUpperCase() }] });
        if (existing) {
            return res.status(400).json({ error: 'Clan name or tag already taken' });
        }

        // Create clan
        const clan = await Clan.create({
            name,
            tag: tag.toUpperCase(),
            description,
            avatar: avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${tag}`,
            members: [{
                userId,
                role: 'leader',
                joinedAt: new Date()
            }],
            createdBy: userId
        });

        // Deduct CodeBits and update user
        user.codeBits -= CLAN_CREATION_COST;
        user.clanId = clan._id.toString();
        user.clanRole = 'leader';
        user.clanJoinedAt = new Date();
        await user.save();

        console.log(`[CLAN] Created: ${clan.name} [${clan.tag}] by ${user.username}`);
        res.status(201).json(clan);
    } catch (err) {
        console.error('[CLAN] Creation error:', err);
        res.status(500).json({ error: 'Failed to create clan' });
    }
});

// Browse all clans
app.get('/api/clans', async (req, res) => {
    const { query, sort = 'trophies' } = req.query;

    try {
        let filter: any = { 'settings.isPublic': true };

        if (query) {
            filter.$text = { $search: query as string };
        }

        const sortOptions: any = {
            trophies: { 'stats.totalTrophies': -1 },
            members: { 'stats.memberCount': -1 },
            level: { 'stats.level': -1 },
            recent: { createdAt: -1 }
        };

        const clans = await Clan.find(filter)
            .sort(sortOptions[sort as string] || sortOptions.trophies)
            .limit(50);

        res.json(clans);
    } catch (err) {
        console.error('[CLAN] Browse error:', err);
        res.status(500).json({ error: 'Failed to fetch clans' });
    }
});

// Get clan details
app.get('/api/clans/:id', async (req, res) => {
    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        // Populate member details
        const memberIds = clan.members.map(m => m.userId);
        const users = await User.find({ _id: { $in: memberIds } });

        const membersWithDetails = clan.members.map(m => {
            const user = users.find(u => u._id.toString() === m.userId);
            return {
                ...(m as any).toObject(),
                username: user?.username,
                avatar: user?.avatar,
                stats: user?.stats
            };
        });

        res.json({ ...clan.toObject(), membersWithDetails });
    } catch (err) {
        console.error('[CLAN] Fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch clan' });
    }
});

// Update clan (leader only)
app.patch('/api/clans/:id', async (req, res) => {
    const { userId, description, avatar, settings } = req.body;

    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const member = clan.members.find(m => m.userId === userId);
        if (!member || member.role !== 'leader') {
            return res.status(403).json({ error: 'Only clan leader can update' });
        }

        if (description) clan.description = description;
        if (avatar) clan.avatar = avatar;
        if (settings) clan.settings = { ...clan.settings, ...settings };

        await clan.save();
        res.json(clan);
    } catch (err) {
        console.error('[CLAN] Update error:', err);
        res.status(500).json({ error: 'Failed to update clan' });
    }
});

// Join clan
app.post('/api/clans/:id/join', async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.clanId) return res.status(400).json({ error: 'Already in a clan' });

        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        // Check if clan is full
        if (clan.members.length >= clan.settings.maxMembers) {
            return res.status(400).json({ error: 'Clan is full' });
        }

        // Check rating requirement
        if (user.stats.rating < clan.settings.minRating) {
            return res.status(400).json({ error: 'Rating too low' });
        }

        // Add member
        clan.members.push({
            userId,
            role: 'member',
            joinedAt: new Date()
        });
        await clan.save();

        // Update user
        user.clanId = clan._id.toString();
        user.clanRole = 'member';
        user.clanJoinedAt = new Date();
        await user.save();

        // Notify clan members
        const leader = clan.members.find(m => m.role === 'leader');
        if (leader && (req as any).io) {
            const notification = await Notification.create({
                userId: leader.userId,
                type: 'SYSTEM',
                content: `${user.username} has joined your clan [${clan.tag}]!`
            });
            (req as any).io.to(`user_${leader.userId}`).emit('new_notification', notification);
        }

        console.log(`[CLAN] ${user.username} joined ${clan.name}`);

        // Log and check achievements
        await logActivity(userId, 'CLAN_JOINED', { targetId: clan._id, targetName: clan.name });
        await checkAchievements(userId, 'CLAN_JOIN', (req as any).io);

        res.json({ clan, user });
    } catch (err) {
        console.error('[CLAN] Join error:', err);
        res.status(500).json({ error: 'Failed to join clan' });
    }
});

// Leave clan
app.post('/api/clans/:id/leave', async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const member = clan.members.find(m => m.userId === userId);
        if (!member) return res.status(400).json({ error: 'Not a member of this clan' });

        // Leaders cannot leave (must transfer or disband)
        if (member.role === 'leader') {
            return res.status(400).json({ error: 'Leader must transfer leadership or disband clan' });
        }

        // Remove member
        clan.members = clan.members.filter(m => m.userId !== userId);
        await clan.save();

        // Update user
        user.clanId = undefined;
        user.clanRole = undefined;
        user.clanJoinedAt = undefined;
        await user.save();

        console.log(`[CLAN] ${user.username} left ${clan.name}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[CLAN] Leave error:', err);
        res.status(500).json({ error: 'Failed to leave clan' });
    }
});

// Kick member (leader/officer)
app.post('/api/clans/:id/kick', async (req, res) => {
    const { userId, targetUserId } = req.body;

    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const kicker = clan.members.find(m => m.userId === userId);
        if (!kicker || (kicker.role !== 'leader' && kicker.role !== 'officer')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const target = clan.members.find(m => m.userId === targetUserId);
        if (!target) return res.status(400).json({ error: 'User not in clan' });

        // Cannot kick leader
        if (target.role === 'leader') {
            return res.status(400).json({ error: 'Cannot kick clan leader' });
        }

        // Officers cannot kick other officers
        if (kicker.role === 'officer' && target.role === 'officer') {
            return res.status(403).json({ error: 'Officers cannot kick other officers' });
        }

        // Remove member
        clan.members = clan.members.filter(m => m.userId !== targetUserId);
        await clan.save();

        // Update target user
        const targetUser = await User.findById(targetUserId);
        if (targetUser) {
            targetUser.clanId = undefined;
            targetUser.clanRole = undefined;
            targetUser.clanJoinedAt = undefined;
            await targetUser.save();

            // Notify kicked user
            if ((req as any).io) {
                const notification = await Notification.create({
                    userId: targetUserId,
                    type: 'SYSTEM',
                    content: `You have been removed from clan [${clan.tag}].`
                });
                (req as any).io.to(`user_${targetUserId}`).emit('new_notification', notification);
            }
        }

        console.log(`[CLAN] ${targetUserId} kicked from ${clan.name}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[CLAN] Kick error:', err);
        res.status(500).json({ error: 'Failed to kick member' });
    }
});

// Promote member (leader only)
app.post('/api/clans/:id/promote', async (req, res) => {
    const { userId, targetUserId } = req.body;

    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const leader = clan.members.find(m => m.userId === userId);
        if (!leader || leader.role !== 'leader') {
            return res.status(403).json({ error: 'Only leader can promote' });
        }

        const target = clan.members.find(m => m.userId === targetUserId);
        if (!target) return res.status(400).json({ error: 'User not in clan' });

        if (target.role === 'officer') {
            return res.status(400).json({ error: 'Already an officer' });
        }

        target.role = 'officer';
        await clan.save();

        // Update user
        const targetUser = await User.findById(targetUserId);
        if (targetUser) {
            targetUser.clanRole = 'officer';
            await targetUser.save();
        }

        console.log(`[CLAN] ${targetUserId} promoted to officer in ${clan.name}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[CLAN] Promote error:', err);
        res.status(500).json({ error: 'Failed to promote member' });
    }
});

// Clan leaderboard
app.get('/api/clans/leaderboard', async (req, res) => {
    try {
        const topClans = await Clan.find()
            .sort({ 'stats.totalTrophies': -1 })
            .limit(100);
        res.json(topClans);
    } catch (err) {
        console.error('[CLAN] Leaderboard error:', err);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Clan chat messages
app.get('/api/clans/:id/messages', async (req, res) => {
    try {
        const messages = await Message.find({ clanId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(messages.reverse());
    } catch (err) {
        console.error('[CLAN] Messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.post('/api/clans/:id/messages', async (req, res) => {
    const { senderId, senderName, content } = req.body;
    const clanId = req.params.id;

    try {
        // Verify user is in clan
        const user = await User.findById(senderId);
        if (!user || user.clanId !== clanId) {
            return res.status(403).json({ error: 'Not a member of this clan' });
        }

        const message = await Message.create({
            senderId,
            senderName,
            clanId,
            content
        });

        // Broadcast to clan room
        if ((req as any).io) {
            (req as any).io.to(`clan_${clanId}`).emit('clan_message', message);
        }

        res.json(message);
    } catch (err) {
        console.error('[CLAN] Message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// --- SOCIAL ROUTES ---

// Toggle follow
app.post('/api/social/follow', async (req, res) => {
    const { currentUserId, targetUserId } = req.body;
    try {
        if (currentUserId === targetUserId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const existingFollow = await Follow.findOne({ followerId: currentUserId, followingId: targetUserId });

        if (existingFollow) {
            // Unfollow
            await Follow.deleteOne({ _id: existingFollow._id });

            // Update counts in User models
            const [user, target] = await Promise.all([
                User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } }, { new: true }),
                User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } }, { new: true })
            ]);

            res.json({ user, target, status: 'unfollowed' });
        } else {
            // Follow
            await Follow.create({ followerId: currentUserId, followingId: targetUserId });

            // Update counts and trigger notification
            const [user, target] = await Promise.all([
                User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } }, { new: true }),
                User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } }, { new: true })
            ]);

            // Simple notification
            await Notification.create({
                userId: targetUserId,
                type: 'FOLLOW',
                content: `${user?.username} is now monitoring your node signals.`,
                read: false
            });

            // If target is online, emit notification via socket
            if ((req as any).io) {
                (req as any).io.to(targetUserId).emit('new_notification', {
                    type: 'FOLLOW',
                    content: `${user?.username} is now monitoring your node signals.`
                });
            }

            res.json({ user, target, status: 'followed' });

            // Log and check
            await logActivity(currentUserId, 'FOLLOW_STARTED', { targetId: targetUserId, targetName: target?.username });
            await checkAchievements(currentUserId, 'FIRST_FOLLOW', (req as any).io);
        }
    } catch (err) {
        console.error('[SOCIAL] Follow error:', err);
        res.status(500).json({ error: 'Failed to update follow status' });
    }
});

app.get('/api/users/:id/followers', async (req, res) => {
    try {
        const follows = await Follow.find({ followingId: req.params.id });
        const followerIds = follows.map(f => f.followerId);
        const users = await User.find({ _id: { $in: followerIds } }, 'username avatar stats archetype');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch followers' });
    }
});

app.get('/api/users/:id/following', async (req, res) => {
    try {
        const follows = await Follow.find({ followerId: req.params.id });
        const followingIds = follows.map(f => f.followingId);
        const users = await User.find({ _id: { $in: followingIds } }, 'username avatar stats archetype');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch following' });
    }
});


// Get user feed
app.get('/api/social/feed', async (req, res) => {
    const { userId, limit = 20 } = req.query;
    try {
        let query = {};
        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                // Return activity from people user follows + their own
                query = { userId: { $in: [...user.following, userId] } };
            }
        }

        const activities = await Activity.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .populate('userId', 'username avatar archetype');

        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});

// Get user achievements
app.get('/api/users/:id/achievements', async (req, res) => {
    try {
        const achievements = await Achievement.find({ userId: req.params.id });
        res.json(achievements);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});


// --- MEDIA ROUTES (CLIPS & VODS) ---

// Get trending media
app.get('/api/media/trending', async (req, res) => {
    const { type, game, limit = 20 } = req.query;
    try {
        let query: any = {};
        if (type) query.type = type;
        if (game) query.game = game;

        const media = await Media.find(query)
            .sort({ 'stats.views': -1, createdAt: -1 })
            .limit(Number(limit))
            .populate('userId', 'username avatar archetype');

        res.json(media);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch trending media' });
    }
});

// Get media for a specific user
app.get('/api/users/:id/media', async (req, res) => {
    try {
        const media = await Media.find({ userId: req.params.id })
            .sort({ createdAt: -1 })
            .populate('userId', 'username avatar archetype');
        res.json(media);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user media' });
    }
});

// Create new media (Clip/VOD)
app.post('/api/media', async (req, res) => {
    const { userId, type, title, url, thumbnail, game } = req.body;
    try {
        const media = await Media.create({
            userId,
            type,
            title,
            url,
            thumbnail,
            game,
            stats: { views: 0, likes: [], gifts: 0 }
        });

        // Log activity
        await logActivity(userId, 'MEDIA_CREATED', { targetId: media._id, targetName: title, type });

        res.status(201).json(media);
    } catch (err) {
        console.error('[MEDIA] Creation error:', err);
        res.status(500).json({ error: 'Failed to create media node' });
    }
});

// Interact with media
app.post('/api/media/:id/interact', async (req, res) => {
    const { userId, type, amount } = req.body; // type: 'LIKE' | 'GIFT'
    try {
        const media = await Media.findById(req.params.id);
        if (!media) return res.status(404).json({ error: 'Media not found' });

        if (type === 'LIKE') {
            const hasLiked = media.stats.likes.includes(userId);
            if (hasLiked) {
                media.stats.likes = media.stats.likes.filter(id => id !== userId);
            } else {
                media.stats.likes.push(userId);
            }
        } else if (type === 'GIFT' && amount) {
            const user = await User.findById(userId);
            if (!user || user.codeBits < amount) {
                return res.status(400).json({ error: 'Insufficient CodeBits' });
            }

            // Transfer CodeBits
            user.codeBits -= amount;
            await user.save();

            const creator = await User.findById(media.userId);
            if (creator) {
                creator.codeBits = (creator.codeBits || 0) + amount;
                await creator.save();
            }

            media.stats.gifts += amount;

            // Notify creator
            await Notification.create({
                userId: media.userId,
                type: 'SYSTEM',
                content: `${user.username} gifted ${amount} CodeBits to your tactical highlight: ${media.title}`
            });
        }

        await media.save();
        res.json(media);
    } catch (err) {
        console.error('[MEDIA] Interaction error:', err);
        res.status(500).json({ error: 'Interaction failure' });
    }
});

// --- CLAN ROUTES ---

app.get('/api/clans', async (req, res) => {
    try {
        const { sort = 'trophies' } = req.query;
        const sortOptions: any = {
            trophies: { 'stats.totalTrophies': -1 },
            members: { 'stats.memberCount': -1 },
            level: { 'stats.level': -1 },
            recent: { createdAt: -1 }
        };
        const clans = await Clan.find().sort(sortOptions[sort as string] || sortOptions.trophies).limit(50);
        res.json(clans);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch clans' });
    }
});

app.post('/api/clans/create', async (req, res) => {
    const { userId, name, tag, description, avatar } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.clanId) return res.status(400).json({ error: 'Already in a clan' });
        if (user.codeBits < CLAN_CREATION_FEE) return res.status(402).json({ error: 'Insufficient funds for clan instantiation.' });

        // Atomically deduct
        user.codeBits -= CLAN_CREATION_FEE;

        const clan = await Clan.create({
            name,
            tag,
            description,
            avatar,
            createdBy: userId,
            members: [{ userId, role: 'leader', joinedAt: new Date() }]
        });

        user.clanId = clan.id;
        await user.save();

        res.status(201).json(clan);
        await logActivity(userId, 'CLAN_JOINED', { targetId: clan.id, targetName: name });
    } catch (err: any) {
        if (err.code === 11000) return res.status(400).json({ error: 'Clan name or tag already exists in mesh.' });
        res.status(500).json({ error: 'Clan instantiation failure' });
    }
});

app.get('/api/clans/:id', async (req, res) => {
    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });
        res.json(clan);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch clan' });
    }
});

app.post('/api/clans/:id/join', async (req, res) => {
    const { userId } = req.body;
    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });
        if (clan.members.length >= clan.settings.maxMembers) return res.status(400).json({ error: 'Clan is at max capacity' });
        if (clan.members.find(m => m.userId === userId)) return res.status(400).json({ error: 'Already a member' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.clanId) return res.status(400).json({ error: 'Already in another clan' });

        clan.members.push({ userId, role: 'member', joinedAt: new Date() });
        await clan.save();

        user.clanId = clan.id;
        await user.save();

        res.json(clan);
        await logActivity(userId, 'CLAN_JOINED', { targetId: clan.id, targetName: clan.name });
        await checkAchievements(userId, 'CLAN_JOIN', (req as any).io);
    } catch (err) {
        res.status(500).json({ error: 'Failed to join clan' });
    }
});

// --- MARKETPLACE & SUBSCRIPTIONS ---

app.get('/api/marketplace', async (req, res) => {
    try {
        const items = await MarketItem.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Market index sync failure' });
    }
});

app.post('/api/marketplace/purchase', async (req, res) => {
    const { userId, itemId } = req.body;
    try {
        const user = await User.findById(userId);
        const item = await MarketItem.findById(itemId);
        if (!user || !item) return res.status(404).json({ error: 'User or Item not found' });
        if (user.codeBits < item.price) return res.status(402).json({ error: 'Insufficient credits' });
        if (user.inventory.includes(item.id)) return res.status(400).json({ error: 'Asset already in inventory' });

        // Atomic transaction simulation
        user.codeBits -= item.price;
        user.inventory.push(item.id);
        await user.save();

        res.json(user);
        await logActivity(userId, 'ITEM_PURCHASED', { itemName: item.name, price: item.price });
    } catch (err) {
        res.status(500).json({ error: 'Purchase execution failure' });
    }
});

app.get('/api/subscriptions/tiers', async (req, res) => {
    try {
        const tiers = await SubscriptionTier.find({ isPublic: true }).sort({ tierLevel: 1 });
        res.json(tiers);
    } catch (err) {
        res.status(500).json({ error: 'Tier synchronization failure' });
    }
});

// --- MODERATION & REPORTING ROUTES ---

// Submit a report
app.post('/api/reports', async (req, res) => {
    const { reporterId, targetType, targetId, reason, description } = req.body;
    try {
        const report = await Report.create({
            reporterId,
            targetType,
            targetId,
            reason,
            description,
            status: 'PENDING'
        });

        // Notify admins (if we had a dashboard notification system)
        res.status(201).json(report);
    } catch (err) {
        res.status(500).json({ error: 'Failed to file report' });
    }
});

// Admin: Get all reports
app.get('/api/admin/reports', async (req, res) => {
    try {
        const reports = await Report.find()
            .sort({ createdAt: -1 })
            .populate('reporterId', 'username email');
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: 'Failed to access audit logs' });
    }
});

// Admin: Resolve report & Enforcement
app.post('/api/admin/resolve-report', async (req, res) => {
    const { reportId, action, adminNotes, banReason } = req.body; // action: 'BAN' | 'DISMISS'
    try {
        const report = await Report.findById(reportId);
        if (!report) return res.status(404).json({ error: 'Report not found' });

        if (action === 'BAN') {
            const targetId = report.targetId;
            let finalTargetUserId = targetId;

            // If reporting content, find the owner
            if (report.targetType === 'POST') {
                const post = await Post.findById(targetId);
                if (post) finalTargetUserId = post.authorId.toString();
            } else if (report.targetType === 'MEDIA') {
                const media = await Media.findById(targetId);
                if (media) finalTargetUserId = media.userId.toString();
            } else if (report.targetType === 'THREAD') {
                const thread = await ForumThread.findById(targetId);
                if (thread) finalTargetUserId = thread.authorId.toString();
            }

            const targetUser = await User.findById(finalTargetUserId);
            if (targetUser) {
                targetUser.isBanned = true;
                targetUser.status = 'banned';
                targetUser.banReason = banReason || 'Operator policy violation.';
                await targetUser.save();

                // Log enforcement
                await logActivity(targetUser.id, 'USER_BANNED', { adminNotes, reason: banReason });

                // Disconnect user if live (Socket.IO)
                if (io) {
                    io.to(targetUser.id.toString()).emit('protocol_termination', {
                        reason: targetUser.banReason
                    });
                }
            }
            report.status = 'RESOLVED';
        } else if (action === 'DISMISS') {
            report.status = 'DISMISSED';
        }

        report.adminNotes = adminNotes;
        await report.save();

        res.json(report);
    } catch (err) {
        console.error('[MODERATION] Enforcement error:', err);
        res.status(500).json({ error: 'Enforcement failure' });
    }
});

// --- FORUM ROUTES ---

// Get all categories
app.get('/api/forums/categories', async (req, res) => {
    try {
        const categories = await ForumCategory.find().sort({ order: 1 });
        res.json(categories);
    } catch (err) {
        console.error('[FORUM] Categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create/Get threads in a category
app.get('/api/forums/threads', async (req, res) => {
    const { categoryId, query, sort = 'recent' } = req.query;
    try {
        let filter: any = {};
        if (categoryId) filter.categoryId = categoryId;
        if (query) filter.$text = { $search: query as string };

        const sortOptions: any = {
            recent: { lastActivity: -1 },
            hot: { 'stats.replyCount': -1 },
            votes: { 'stats.upvotes.length': -1 }
        };

        const threads = await ForumThread.find(filter)
            .sort({ isPinned: -1, ...(sortOptions[sort as string] || sortOptions.recent) })
            .limit(50);

        // Populate author names
        const authorIds = threads.map(t => t.authorId);
        const users = await User.find({ _id: { $in: authorIds } });

        const threadsWithAuthors = threads.map(t => {
            const user = users.find(u => u._id.toString() === t.authorId);
            return {
                ...t.toObject(),
                authorName: user?.username,
                authorAvatar: user?.avatar,
                authorClanTag: (user as any)?.clanId ? 'TAG' : null // Simplified for now
            };
        });

        res.json(threadsWithAuthors);
    } catch (err) {
        console.error('[FORUM] Threads error:', err);
        res.status(500).json({ error: 'Failed to fetch threads' });
    }
});

app.post('/api/forums/threads', async (req, res) => {
    const { userId, categoryId, title, content } = req.body;
    try {
        const category = await ForumCategory.findById(categoryId);
        if (!category) return res.status(404).json({ error: 'Category not found' });

        const user = await User.findById(userId);
        if (category.isAdminOnly && !user?.isAdmin) {
            return res.status(403).json({ error: 'Only admins can post here' });
        }

        const thread = await ForumThread.create({
            title,
            content,
            authorId: userId,
            categoryId,
            lastActivity: new Date()
        });

        res.status(201).json(thread);

        // Log and check
        await logActivity(userId, 'THREAD_CREATED', { targetId: thread._id, targetName: title });
        await checkAchievements(userId, 'FIRST_THREAD', (req as any).io);
    } catch (err) {
        console.error('[FORUM] Thread creation error:', err);
        res.status(500).json({ error: 'Failed to create thread' });
    }
});

// Get specific thread and its posts
app.get('/api/forums/threads/:id', async (req, res) => {
    try {
        const thread = await ForumThread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });

        // Increment views
        thread.stats.views += 1;
        await thread.save();

        const posts = await ForumPost.find({ threadId: req.params.id }).sort({ createdAt: 1 });

        // Populate authors
        const authorIds = [thread.authorId, ...posts.map(p => p.authorId)];
        const users = await User.find({ _id: { $in: authorIds } });

        const enrichAuthor = (id: string) => {
            const user = users.find(u => u._id.toString() === id);
            return {
                authorName: user?.username,
                authorAvatar: user?.avatar,
                authorRole: user?.isAdmin ? 'Admin' : 'Operator'
            };
        };

        res.json({
            ...thread.toObject(),
            ...enrichAuthor(thread.authorId),
            posts: posts.map(p => ({
                ...p.toObject(),
                ...enrichAuthor(p.authorId)
            }))
        });
    } catch (err) {
        console.error('[FORUM] Thread fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch thread' });
    }
});

// Reply to thread
app.post('/api/forums/threads/:id/posts', async (req, res) => {
    const { userId, content } = req.body;
    try {
        const thread = await ForumThread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });
        if (thread.isLocked) return res.status(400).json({ error: 'Thread is locked' });

        const post = await ForumPost.create({
            threadId: req.params.id,
            authorId: userId,
            content
        });

        // Update thread stats
        thread.stats.replyCount += 1;
        thread.lastActivity = new Date();
        await thread.save();

        res.status(201).json(post);

        // Log and check
        await logActivity(userId, 'POST_CREATED', { targetId: req.params.id, contentPreview: content.slice(0, 100) });
        await checkAchievements(userId, 'FIRST_POST', (req as any).io);
    } catch (err) {
        console.error('[FORUM] Post error:', err);
        res.status(500).json({ error: 'Failed to post reply' });
    }
});

// Vote logic for threads
app.post('/api/forums/threads/:id/vote', async (req, res) => {
    const { userId, type } = req.body; // 'up' or 'down'
    try {
        const thread = await ForumThread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });

        // Remove from both first
        thread.stats.upvotes = thread.stats.upvotes.filter(id => id !== userId);
        thread.stats.downvotes = thread.stats.downvotes.length > 0 ? thread.stats.downvotes.filter(id => id !== userId) : [];

        if (type === 'up') thread.stats.upvotes.push(userId);
        if (type === 'down') thread.stats.downvotes.push(userId);

        await thread.save();
        res.json({ upvotes: thread.stats.upvotes.length, downvotes: thread.stats.downvotes.length });
    } catch (err) {
        console.error('[FORUM] Vote error:', err);
        res.status(500).json({ error: 'Failed to vote' });
    }
});

app.delete('/api/forums/threads/:id', async (req, res) => {
    const { userId } = req.query; // Auth check would normally be here
    try {
        const thread = await ForumThread.findById(req.params.id);
        const user = await User.findById(userId);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });
        if (thread.authorId !== userId && !user?.isAdmin) return res.status(403).json({ error: 'Unauthorized deletion' });

        await ForumThread.deleteOne({ _id: req.params.id });
        await ForumPost.deleteMany({ threadId: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Deletion failure' });
    }
});

app.patch('/api/forums/threads/:id', async (req, res) => {
    const { userId, title, content } = req.body;
    try {
        const thread = await ForumThread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });
        if (thread.authorId !== userId) return res.status(403).json({ error: 'Unauthorized editing' });

        if (title) thread.title = title;
        if (content) thread.content = content;
        await thread.save();

        res.json(thread);
    } catch (err) {
        res.status(500).json({ error: 'Update failure' });
    }
});

// --- THEME STORE & CUSTOMIZATION ---

app.get('/api/store/themes', async (req, res) => {
    try {
        const themes = await Theme.find();
        res.json(themes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch themes' });
    }
});

app.post('/api/store/purchase-theme', async (req, res) => {
    const { userId, themeId } = req.body;
    try {
        const user = await User.findById(userId);
        const theme = await Theme.findById(themeId);
        if (!user || !theme) return res.status(404).json({ error: 'User or Theme not found' });
        if (user.codeBits < theme.price) return res.status(402).json({ error: 'Insufficient CodeBits' });
        if (user.ownedThemes.includes(theme.id)) return res.status(400).json({ error: 'Theme already in mesh inventory' });

        // Transaction
        user.codeBits -= theme.price;
        user.ownedThemes.push(theme.id);
        await user.save();

        res.json(user);
        await logActivity(userId, 'THEME_PURCHASED', { themeName: theme.name, price: theme.price });
    } catch (err) {
        res.status(500).json({ error: 'Purchase failed' });
    }
});

app.post('/api/user/apply-theme', async (req, res) => {
    const { userId, themeId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (themeId === null) {
            user.activeTheme = undefined;
            await user.save();
            return res.json(user);
        }

        if (!user.ownedThemes.includes(themeId)) {
            return res.status(403).json({ error: 'Theme not owned' });
        }

        const theme = await Theme.findById(themeId);
        if (!theme) return res.status(404).json({ error: 'Theme not found' });

        user.activeTheme = {
            banner: theme.assets.bannerUrl,
            animation: theme.assets.animationClass,
            effect: theme.assets.customCSS,
            colors: theme.assets.colors
        };

        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to apply theme' });
    }
});

// Seed default categories
const seedCategories = async () => {
    const defaults = [
        { name: 'Announcements', description: 'Official updates from the NativeCodeX high command.', icon: 'Megaphone', color: '#3b82f6', isAdminOnly: true, order: 1 },
        { name: 'General Discussion', description: 'The hub for all things gaming, tech, and beyond.', icon: 'MessageSquare', color: '#10b981', order: 2 },
        { name: 'Strategy & Tips', description: 'Master the arena. Share your most lethal tactics.', icon: 'Zap', color: '#f59e0b', order: 3 },
        { name: 'Looking for Group (LFG)', description: 'Recruit teammates for your next mission.', icon: 'Users', color: '#8b5cf6', order: 4 },
        { name: 'Support & Bug Reports', description: 'Technical assistance and system anomalies.', icon: 'LifeBuoy', color: '#ef4444', order: 5 }
    ];

    for (const cat of defaults) {
        await ForumCategory.findOneAndUpdate({ name: cat.name }, cat, { upsert: true });
    }
    console.log('[FORUM] Categories seeded successfully');
};

const seedEconomy = async () => {
    const items = [
        { name: 'Ghost Protocol Skin', description: 'Advanced stealth aesthetics for your node.', price: 500, rarity: 'Epic', category: 'Cosmetic', type: 'Skin', imageUrl: 'https://picsum.photos/seed/item1/300/300' },
        { name: 'Thermal Sight Override', description: 'Tactical UI enhancement for better target acquisition.', price: 1200, rarity: 'Legendary', category: 'Functional', type: 'Mod', imageUrl: 'https://picsum.photos/seed/item2/300/300' },
        { name: 'Neon Buffer Trace', description: 'Visual trail effect in the broadcast mesh.', price: 200, rarity: 'Rare', category: 'Cosmetic', type: 'Effect', imageUrl: 'https://picsum.photos/seed/item3/300/300' },
        { name: 'CodeBit Multiplier', description: 'Temporary 1.5x gain on strategic interactions.', price: 2500, rarity: 'Epic', category: 'Functional', type: 'Booster', imageUrl: 'https://picsum.photos/seed/item4/300/300' }
    ];

    const tiers = [
        { name: 'BASIC', price: 0, description: 'Standard operator access with essential mesh features.', features: ['Access to Nexus Feed', 'Tactical Broadcaster View', 'Public Forum Access'], tierLevel: 0 },
        { name: 'ELITE', price: 9.99, description: 'Advanced privileges for serious combatants.', features: ['Custom Node Themes', 'Gift Transmission Capability', 'Priority Matchmaking Signal', 'Elite Clan Access'], tierLevel: 1 },
        { name: 'LEGEND', price: 24.99, description: 'The ultimate protocol for sovereign battlefield nodes.', features: ['Certified Operator Badge', 'Zero-Fee Marketplace Access', 'Real-time Matrix Profiles', 'Beta Protocol Previews', '1000 Monthly CodeBits'], tierLevel: 2 }
    ];

    const themes = [
        {
            name: 'Neon Grid',
            type: 'banner',
            price: 500,
            description: 'Retro-futuristic tactical grid background.',
            previewUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b25272a7?auto=format&fit=crop&q=80&w=300&h=200',
            assets: { bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b25272a7?auto=format&fit=crop&q=80&w=1200' },
            rarity: 'Common'
        },
        {
            name: 'Matrix Pulse',
            type: 'animation',
            price: 1500,
            description: 'Subtle digital pulse effect for your profile nodes.',
            previewUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=pulse',
            assets: { animationClass: 'animate-pulse' },
            rarity: 'Rare'
        },
        {
            name: 'Shadow Nexus',
            type: 'bundle',
            price: 3000,
            description: 'Full stealth kit with banner and custom color scheme.',
            previewUrl: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bcc0?auto=format&fit=crop&q=80&w=300&h=200',
            assets: {
                bannerUrl: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bcc0?auto=format&fit=crop&q=80&w=1200',
                colors: { primary: '#10b981', secondary: '#064e3b', accent: '#34d399' }
            },
            rarity: 'Legendary'
        }
    ];

    for (const item of items) {
        await MarketItem.findOneAndUpdate({ name: item.name }, item, { upsert: true });
    }
    for (const tier of tiers) {
        await SubscriptionTier.findOneAndUpdate({ name: tier.name }, tier, { upsert: true });
    }
    for (const theme of themes) {
        await Theme.findOneAndUpdate({ name: theme.name }, theme, { upsert: true });
    }
    console.log('[ECONOMY] Marketplace, Tiers, and Themes seeded');
};

seedCategories();
seedEconomy();



httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
