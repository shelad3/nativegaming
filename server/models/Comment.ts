import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
    postId: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    authorName: string;
    authorAvatar: string;
    content: string;
    likes: string[]; // User IDs
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema: Schema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },
    content: { type: String, required: true },
    likes: [{ type: String }]
}, { timestamps: true });

export default mongoose.model<IComment>('Comment', CommentSchema);
