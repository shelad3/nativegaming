import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    senderId: string;
    senderName?: string;
    receiverId?: string;
    streamId?: string;
    clanId?: string;
    conversationId?: mongoose.Types.ObjectId;
    content: string;
    isStaff: boolean;
    isRead: boolean;
    createdAt: Date;
}

const MessageSchema: Schema = new Schema({
    senderId: { type: String, required: true, index: true },
    senderName: { type: String },
    receiverId: { type: String, index: true },
    streamId: { type: String, index: true },
    clanId: { type: String, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    content: { type: String, required: true },
    isStaff: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
