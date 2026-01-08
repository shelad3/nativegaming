import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import { checkAchievements } from '../services/gamificationService';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'default_secret_dev_only', {
        expiresIn: '30d',
    });
};

// Google OAuth Login
router.post('/google', async (req, res) => {
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: 'Token required' });

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload) return res.status(400).json({ error: 'Invalid token payload' });

        const { email, name, sub, picture } = payload;

        if (!email) return res.status(400).json({ error: 'Email required from provider' });

        let user = await User.findOne({ email });

        if (!user) {
            console.log(`[AUTH] Creating new node via Google: ${email}`);
            // Check if username available, else randomize
            const baseUsername = name?.split(' ')[0] || email.split('@')[0];
            const randomSuffix = Math.floor(Math.random() * 10000);

            user = new User({
                username: `${baseUsername}${randomSuffix}`,
                email,
                googleId: sub,
                avatar: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub}`,
                isEmailVerified: true,
                status: 'active',
                isAdmin: email === 'sheldonramu8@gmail.com'
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

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
            token: generateToken(user._id.toString())
        });

    } catch (err) {
        console.error('[AUTH] Google verification failed:', err);
        res.status(401).json({ error: 'Token verification failed' });
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
