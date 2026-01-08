import mongoose, { Schema, Document } from 'mongoose';

export interface IClanMember {
    userId: string;
    role: 'leader' | 'officer' | 'member';
    joinedAt: Date;
}

export interface IClan extends Document {
    name: string;
    tag: string;
    description: string;
    avatar: string;
    members: IClanMember[];
    stats: {
        totalWins: number;
        totalTrophies: number;
        memberCount: number;
        level: number;
    };
    settings: {
        isPublic: boolean;
        requiresApproval: boolean;
        minRating: number;
        maxMembers: number;
    };
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const ClanMemberSchema = new Schema({
    userId: { type: String, required: true },
    role: { type: String, enum: ['leader', 'officer', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const ClanSchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 20,
        trim: true
    },
    tag: {
        type: String,
        required: true,
        unique: true,
        minlength: 2,
        maxlength: 5,
        uppercase: true,
        trim: true
    },
    description: {
        type: String,
        maxlength: 500,
        default: 'A new clan ready to dominate the arena.'
    },
    avatar: {
        type: String,
        default: 'https://api.dicebear.com/7.x/shapes/svg?seed=clan'
    },
    members: [ClanMemberSchema],
    stats: {
        totalWins: { type: Number, default: 0 },
        totalTrophies: { type: Number, default: 0 },
        memberCount: { type: Number, default: 1 },
        level: { type: Number, default: 1 }
    },
    settings: {
        isPublic: { type: Boolean, default: true },
        requiresApproval: { type: Boolean, default: false },
        minRating: { type: Number, default: 0 },
        maxMembers: { type: Number, default: 50 }
    },
    createdBy: { type: String, required: true },
}, { timestamps: true });

// Indexes for efficient queries
ClanSchema.index({ name: 'text', tag: 'text', description: 'text' });
ClanSchema.index({ 'stats.totalTrophies': -1 });
ClanSchema.index({ 'members.userId': 1 });

// Virtual for calculating level based on trophies
ClanSchema.pre('save', function (next) {
    this.stats.memberCount = this.members.length;
    this.stats.level = Math.floor(this.stats.totalTrophies / 500) + 1;
    next();
});

export default mongoose.model<IClan>('Clan', ClanSchema);
