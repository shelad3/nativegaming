import express from 'express';
import Theme from '../models/Theme';
import User from '../models/User';
import SubscriptionTier from '../models/SubscriptionTier';
import { logActivity } from '../services/gamificationService';

const router = express.Router();

// Get available themes
router.get('/store/themes', async (req, res) => {
    try {
        const themes = await Theme.find();
        res.json(themes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch themes' });
    }
});

// Purchase theme
router.post('/store/purchase-theme', async (req, res) => {
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

// Apply theme
router.post('/user/apply-theme', async (req, res) => {
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

// Get subscription tiers
router.get('/subscriptions/tiers', async (req, res) => {
    try {
        const tiers = await SubscriptionTier.find({ isPublic: true }).sort({ tierLevel: 1 });
        res.json(tiers);
    } catch (err) {
        res.status(500).json({ error: 'Tier synchronization failure' });
    }
});

export default router;
