import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketItem extends Document {
    name: string;
    description: string;
    price: number;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    category: 'Cosmetic' | 'Functional';
    type: string;
    imageUrl: string;
    metadata?: any;
}

const MarketItemSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    rarity: { type: String, enum: ['Common', 'Rare', 'Epic', 'Legendary'], default: 'Common' },
    category: { type: String, enum: ['Cosmetic', 'Functional'], required: true },
    type: { type: String, required: true },
    imageUrl: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model<IMarketItem>('MarketItem', MarketItemSchema);
