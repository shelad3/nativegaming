import express from 'express';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Media from '../models/Media';
import User from '../models/User';
import { Notification } from '../models/Notification';
import { extractClip } from '../ffmpegUtils';
import { logActivity } from '../services/gamificationService';

const router = express.Router();

// GET /api/media/trending - Get trending media
router.get('/trending', async (req, res) => {
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

// POST /api/media/clips - Create clip
router.post('/clips', async (req, res) => {
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

// POST /api/media - Create general media
router.post('/', async (req, res) => {
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

// POST /api/media/:id/interact - Interact with media (Like/Gift)
router.post('/:id/interact', async (req, res) => {
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

export default router;
