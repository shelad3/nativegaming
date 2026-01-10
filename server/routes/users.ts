import express from 'express';
import User from '../models/User';
import { Notification } from '../models/Notification';
import { protect, adminOnly } from '../middleware/authMiddleware';
import Media from '../models/Media';
import Post from '../models/Post';
import Achievement from '../models/Achievement';

const router = express.Router();

// Search Users
router.get('/', async (req, res) => {
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

// Get Live Users
router.get('/live', async (req, res) => {
    try {
        const users = await User.find({ isLive: true }).limit(10);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

// Get Single User
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

// Get User's Media (Clips/VODs)
router.get('/:id/media', async (req, res) => {
    try {
        const media = await Media.find({ userId: req.params.id }).sort({ createdAt: -1 });
        res.json(media);
    } catch (err) {
        res.status(500).json({ error: 'Media fetch failure' });
    }
});

// Get User's Posts
router.get('/:id/posts', async (req, res) => {
    try {
        const posts = await Post.find({ authorId: req.params.id }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Posts fetch failure' });
    }
});

// Get User's Achievements
router.get('/:id/achievements', async (req, res) => {
    try {
        const achievements = await Achievement.find({ userId: req.params.id }).sort({ createdAt: -1 });
        res.json(achievements);
    } catch (err) {
        res.status(500).json({ error: 'Achievements fetch failure' });
    }
});

// Follow User
router.post('/follow', protect, async (req: any, res) => {
    const { targetUserId } = req.body;
    const currentUserId = req.user._id;
    try {
        const user = await User.findById(currentUserId);
        const target = await User.findById(targetUserId);

        if (!user || !target) return res.status(404).json({ error: 'Entity not found' });

        const isFollowing = user.following.includes(targetUserId);

        if (isFollowing) {
            user.following = user.following.filter(id => id !== targetUserId);
            target.followers = target.followers.filter(id => id !== currentUserId);
        } else {
            user.following.push(targetUserId);
            target.followers.push(currentUserId);
        }

        await user.save();
        await target.save();

        if (!isFollowing) {
            const notification = await Notification.create({
                userId: targetUserId,
                type: 'FOLLOW',
                fromUser: user.username,
                content: `${user.username} has established a link with your node.`
            });

            if ((req as any).io) {
                (req as any).io.to(`user_${targetUserId}`).emit('new_notification', notification);
            }
        }

        res.json({ user, target });
    } catch (err) {
        res.status(500).json({ error: 'Social operation failure' });
    }
});

// Update User
router.patch('/:id', protect, async (req: any, res) => {
    // Users can only update their own profile unless admin
    if (req.params.id !== req.user._id.toString() && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Update failure' });
    }
});

// Delete User (Admin or Self)
router.delete('/:id', protect, async (req: any, res) => {
    if (req.params.id !== req.user._id.toString() && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Node purged' });
    } catch (err) {
        res.status(500).json({ error: 'Purge failure' });
    }
});

// Audit User (Admin Only)
router.post('/:id/audit', protect, adminOnly, async (req, res) => {
    const { entry } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.audit_logs.unshift(entry);
        await user.save();
        res.json(user.audit_logs);
    } catch (err) {
        res.status(500).json({ error: 'Audit failure' });
    }
});

export default router;
