import mongoose, { Schema, Document } from 'mongoose';

export interface ITournament extends Document {
    name: string;
    game: string;
    prize: string;
    status: 'REGISTRATION' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    startDate: Date;
    endDate?: Date;
    maxParticipants: number;
    participants: mongoose.Types.ObjectId[]; // User IDs
    bracket?: any; // To be structured later
    createdAt: Date;
    updatedAt: Date;
}

const TournamentSchema: Schema = new Schema({
    name: { type: String, required: true },
    game: { type: String, required: true },
    prize: { type: String, required: true },
    status: {
        type: String,
        enum: ['REGISTRATION', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
        default: 'REGISTRATION'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    maxParticipants: { type: Number, default: 100 },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bracket: { type: Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model<ITournament>('Tournament', TournamentSchema);
