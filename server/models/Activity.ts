import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
    userId: mongoose.Types.ObjectId | string;
    type: 'THREAD_CREATED' | 'POST_CREATED' | 'CLAN_JOINED' | 'FOLLOW_STARTED' | 'ACHIEVEMENT_UNLOCKED' | 'MEDIA_CREATED';
    metadata: {
        targetId?: string;
        targetName?: string;
        contentPreview?: string;
        badgeType?: string;
        mediaType?: string;
    };
    createdAt: Date;
}

const ActivitySchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        required: true,
        enum: ['THREAD_CREATED', 'POST_CREATED', 'CLAN_JOINED', 'FOLLOW_STARTED', 'ACHIEVEMENT_UNLOCKED', 'MEDIA_CREATED']
    },
    metadata: {
        targetId: { type: String },
        targetName: { type: String },
        contentPreview: { type: String },
        badgeType: { type: String }
    }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Index for feed fetching (latest first)
ActivitySchema.index({ createdAt: -1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);
