import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionTier extends Document {
    name: string;
    price: number;
    description: string;
    features: string[];
    tierLevel: number; // 0: BASIC, 1: ELITE, 2: LEGEND, etc.
    isPublic: boolean;
}

const SubscriptionTierSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    features: [{ type: String }],
    tierLevel: { type: Number, required: true },
    isPublic: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<ISubscriptionTier>('SubscriptionTier', SubscriptionTierSchema);
