import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { protect } from '../middleware/authMiddleware';
import User from '../models/User';
import { checkAchievements } from '../services/gamificationService';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'standard_secret_fallback', {
        expiresIn: '30d',
    });
};

// Google OAuth Login
router.post('/google', async (req, res) => {
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: 'Token required' });

    try {
        let email, name, sub, picture;

        // Strategy 1: Try as Google ID Token (Standard or Firebase)
        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: [
                    process.env.GOOGLE_CLIENT_ID!,
                    process.env.VITE_FIREBASE_PROJECT_ID!,
                    process.env.FIREBASE_PROJECT_ID!
                ].filter(Boolean),
            });
            const payload = ticket.getPayload();
            if (payload) {
                email = payload.email;
                name = payload.name;
                sub = payload.sub;
                picture = payload.picture;
            }
        } catch (idTokenError: any) {
            console.warn(`[AUTH] ID Token verification failed: ${idTokenError.message}. checking access token method...`);
            // Strategy 2: Try as Access Token
            try {
                const userInfoResp = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                email = userInfoResp.data.email;
                name = userInfoResp.data.name;
                sub = userInfoResp.data.sub;
                picture = userInfoResp.data.picture;
            } catch (accessTokenError) {
                console.error('[AUTH] Token verification failed for both ID and Access Token methods.');
                return res.status(401).json({ error: 'Invalid Token' });
            }
        }

        if (!email) return res.status(400).json({ error: 'Email required from provider' });

        const normalizedEmail = email.toLowerCase();
        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            console.log(`[AUTH] Creating new node via Google: ${normalizedEmail}`);
            // Check if username available, else randomize
            const baseUsername = name ? name.split(' ')[0] : normalizedEmail.split('@')[0];
            const randomSuffix = Math.floor(Math.random() * 10000);

            user = new User({
                username: `${baseUsername}${randomSuffix}`,
                email: normalizedEmail,
                googleId: sub,
                avatar: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub}`,
                isEmailVerified: true,
                status: 'active',
                isAdmin: normalizedEmail === 'sheldonramu8@gmail.com'
            });

            await user.save();
            await checkAchievements(user._id.toString(), 'INITIAL', (req as any).io);
        } else {
            // Update existing user metadata if needed
            if (!user.googleId) {
                user.googleId = sub;
                await user.save();
            }
        }

        // Login check achievements
        await checkAchievements(user._id.toString(), 'LOGIN', (req as any).io);

        // Ban check
        if (user.status === 'banned' || user.isBanned) {
            return res.status(403).json({
                error: 'ACCESS_DENIED',
                message: `Your operator credentials have been revoked. Reason: ${user.banReason}`
            });
        }

        console.log(`[AUTH] Target Identity: ${user.email} | ID: ${user._id} | Onboarded: ${user.hasCompletedOnboarding}`);

        res.json({
            ...user.toObject(),
            token: generateToken(user._id.toString())
        });

    } catch (err) {
        console.error('[AUTH] Google verification failed:', err);
        res.status(401).json({ error: 'Token verification failed' });
    }
});

// --- ROUTES ---

// Get current user profile (session restoration)
router.get('/me', protect, async (req: any, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user.toObject());
    } catch (err) {
        res.status(500).json({ error: 'Session sync failure' });
    }
});

// Dev/Manual Login (Keep for compatibility/testing if needed, or deprecate)
router.post('/login', async (req, res) => {
    // Legacy support for manual testing
    const { email } = req.body;
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Endpoint disabled in production' });
    }

    // Simple dev login without password for testing purposes only
    const user = await User.findOne({ email });
    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id.toString())
        });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

export default router;
