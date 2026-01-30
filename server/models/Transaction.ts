import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    userId: string;
    // Stripe fields (deprecated)
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    // Pesapal fields
    pesapalOrderTrackingId?: string;
    pesapalTransactionId?: string;
    pesapalPaymentMethod?: string;
    paymentProvider: 'stripe' | 'pesapal';
    // Common fields
    amount: number; // Amount in USD cents (e.g., 499 = $4.99)
    currency: string;
    codeBitsAwarded: number;
    packageId: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}

const TransactionSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    // Payment Provider
    paymentProvider: { type: String, enum: ['stripe', 'pesapal'], default: 'pesapal' },
    // Stripe fields (deprecated)
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    // Pesapal fields
    pesapalOrderTrackingId: { type: String },
    pesapalTransactionId: { type: String },
    pesapalPaymentMethod: { type: String },
    // Common fields
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    codeBitsAwarded: { type: Number, required: true },
    packageId: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending'
    },
    metadata: { type: Schema.Types.Mixed },
    completedAt: { type: Date }
}, { timestamps: true });

// Index for efficient queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ stripeSessionId: 1 });
TransactionSchema.index({ pesapalOrderTrackingId: 1 });
TransactionSchema.index({ pesapalTransactionId: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
