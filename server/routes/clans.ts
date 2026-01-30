import express from 'express';
import User from '../models/User';
import Clan from '../models/Clan';
import { Message } from '../models/Message';
import { Notification } from '../models/Notification';
import { logActivity, checkAchievements } from '../services/gamificationService';

const router = express.Router();
const CLAN_CREATION_FEE = 1000;

// Create a new clan
router.post('/create', async (req, res) => {
    const { userId, name, tag, description, avatar } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Check if user already in a clan
        if (user.clanId) return res.status(400).json({ error: 'Already in a clan' });

        // Check CodeBits balance
        if (user.codeBits < CLAN_CREATION_FEE) {
            return res.status(400).json({ error: 'Insufficient CodeBits' });
        }

        // Check for duplicate name/tag
        const existing = await Clan.findOne({ $or: [{ name }, { tag: tag.toUpperCase() }] });
        if (existing) {
            return res.status(400).json({ error: 'Clan name or tag already taken' });
        }

        // Create clan
        const clan = await Clan.create({
            name,
            tag: tag.toUpperCase(),
            description,
            avatar: avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${tag}`,
            members: [{
                userId,
                role: 'leader',
                joinedAt: new Date()
            }],
            createdBy: userId
        });

        // Deduct CodeBits and update user
        user.codeBits -= CLAN_CREATION_FEE;
        user.clanId = clan._id.toString();
        user.clanRole = 'leader';
        user.clanJoinedAt = new Date();
        await user.save();

        console.log(`[CLAN] Created: ${clan.name} [${clan.tag}] by ${user.username}`);
        await logActivity(userId, 'CLAN_JOINED', { targetId: clan._id, targetName: name });
        res.status(201).json(clan);
    } catch (err) {
        console.error('[CLAN] Creation error:', err);
        res.status(500).json({ error: 'Failed to create clan' });
    }
});

// Browse all clans
router.get('/', async (req, res) => {
    const { query, sort = 'trophies' } = req.query;

    try {
        let filter: any = { 'settings.isPublic': true };

        if (query) {
            filter.$text = { $search: query as string };
        }

        const sortOptions: any = {
            trophies: { 'stats.totalTrophies': -1 },
            members: { 'stats.memberCount': -1 },
            level: { 'stats.level': -1 },
            recent: { createdAt: -1 }
        };

        const clans = await Clan.find(filter)
            .sort(sortOptions[sort as string] || sortOptions.trophies)
            .limit(50);

        res.json(clans);
    } catch (err) {
        console.error('[CLAN] Browse error:', err);
        res.status(500).json({ error: 'Failed to fetch clans' });
    }
});

// Get clan details
router.get('/:id', async (req, res) => {
    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        // Populate member details
        const memberIds = clan.members.map(m => m.userId);
        const users = await User.find({ _id: { $in: memberIds } });

        const membersWithDetails = clan.members.map(m => {
            const user = users.find(u => u._id.toString() === m.userId);
            return {
                ...(m as any).toObject(),
                username: user?.username,
                avatar: user?.avatar,
                stats: user?.stats
            };
        });

        res.json({ ...clan.toObject(), membersWithDetails });
    } catch (err) {
        console.error('[CLAN] Fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch clan' });
    }
});

// Get Clan Members Presence
router.get('/:id/members/presence', async (req, res) => {
    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const memberIds = clan.members.map(m => m.userId);
        const presence = await User.find({ _id: { $in: memberIds } }).select('_id username isOnline lastActive');

        res.json(presence);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch presence matrix' });
    }
});

// Update clan (leader only)
router.patch('/:id', async (req, res) => {
    const { userId, description, avatar, settings } = req.body;

    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const member = clan.members.find(m => m.userId === userId);
        if (!member || member.role !== 'leader') {
            return res.status(403).json({ error: 'Only clan leader can update' });
        }

        if (description) clan.description = description;
        if (avatar) clan.avatar = avatar;
        if (settings) clan.settings = { ...clan.settings, ...settings };

        await clan.save();
        res.json(clan);
    } catch (err) {
        console.error('[CLAN] Update error:', err);
        res.status(500).json({ error: 'Failed to update clan' });
    }
});

// Join clan
router.post('/:id/join', async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.clanId) return res.status(400).json({ error: 'Already in a clan' });

        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        // Check if clan is full
        if (clan.members.length >= clan.settings.maxMembers) {
            return res.status(400).json({ error: 'Clan is full' });
        }

        // Check rating requirement
        if (user.stats.rating < clan.settings.minRating) {
            return res.status(400).json({ error: 'Rating too low' });
        }

        // Check if already member (double check)
        if (clan.members.find(m => m.userId === userId)) {
            return res.status(400).json({ error: 'Already a member' });
        }

        // Add member
        clan.members.push({
            userId,
            role: 'member',
            joinedAt: new Date()
        });
        await clan.save();

        // Update user
        user.clanId = clan._id.toString();
        user.clanRole = 'member';
        user.clanJoinedAt = new Date();
        await user.save();

        // Notify clan members
        const leader = clan.members.find(m => m.role === 'leader');
        if (leader && (req as any).io) {
            const notification = await Notification.create({
                userId: leader.userId,
                type: 'SYSTEM',
                content: `${user.username} has joined your clan [${clan.tag}]!`
            });
            (req as any).io.to(`user_${leader.userId}`).emit('new_notification', notification);
        }

        console.log(`[CLAN] ${user.username} joined ${clan.name}`);

        // Log and check achievements
        await logActivity(userId, 'CLAN_JOINED', { targetId: clan._id, targetName: clan.name });
        await checkAchievements(userId, 'CLAN_JOIN', (req as any).io);

        res.json({ clan, user });
    } catch (err) {
        console.error('[CLAN] Join error:', err);
        res.status(500).json({ error: 'Failed to join clan' });
    }
});

// Leave clan
router.post('/:id/leave', async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const member = clan.members.find(m => m.userId === userId);
        if (!member) return res.status(400).json({ error: 'Not a member of this clan' });

        // Leaders cannot leave (must transfer or disband)
        if (member.role === 'leader') {
            return res.status(400).json({ error: 'Leader must transfer leadership or disband clan' });
        }

        // Remove member
        clan.members = clan.members.filter(m => m.userId !== userId);
        await clan.save();

        // Update user
        user.clanId = undefined;
        user.clanRole = undefined;
        user.clanJoinedAt = undefined;
        await user.save();

        console.log(`[CLAN] ${user.username} left ${clan.name}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[CLAN] Leave error:', err);
        res.status(500).json({ error: 'Failed to leave clan' });
    }
});

// Kick member (leader/officer)
router.post('/:id/kick', async (req, res) => {
    const { userId, targetUserId } = req.body;

    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const kicker = clan.members.find(m => m.userId === userId);
        if (!kicker || (kicker.role !== 'leader' && kicker.role !== 'officer')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const target = clan.members.find(m => m.userId === targetUserId);
        if (!target) return res.status(400).json({ error: 'User not in clan' });

        // Cannot kick leader
        if (target.role === 'leader') {
            return res.status(400).json({ error: 'Cannot kick clan leader' });
        }

        // Officers cannot kick other officers
        if (kicker.role === 'officer' && target.role === 'officer') {
            return res.status(403).json({ error: 'Officers cannot kick other officers' });
        }

        // Remove member
        clan.members = clan.members.filter(m => m.userId !== targetUserId);
        await clan.save();

        // Update target user
        const targetUser = await User.findById(targetUserId);
        if (targetUser) {
            targetUser.clanId = undefined;
            targetUser.clanRole = undefined;
            targetUser.clanJoinedAt = undefined;
            await targetUser.save();

            // Notify kicked user
            if ((req as any).io) {
                const notification = await Notification.create({
                    userId: targetUserId,
                    type: 'SYSTEM',
                    content: `You have been removed from clan [${clan.tag}].`
                });
                (req as any).io.to(`user_${targetUserId}`).emit('new_notification', notification);
            }
        }

        console.log(`[CLAN] ${targetUserId} kicked from ${clan.name}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[CLAN] Kick error:', err);
        res.status(500).json({ error: 'Failed to kick member' });
    }
});

// Promote member (leader only)
router.post('/:id/promote', async (req, res) => {
    const { userId, targetUserId } = req.body;

    try {
        const clan = await Clan.findById(req.params.id);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const leader = clan.members.find(m => m.userId === userId);
        if (!leader || leader.role !== 'leader') {
            return res.status(403).json({ error: 'Only leader can promote' });
        }

        const target = clan.members.find(m => m.userId === targetUserId);
        if (!target) return res.status(400).json({ error: 'User not in clan' });

        if (target.role === 'officer') {
            return res.status(400).json({ error: 'Already an officer' });
        }

        target.role = 'officer';
        await clan.save();

        // Update user
        const targetUser = await User.findById(targetUserId);
        if (targetUser) {
            targetUser.clanRole = 'officer';
            await targetUser.save();
        }

        console.log(`[CLAN] ${targetUserId} promoted to officer in ${clan.name}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[CLAN] Promote error:', err);
        res.status(500).json({ error: 'Failed to promote member' });
    }
});

// Clan leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const topClans = await Clan.find()
            .sort({ 'stats.totalTrophies': -1 })
            .limit(100);
        res.json(topClans);
    } catch (err) {
        console.error('[CLAN] Leaderboard error:', err);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Clan chat messages
router.get('/:id/messages', async (req, res) => {
    try {
        const messages = await Message.find({ clanId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(messages.reverse());
    } catch (err) {
        console.error('[CLAN] Messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.post('/:id/messages', async (req, res) => {
    const { senderId, senderName, content } = req.body;
    const clanId = req.params.id;

    try {
        // Verify user is in clan
        const user = await User.findById(senderId);
        if (!user || user.clanId !== clanId) {
            return res.status(403).json({ error: 'Not a member of this clan' });
        }

        const message = await Message.create({
            senderId,
            senderName,
            clanId,
            content
        });

        // Broadcast to clan room
        if ((req as any).io) {
            (req as any).io.to(`clan_${clanId}`).emit('clan_message', message);
        }

        res.json(message);
    } catch (err) {
        console.error('[CLAN] Message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
