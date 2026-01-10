import express from 'express';
import { Message } from '../models/Message';
import Conversation from '../models/Conversation';
import { Notification } from '../models/Notification';

const router = express.Router();

// GET /api/messages/conversations - List conversations
router.get('/conversations', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Identity required' });

    try {
        const conversations = await Conversation.find({
            participants: userId
        })
            .populate('participants', 'username avatar status')
            .populate('lastMessage')
            .sort({ lastActivity: -1 });

        res.json(conversations);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// GET /api/messages/conversations/:id - Get conversation messages
router.get('/conversations/:id', async (req, res) => {
    try {
        const messages = await Message.find({ conversationId: req.params.id })
            .sort({ createdAt: 1 })
            .limit(100);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/messages - Send a message
router.post('/', async (req, res) => {
    const { senderId, receiverId, content, isStaff, streamId, clanId } = req.body;
    try {
        let conversationId = null;

        // If it's a private message, handle conversation association
        if (receiverId && !streamId && !clanId) {
            let conversation = await Conversation.findOne({
                participants: { $all: [senderId, receiverId], $size: 2 }
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [senderId, receiverId],
                    unreadCounts: new Map([[receiverId, 0], [senderId, 0]])
                });
            }
            conversationId = conversation._id;
        }

        const message = await Message.create({
            senderId,
            receiverId,
            content,
            isStaff,
            streamId,
            clanId,
            conversationId
        });

        if (conversationId) {
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: message._id,
                lastActivity: new Date(),
                $inc: { [`unreadCounts.${receiverId}`]: 1 }
            });
        }

        if ((req as any).io) {
            if (streamId) {
                (req as any).io.to(streamId).emit('receive_message', message);
            } else if (clanId) {
                (req as any).io.to(`clan_${clanId}`).emit('new_clan_message', message);
            } else if (receiverId) {
                // Emit to receiver's private room
                (req as any).io.to(`user_${receiverId}`).emit('new_message', message);
                // Emit to sender for sync
                (req as any).io.to(`user_${senderId}`).emit('new_message', message);
            }
        }

        if (isStaff && receiverId) {
            await Notification.create({
                userId: receiverId,
                type: 'SYSTEM',
                content: `Emergency Transmission from Staff: ${content.substring(0, 50)}...`
            });
        }

        res.json(message);
    } catch (err) {
        console.error('[MESSAGE] Send failure:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// GET /api/messages/notifications/:userId - Get notifications
router.get('/notifications/:userId', async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(10);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

export default router;
