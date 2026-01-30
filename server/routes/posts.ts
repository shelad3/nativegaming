import express from 'express';
import Post from '../models/Post';
import User from '../models/User';
import { Notification } from '../models/Notification';
import { protect, optionalAuth } from '../middleware/authMiddleware';
import { logActivity } from '../services/gamificationService';

import Comment from '../models/Comment';

const router = express.Router();

// GET /api/posts - Get global activity feed
router.get('/', optionalAuth, async (req: any, res) => {
    const { limit = 20, skip = 0 } = req.query;
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip(Number(skip))
            .limit(Number(limit));

        // Filter Subscriber Only Content
        const filteredPosts = posts.filter(post => {
            if (!post.isSubscriberOnly) return true;
            // If subscriber only, check user
            if (!req.user) return false;
            // Admins see everything
            if (req.user.isAdmin) return true;

            // Assuming 'PREMIUM', 'ELITE', 'LEGEND' are subscriber tiers
            return ['PREMIUM', 'ELITE', 'LEGEND'].includes(req.user.tier);
        });

        res.json(filteredPosts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch global chronicle' });
    }
});

// POST /api/posts - Create new terminal transmission (Post)
router.post('/', protect, async (req: any, res) => {
    const { title, content, thumbnail, isSubscriberOnly } = req.body;
    try {
        const user = req.user;
        const post = await Post.create({
            title,
            content,
            thumbnail,
            isSubscriberOnly: !!isSubscriberOnly,
            authorId: user._id,
            authorName: user.username,
            authorAvatar: user.avatar,
            likes: [],
            views: 0,
            gifts: []
        });

        await logActivity(user._id, 'POST_CREATED', { targetId: post._id, targetName: title });

        res.status(201).json(post);
    } catch (err) {
        console.error('[POST] Creation error:', err);
        res.status(500).json({ error: 'Failed to establish node' });
    }
});

// POST /api/posts/:id/interact - Post interaction
router.post('/:id/interact', protect, async (req: any, res) => {
    const { action, giftType, amount } = req.body; // action: 'LIKE' | 'VIEW' | 'GIFT'
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Transmission not found' });

        if (action === 'LIKE') {
            const userId = req.user._id.toString();
            const hasLiked = post.likes.includes(userId);
            if (hasLiked) {
                post.likes = post.likes.filter(id => id !== userId);
            } else {
                post.likes.push(userId);
            }
        } else if (action === 'VIEW') {
            post.views += 1;
        } else if (action === 'GIFT' && amount) {
            const sender = req.user;
            if (sender.codeBits < amount) {
                return res.status(400).json({ error: 'Insufficient CodeBits' });
            }

            // Transfer CodeBits
            sender.codeBits -= amount;
            await sender.save();

            const author = await User.findById(post.authorId);
            if (author) {
                author.codeBits = (author.codeBits || 0) + amount;
                await author.save();

                await Notification.create({
                    userId: author._id,
                    type: 'GIFT',
                    content: `${sender.username} supported your transmission "${post.title}" with ${amount} CodeBits.`
                });
            }

            post.gifts.push({
                from: sender.username,
                type: giftType || 'SUPPORT',
                amount,
                timestamp: new Date()
            });
        }

        await post.save();
        res.json(post);
    } catch (err) {
        console.error('[POST] Interaction failure:', err);
        res.status(500).json({ error: 'Protocol error during interaction' });
    }
});

export default router;
