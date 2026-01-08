import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
    participants: string[]; // User IDs
    lastMessage?: mongoose.Types.ObjectId;
    lastActivity: Date;
    unreadCounts: Map<string, number>; // UserID -> count
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema: Schema = new Schema({
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastActivity: { type: Date, default: Date.now },
    unreadCounts: {
        type: Map,
        of: Number,
        default: new Map()
    }
}, { timestamps: true });

// Ensure unique conversation for a pair (simplified for 1-on-1, can be expanded for groups)
ConversationSchema.index({ participants: 1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
