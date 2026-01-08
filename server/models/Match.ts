import mongoose, { Schema, Document } from 'mongoose';

export interface IMatch extends Document {
    tournamentId: mongoose.Types.ObjectId;
    player1Id: mongoose.Types.ObjectId;
    player2Id: mongoose.Types.ObjectId;
    winnerId?: mongoose.Types.ObjectId;
    score?: string;
    round: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    createdAt: Date;
    updatedAt: Date;
}

const MatchSchema: Schema = new Schema({
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    player1Id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    player2Id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    score: { type: String },
    round: { type: Number, default: 1 },
    status: {
        type: String,
        enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'PENDING'
    }
}, { timestamps: true });

export default mongoose.model<IMatch>('Match', MatchSchema);
