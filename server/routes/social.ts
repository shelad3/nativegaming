import express from 'express';
import Activity from '../models/Activity';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// GET /api/social/feed - Get activity feed
router.get('/feed', async (req, res) => {
    const { userId, limit = 20 } = req.query;
    try {
        let query: any = {};
        if (userId) {
            // If userId is provided, we might want to filter by people they follow
            // But for now, let's allow basic filtering by the user themselves if requested
            query.userId = userId;
        }

        const activities = await Activity.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .populate('userId', 'username avatar archetype');

        res.json(activities);
    } catch (err) {
        console.error('[SOCIAL] Feed fetch failure:', err);
        res.status(500).json({ error: 'Failed to synchronize social mesh' });
    }
});

export default router;
