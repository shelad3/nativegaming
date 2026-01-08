import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
    userId: mongoose.Types.ObjectId | string;
    badgeType: string;
    unlockedAt: Date;
}

const AchievementSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    badgeType: { type: String, required: true },
}, { timestamps: { createdAt: 'unlockedAt', updatedAt: false } });

// Prevent duplicate achievements for same user
AchievementSchema.index({ userId: 1, badgeType: 1 }, { unique: true });

export default mongoose.model<IAchievement>('Achievement', AchievementSchema);
