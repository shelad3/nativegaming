import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User';

export const initializeSocket = (io: Server) => {

    // Auth Middleware for Socket.io
    io.use(async (socket: Socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.token;
            if (!token) {
                // Return next() to allow unauthenticated connections (e.g., guest viewers)
                // But mark as guest
                (socket as any).userId = null;
                return next();
            }

            const decoded: any = jwt.verify(token as string, process.env.JWT_SECRET || 'default_secret_dev_only');
            (socket as any).userId = decoded.id;
            next();
        } catch (err) {
            next(new Error("Authentication error"));
        }
    });

    io.on('connection', async (socket: Socket) => {
        const userId = (socket as any).userId;

        if (userId) {
            console.log(`[SOCKET] Authenticated User Connected: ${userId} (${socket.id})`);

            // 1. Join their private room
            socket.join(`user_${userId}`);

            // 2. Update DB Status => Online
            try {
                await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() });

                // 3. Broadcast Presence
                io.emit('user_status', { userId, status: 'online' });
            } catch (e) {
                console.error(`[SOCKET] Error updating presence for ${userId}`);
            }
        } else {
            console.log(`[SOCKET] Guest Connected: ${socket.id}`);
        }

        socket.on('join_stream', (streamId: string) => {
            socket.join(streamId);
            console.log(`[SOCKET] Socket ${socket.id} joined stream ${streamId}`);
        });

        socket.on('join_clan', async (clanId: string) => {
            socket.join(`clan_${clanId}`);
            if (userId) {
                io.to(`clan_${clanId}`).emit('clan_member_status', { userId, status: 'online' });
            }
        });

        socket.on('join_conversation', (conversationId: string) => {
            socket.join(conversationId);
        });

        // Typing Indicators
        socket.on('typing_start', (data: any) => {
            const { streamId, conversationId, username } = data;
            if (streamId) socket.to(streamId).emit('user_typing_update', { username, isTyping: true });
            if (conversationId) socket.to(conversationId).emit('dm_typing_update', { username, isTyping: true, conversationId });
        });

        socket.on('typing_stop', (data: any) => {
            const { streamId, conversationId, username } = data;
            if (streamId) socket.to(streamId).emit('user_typing_update', { username, isTyping: false });
            if (conversationId) socket.to(conversationId).emit('dm_typing_update', { username, isTyping: false, conversationId });
        });

        // Read Receipts
        socket.on('message_read', async (data: any) => {
            const { conversationId, readerId } = data;
            if (conversationId) {
                socket.to(conversationId).emit('read_receipt_update', { conversationId, readerId });
            }
        });

        // Chat Message Handling (If using socket directly instead of API)
        socket.on('send_message', (data: any) => {
            // Echo back to room is usually done via API to persist first, 
            // but for transient chat:
            const room = data.streamId || data.conversationId;
            if (room) {
                // NOTE: Production apps should save to DB here or use the API route.
                // This is for visual feedback if using pure socket chat.
                // We will rely on the API route to emit 'receive_message',
                // but keeping this for potential direct-socket optimizations.
            }
        });

        // --- BROADCAST METRICS ---
        socket.on('broadcast_metrics', (data: any) => {
            const { streamId, bitrate, fps, health } = data;
            socket.to(streamId).emit('metrics_update', { bitrate, fps, health });
        });

        socket.on('disconnect', async () => {
            console.log(`[SOCKET] Disconnected: ${socket.id}`);
            if (userId) {
                try {
                    await User.findByIdAndUpdate(userId, { isOnline: false, lastActive: new Date() });
                    io.emit('user_status', { userId, status: 'offline' });
                } catch (e) {
                    console.error(`[SOCKET] Error updating offline status for ${userId}`);
                }
            }
        });
    });
};
