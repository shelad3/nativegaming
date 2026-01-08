import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
    userId: mongoose.Types.ObjectId | string;
    type: 'CLIP' | 'VOD';
    title: string;
    url: string;
    thumbnail: string;
    game: string;
    stats: {
        views: number;
        likes: string[]; // User IDs
        gifts: number; // Total CodeBits
    };
    createdAt: Date;
}

const MediaSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['CLIP', 'VOD'], required: true, index: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    game: { type: String, required: true },
    stats: {
        views: { type: Number, default: 0 },
        likes: { type: [String], default: [] },
        gifts: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Text index for search
MediaSchema.index({ title: 'text', game: 'text' });

export default mongoose.model<IMedia>('Media', MediaSchema);
