import express from 'express';
import User from '../models/User';
import { Notification } from '../models/Notification';

const router = express.Router();

// Start Stream
router.post('/start', async (req, res) => {
    const { userId, title, game, description, peerId } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            {
                isLive: true,
                streamTitle: title,
                streamGame: game,
                streamDescription: description,
                peerId: peerId || ''
            },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: 'User not found' });

        console.log(`[LIVE] User ${user.username} is now broadcasting signal: ${title}`);

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

        // Broadcast global live mesh update
        if ((req as any).io) {
            const liveUsers = await User.find({ isLive: true }).limit(10);
            (req as any).io.emit('live_users_update', liveUsers);
        }

        res.json(user);
    } catch (err) {
        console.error('[STREAM] Start failure:', err);
        res.status(500).json({ error: 'Failed to start stream' });
    }
});

// Stop Stream
router.post('/stop', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { isLive: false, streamTitle: '', peerId: '' },
            { new: true }
        );

        // Broadcast global live mesh update
        if ((req as any).io) {
            const liveUsers = await User.find({ isLive: true }).limit(10);
            (req as any).io.emit('live_users_update', liveUsers);
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to stop stream' });
    }
});

export default router;
