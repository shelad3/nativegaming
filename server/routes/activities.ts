import { Router } from 'express';
import Activity from '../models/Activity';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Get activity feed for all users (global feed)
router.get('/', async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate('user', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(activities);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get activity feed for a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const activities = await Activity.find({ user: req.params.userId })
            .populate('user', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(30);
        res.json(activities);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new activity (protected)
router.post('/', protect, async (req: any, res) => {
    try {
        const { type, description, metadata } = req.body;

        const activity = await Activity.create({
            user: req.user._id,
            type,
            description,
            metadata
        });

        const populated = await Activity.findById(activity._id)
            .populate('user', 'username avatar');

        res.status(201).json(populated);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
