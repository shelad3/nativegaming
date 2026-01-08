import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
    reporterId: mongoose.Types.ObjectId | string;
    targetType: 'USER' | 'POST' | 'MEDIA' | 'THREAD' | 'COMMENT';
    targetId: string;
    reason: string;
    description?: string;
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
    adminNotes?: string;
    createdAt: Date;
}

const ReportSchema: Schema = new Schema({
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
        type: String,
        required: true,
        enum: ['USER', 'POST', 'MEDIA', 'THREAD', 'COMMENT']
    },
    targetId: { type: String, required: true },
    reason: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['PENDING', 'RESOLVED', 'DISMISSED'],
        default: 'PENDING'
    },
    adminNotes: { type: String }
}, { timestamps: true });

ReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IReport>('Report', ReportSchema);
