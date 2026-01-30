
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  googleId?: string;
  password?: string;
  avatar: string;
  tier: string;
  codeBits: number;
  stats: {
    rating: number;
    winRate: string;
    trophies: number;
    tournaments: number;
  };
  preferences: string[];
  bio: string;
  hasCompletedOnboarding: boolean;
  followers: string[]; // Array of User IDs
  following: string[]; // Array of User IDs
  blocked: string[];
  settings: {
    isPublic: boolean;
    allowMessages: string;
    notifications: {
      emails: boolean;
      push: boolean;
      mentions: boolean;
    };
    theme: string;
  };
  premiumSettings?: {
    customColors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
    isVerified: boolean;
    customAnimation: string; // e.g., 'discord-pulse', 'none'
    profileEffect: string;
  };
  audit_logs: any[];
  status: 'active' | 'banned' | 'pending';
  isOnline: boolean;
  lastActive?: Date;
  isLive: boolean;
  streamTitle?: string;
  peerId?: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  verificationCode?: string;
  verificationExpires?: Date;
  inventory: string[];
  registeredTournaments: string[];
  clanId?: string;
  clanRole?: 'leader' | 'officer' | 'member';
  clanJoinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isBanned: boolean;
  banReason?: string;
  ownedThemes: string[]; // Array of Theme IDs
  activeTheme?: {
    banner?: string;
    animation?: string;
    effect?: string;
    fontFamily?: string;
    fontUrl?: string;
    profileEffect?: string;
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
  };
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  tier: { type: String, default: 'FREE' },
  codeBits: { type: Number, default: 500 },
  stats: {
    rating: { type: Number, default: 1200 },
    winRate: { type: String, default: '0%' },
    trophies: { type: Number, default: 0 },
    tournaments: { type: Number, default: 0 }
  },
  preferences: [{ type: String }],
  bio: { type: String, default: 'Identity sync active. Welcome to the Nexus.' },
  hasCompletedOnboarding: { type: Boolean, default: false },
  followers: [{ type: String }],
  following: [{ type: String }],
  blocked: [{ type: String }],
  settings: {
    isPublic: { type: Boolean, default: true },
    allowMessages: { type: String, default: 'all' },
    notifications: {
      emails: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true }
    },
    theme: { type: String, default: 'dark' },
    streaming: {
      defaultTitle: { type: String, default: 'Tactical Broadcast' },
      lowLatency: { type: Boolean, default: true },
      allowChat: { type: Boolean, default: true },
      showViewers: { type: Boolean, default: true }
    },
    // Settings 3.0 Additions
    connections: {
      discord: {
        connected: { type: Boolean, default: false },
        id: { type: String, default: '' },
        username: { type: String, default: '' }
      },
      steam: {
        connected: { type: Boolean, default: false },
        id: { type: String, default: '' },
        username: { type: String, default: '' }
      },
      twitch: {
        connected: { type: Boolean, default: false },
        id: { type: String, default: '' },
        username: { type: String, default: '' }
      }
    },
    gameplay: {
      region: { type: String, default: 'TOKYO (JP)' },
      crossplay: { type: Boolean, default: true },
      streamerMode: { type: Boolean, default: false }
    },
    security: {
      twoFactor: { type: Boolean, default: false },
      activeSessions: [{
        id: { type: String },
        device: { type: String },
        location: { type: String },
        active: { type: Boolean }
      }]
    }
  },
  premiumSettings: {
    customColors: {
      primary: { type: String },
      secondary: { type: String },
      accent: { type: String }
    },
    isVerified: { type: Boolean, default: false },
    customAnimation: { type: String, default: 'none' },
    profileEffect: { type: String, default: 'none' }
  },
  audit_logs: [{ type: Schema.Types.Mixed }],
  status: { type: String, enum: ['active', 'banned', 'pending'], default: 'active' },
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date },
  isLive: { type: Boolean, default: false },
  archetype: { type: String, default: 'OPERATOR' },
  streamTitle: { type: String, default: '' },
  peerId: { type: String, default: '' },
  streamDescription: { type: String, default: '' },
  streamGame: { type: String, default: '' },
  inventory: [{ type: String }],
  isAdmin: { type: Boolean, default: false },
  currency: { type: String, default: 'USD' },
  isEmailVerified: { type: Boolean, default: false },
  verificationCode: { type: String, select: false },
  verificationExpires: { type: Date, select: false },
  registeredTournaments: [{ type: Schema.Types.ObjectId, ref: 'Tournament' }],
  clanId: { type: String },
  clanRole: { type: String, enum: ['leader', 'officer', 'member'] },
  clanJoinedAt: { type: Date },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  ownedThemes: [{ type: String }],
  activeTheme: {
    banner: { type: String },
    animation: { type: String },
    effect: { type: String },
    fontFamily: { type: String },
    fontUrl: { type: String },
    profileEffect: { type: String },
    colors: {
      primary: { type: String },
      secondary: { type: String },
      accent: { type: String }
    }
  }
}, { timestamps: true });

UserSchema.index({ username: 'text', bio: 'text' });

export default mongoose.model<IUser>('User', UserSchema);
