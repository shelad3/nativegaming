import mongoose, { Schema, Document } from 'mongoose';

export interface IFollow extends Document {
    followerId: string;
    followingId: string;
    createdAt: Date;
}

const FollowSchema: Schema = new Schema({
    followerId: { type: String, required: true, index: true },
    followingId: { type: String, required: true, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Prevent duplicate follows
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export default mongoose.model<IFollow>('Follow', FollowSchema);
