import mongoose, { Schema, Document } from 'mongoose';

export interface IForumPost extends Document {
    threadId: string;
    authorId: string;
    content: string;
    upvotes: string[]; // User IDs
    downvotes: string[]; // User IDs
    isEdited: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ForumPostSchema: Schema = new Schema({
    threadId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    upvotes: [{ type: String }],
    downvotes: [{ type: String }],
    isEdited: { type: Boolean, default: false }
}, { timestamps: true });

// Index for fetching thread replies in order
ForumPostSchema.index({ threadId: 1, createdAt: 1 });

export default mongoose.model<IForumPost>('ForumPost', ForumPostSchema);
