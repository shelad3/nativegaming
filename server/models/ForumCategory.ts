import mongoose, { Schema, Document } from 'mongoose';

export interface IForumCategory extends Document {
    name: string;
    description: string;
    icon: string;
    color: string;
    isAdminOnly: boolean;
    order: number;
    createdAt: Date;
}

const ForumCategorySchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String, default: 'MessageSquare' },
    color: { type: String, default: '#10b981' }, // Default primary green
    isAdminOnly: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IForumCategory>('ForumCategory', ForumCategorySchema);
