import express from 'express';
import User from '../models/User';
import { Notification } from '../models/Notification';
import { protect, adminOnly } from '../middleware/authMiddleware';
import Media from '../models/Media';
import Post from '../models/Post';
import Achievement from '../models/Achievement';
import Conversation from '../models/Conversation';

const router = express.Router();

// Get Live Users
router.get('/live', async (req, res) => {
    try {
        const users = await User.find({ isLive: true }).limit(50);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch live nodes' });
    }
});

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

// Get Leaderboard (Top Combat/Wealth Nodes)
router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find()
            .sort({ codeBits: -1, 'stats.xp': -1 })
            .limit(50);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Leaderboard sync failure' });
    }
});

// Get Single User
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('registeredTournaments')
            .populate('ownedThemes');
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

// Get User's Notifications
router.get('/:id/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Notifications fetch failure' });
    }
});

// Mark Notification as Read
router.patch('/notifications/:id/read', protect, async (req: any, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );
        res.json(notification);
    } catch (err) {
        res.status(500).json({ error: 'Update failure' });
    }
});

// Purge All Notifications
router.delete('/notifications/purge', protect, async (req: any, res) => {
    try {
        await Notification.deleteMany({ userId: req.user._id });
        res.json({ success: true, message: 'Notification stack purged' });
    } catch (err) {
        res.status(500).json({ error: 'Purge operation failed' });
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

            // Auto-create conversation node logic
            try {
                const existingConv = await Conversation.findOne({
                    participants: { $all: [currentUserId, targetUserId], $size: 2 }
                });
                if (!existingConv) {
                    await Conversation.create({
                        participants: [currentUserId, targetUserId],
                        unreadCounts: new Map([[currentUserId.toString(), 0], [targetUserId.toString(), 0]])
                    });
                }
            } catch (convErr) {
                console.error('Failed to init conversation node:', convErr);
                // Non-blocking error
            }
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

// Delete User (Full System Purge)
router.delete('/:id', protect, async (req: any, res) => {
    if (req.params.id !== req.user._id.toString() && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    try {
        const userId = req.params.id;

        // 1. Perform deep social link cleanup
        // Remove this user from everyone else's followers/following lists
        await User.updateMany(
            { followers: userId },
            { $pull: { followers: userId } }
        );
        await User.updateMany(
            { following: userId },
            { $pull: { following: userId } }
        );

        // 2. Cascade delete content nodes
        await Post.deleteMany({ authorId: userId });
        await Media.deleteMany({ userId: userId });
        await Notification.deleteMany({ userId: userId });

        // 3. Final purge of the user node
        await User.findByIdAndDelete(userId);

        res.json({ success: true, message: 'Node and all associated data purged from Mesh.' });
    } catch (err) {
        res.status(500).json({ error: 'Purge failure' });
    }
});

// Social Mesh Sync (Counter-Discrepancy Resolution)
router.get('/:id/sync-social', protect, async (req: any, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Find all users who follow this user
        const actualFollowers = await User.find({ following: user._id }).select('_id');
        const actualFollowerIds = actualFollowers.map(f => f._id.toString());

        // Find all users this user follows
        const actualFollowing = await User.find({ followers: user._id }).select('_id');
        const actualFollowingIds = actualFollowing.map(f => f._id.toString());

        user.followers = actualFollowerIds;
        user.following = actualFollowingIds;
        await user.save();

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: 'Social sync failed' });
    }
});

// Onboarding Handshake
router.post('/onboard', protect, async (req: any, res) => {
    const { archetype, bio, preferences } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                archetype,
                bio,
                preferences,
                hasCompletedOnboarding: true
            },
            { new: true }
        );

        // Award achievement for completing identity sync
        await checkAchievements(req.user._id.toString(), 'INITIAL', (req as any).io);

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Onboarding handshake failed' });
    }
});

export default router;
