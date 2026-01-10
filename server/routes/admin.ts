import express from 'express';
import User from '../models/User';
import Report from '../models/Report';
import Post from '../models/Post';
import Media from '../models/Media';
import ForumThread from '../models/ForumThread';
import { adminAuth } from '../middleware/authMiddleware';
import { logActivity } from '../services/gamificationService';

const router = express.Router();

// Admin: Get all users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failure' });
    }
});

// Admin: Update user status
router.patch('/users/:id/status', adminAuth, async (req, res) => {
    const { status } = req.body;
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Update failure' });
    }
});

// Admin: Get metrics
router.get('/metrics', adminAuth, async (req, res) => {
    try {
        const usersCount = await User.countDocuments();
        const premiumUsers = await User.countDocuments({ tier: 'PREMIUM' });
        const eliteUsers = await User.countDocuments({ tier: 'ELITE' });
        const legendUsers = await User.countDocuments({ tier: 'LEGEND' });

        const totalRevenue = (premiumUsers * 9.99) + (eliteUsers * 29.99) + (legendUsers * 99.99);
        const posts = await Post.find();
        const totalGifts = posts.reduce((acc, p) => acc + (p.gifts?.length || 0), 0);

        res.json({
            totalUsers: usersCount,
            activeTournaments: 3,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalGifts: totalGifts,
            tierDistribution: {
                FREE: usersCount - premiumUsers - eliteUsers - legendUsers,
                PREMIUM: premiumUsers,
                ELITE: eliteUsers,
                LEGEND: legendUsers
            },
            meshStability: '99.99%'
        });
    } catch (err) {
        res.status(500).json({ error: 'Metrics failure' });
    }
});

// Submit a report (Public)
router.post('/reports', async (req, res) => {
    const { reporterId, targetType, targetId, reason, description } = req.body;
    try {
        const report = await Report.create({
            reporterId,
            targetType,
            targetId,
            reason,
            description,
            status: 'PENDING'
        });

        res.status(201).json(report);
    } catch (err) {
        res.status(500).json({ error: 'Failed to file report' });
    }
});

// Admin: Get all reports
router.get('/reports', adminAuth, async (req, res) => {
    try {
        const reports = await Report.find()
            .sort({ createdAt: -1 })
            .populate('reporterId', 'username email');
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: 'Failed to access audit logs' });
    }
});

// Admin: Resolve report & Enforcement
router.post('/resolve-report', adminAuth, async (req, res) => {
    const { reportId, action, adminNotes, banReason } = req.body; // action: 'BAN' | 'DISMISS'
    try {
        const report = await Report.findById(reportId);
        if (!report) return res.status(404).json({ error: 'Report not found' });

        const io = (req as any).io; // Explicitly get IO

        if (action === 'BAN') {
            const targetId = report.targetId;
            let finalTargetUserId = targetId;

            // If reporting content, find the owner
            if (report.targetType === 'POST') {
                const post = await Post.findById(targetId);
                if (post) finalTargetUserId = post.authorId.toString();
            } else if (report.targetType === 'MEDIA') {
                const media = await Media.findById(targetId);
                if (media) finalTargetUserId = media.userId.toString();
            } else if (report.targetType === 'THREAD') {
                const thread = await ForumThread.findById(targetId);
                if (thread) finalTargetUserId = thread.authorId.toString();
            }

            const targetUser = await User.findById(finalTargetUserId);
            if (targetUser) {
                targetUser.isBanned = true;
                targetUser.status = 'banned';
                targetUser.banReason = banReason || 'Operator policy violation.';
                await targetUser.save();

                // Log enforcement
                await logActivity(targetUser.id, 'USER_BANNED', { adminNotes, reason: banReason });

                // Disconnect user if live (Socket.IO)
                if (io) {
                    io.to(targetUser.id.toString()).emit('protocol_termination', {
                        reason: targetUser.banReason
                    });
                }
            }
            report.status = 'RESOLVED';
        } else if (action === 'DISMISS') {
            report.status = 'DISMISSED';
        }

        report.adminNotes = adminNotes;
        await report.save();

        res.json(report);
    } catch (err) {
        console.error('[MODERATION] Enforcement error:', err);
        res.status(500).json({ error: 'Enforcement failure' });
    }
});

export default router;
