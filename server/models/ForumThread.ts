import mongoose, { Schema, Document } from 'mongoose';

export interface IForumThread extends Document {
    title: string;
    content: string;
    authorId: string;
    categoryId: string;
    isPinned: boolean;
    isLocked: boolean;
    stats: {
        views: number;
        replyCount: number;
        upvotes: string[]; // User IDs
        downvotes: string[]; // User IDs
    };
    lastActivity: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ForumThreadSchema: Schema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 100
    },
    content: {
        type: String,
        required: true,
        minlength: 10
    },
    authorId: { type: String, required: true },
    categoryId: { type: String, required: true, index: true },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    stats: {
        views: { type: Number, default: 0 },
        replyCount: { type: Number, default: 0 },
        upvotes: [{ type: String }],
        downvotes: [{ type: String }]
    },
    lastActivity: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for searching and sorting
ForumThreadSchema.index({ title: 'text', content: 'text' });
ForumThreadSchema.index({ lastActivity: -1 });
ForumThreadSchema.index({ 'stats.replyCount': -1 });

export default mongoose.model<IForumThread>('ForumThread', ForumThreadSchema);
