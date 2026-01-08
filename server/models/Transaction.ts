import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    userId: string;
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    amount: number; // Amount in USD cents (e.g., 499 = $4.99)
    codeBitsAwarded: number;
    packageId: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    stripeSessionId: { type: String, required: true, unique: true },
    stripePaymentIntentId: { type: String },
    amount: { type: Number, required: true },
    codeBitsAwarded: { type: Number, required: true },
    packageId: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

// Index for efficient queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ stripeSessionId: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
