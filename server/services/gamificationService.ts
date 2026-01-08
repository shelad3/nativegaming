import User from '../models/User';
import ForumThread from '../models/ForumThread';
import ForumPost from '../models/ForumPost';
import Achievement from '../models/Achievement';
import { Notification } from '../models/Notification';
import Activity from '../models/Activity';

// Log a user activity for the feed
export const logActivity = async (userId: string, type: string, metadata: any) => {
    try {
        await Activity.create({ userId, type, metadata });
    } catch (err) {
        console.error('[ACTIVITY] Failed to log activity:', err);
    }
};

// Check and award achievements
export const checkAchievements = async (userId: string, type: string, io?: any) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        let badgeType = '';
        let badgeName = '';

        if (type === 'FIRST_THREAD') {
            const threadCount = await ForumThread.countDocuments({ authorId: userId });
            if (threadCount === 1) {
                badgeType = 'TACTICAL_SPEAKER';
                badgeName = 'Tactical Speaker';
            }
        } else if (type === 'FIRST_POST') {
            const postCount = await ForumPost.countDocuments({ authorId: userId });
            if (postCount === 1) {
                badgeType = 'QUICK_RESPONDER';
                badgeName = 'Quick Responder';
            }
        } else if (type === 'CLAN_JOIN') {
            badgeType = 'SQUAD_MEMBER';
            badgeName = 'Squad Member';
        } else if (type === 'FIRST_FOLLOW') {
            badgeType = 'MESH_CONNECTOR';
            badgeName = 'Mesh Connector';
        } else if (type === 'LOGIN' || type === 'INITIAL') {
            // Check for early adopter status (created before Jan 3rd 2026 for example)
            const cutoff = new Date('2026-01-03');
            if (user.createdAt < cutoff) {
                badgeType = 'EARLY_ADOPTER';
                badgeName = 'Early Adopter';
            }
        }

        if (badgeType) {
            // Check if already has it
            const existing = await Achievement.findOne({ userId, badgeType });
            if (!existing) {
                await Achievement.create({ userId, badgeType });

                // Log achievement activity
                await logActivity(userId, 'ACHIEVEMENT_UNLOCKED', { badgeType, badgeName });

                // Create notification
                const notification = await Notification.create({
                    userId,
                    type: 'SYSTEM',
                    content: `Achievement Unlocked: ${badgeName}! Check your profile for your new badge.`,
                });

                if (io) {
                    io.to(userId).emit('new_notification', notification);
                }
            }
        }
    } catch (err) {
        console.error('[ACHIEVEMENT] Error checking achievements:', err);
    }
};
