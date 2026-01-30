
import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
    title: string;
    content?: string;
    thumbnail?: string;
    authorName?: string;
    authorAvatar?: string;
    likes: string[]; // Array of User IDs
    views: number;
    gifts: {
        from: string;
        type: string;
        amount: number;
        timestamp: Date;
    }[];
    authorId?: string;
    isSubscriberOnly: boolean;
}

const PostSchema: Schema = new Schema({
    title: { type: String, required: true },
    content: { type: String },
    thumbnail: { type: String },
    authorName: { type: String },
    authorAvatar: { type: String },
    likes: [{ type: String }],
    views: { type: Number, default: 0 },
    gifts: [{
        from: { type: String, required: true },
        type: { type: String, required: true },
        amount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    isSubscriberOnly: { type: Boolean, default: false },
    authorId: { type: String }
}, { timestamps: true });

export default mongoose.model<IPost>('Post', PostSchema);
