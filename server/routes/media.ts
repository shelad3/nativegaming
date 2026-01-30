import express from 'express';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Media from '../models/Media';
import User from '../models/User';
import { Notification } from '../models/Notification';
import { extractClip } from '../ffmpegUtils';
import { logActivity } from '../services/gamificationService';

import multer from 'multer';
import { generateThumbnail } from '../ffmpegUtils';

const router = express.Router();

// Configure Multer for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.resolve('./public/uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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

// POST /api/media/clips - Create clip (REAL UPLOAD)
router.post('/clips', upload.single('file'), async (req, res) => {
    const { userId, title, game } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    try {
        console.log(`[CLIP] Processing real extraction for user ${userId}...`);

        const clipId = new mongoose.Types.ObjectId();
        const videoFilename = req.file.filename;
        const thumbnailFilename = `${clipId}.jpg`;

        const videoPath = req.file.path;
        const thumbnailPath = path.join(path.resolve('./public/uploads'), thumbnailFilename);

        // Generate dynamic thumbnail from the uploaded video
        await generateThumbnail(videoPath, thumbnailPath);

        const videoUrl = `/uploads/${videoFilename}`;
        const thumbnailUrl = `/uploads/${thumbnailFilename}`;

        const media = await Media.create({
            _id: clipId,
            userId,
            type: 'CLIP',
            title: title || 'Tactical Highlight',
            url: videoUrl,
            thumbnail: thumbnailUrl,
            game: game || 'General',
            stats: { views: 0, likes: [], gifts: 0 }
        });

        await logActivity(userId, 'MEDIA_CREATED', { targetId: media._id, targetName: title, type: 'CLIP' });

        res.status(201).json(media);
    } catch (err: any) {
        console.error('[CLIP] Processing failure:', err);
        res.status(500).json({ error: 'Failed to process clip: ' + err.message });
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
