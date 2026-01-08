import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    type: { type: String, enum: ['FOLLOW', 'LIKE', 'GIFT', 'SYSTEM'], required: true },
    fromUser: { type: String }, // Username or ID of the sender
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export const Notification = mongoose.model('Notification', NotificationSchema);
