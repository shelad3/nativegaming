
export enum SubscriptionTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  ELITE = 'ELITE',
  LEGEND = 'LEGEND'
}

export interface UserSettings {
  isPublic: boolean;
  allowMessages: 'all' | 'following' | 'none';
  notifications: {
    emails: boolean;
    push: boolean;
    mentions: boolean;
  };
  theme: 'dark' | 'neon' | 'high-contrast';
  streaming: {
    defaultTitle: string;
    lowLatency: boolean;
    allowChat: boolean;
    showViewers: boolean;
  };
}

export interface User {
  id: string;
  _id: string; // MongoDB internal ID
  username: string;
  email: string;
  avatar: string;
  tier: SubscriptionTier;
  codeBits: number;
  archetype?: string;
  stats: {
    rating: number;
    winRate: string;
    trophies: number;
    tournaments: number;
  };
  preferences: string[];
  bio: string;
  hasCompletedOnboarding: boolean;
  followers: string[]; // User IDs
  following: string[]; // User IDs
  blocked: string[];
  settings: UserSettings;
  premiumSettings?: {
    customColors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
    isVerified: boolean;
    customAnimation: string;
    profileEffect: string;
  };
  audit_logs?: any[];
  isLive?: boolean;
  streamTitle?: string;
  streamDescription?: string;
  streamGame?: string;
  inventory: string[]; // Marketplace Item IDs
  isAdmin: boolean;
  currency: string;
  isEmailVerified: boolean;
  verificationCode?: string;
  registeredTournaments?: string[]; // Tournament IDs
  ownedThemes: string[];
  activeTheme?: {
    banner?: string;
    animation?: string;
    effect?: string;
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
  };
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  thumbnail: string;
  likes: string[]; // User IDs
  views: number;
  gifts: { from: string; type: string; amount: number }[];
  timestamp: string;
  createdAt?: string;
}

export interface VideoContent {
  id: string;
  title: string;
  game: string;
  thumbnail: string;
  views: number;
  author: string;
  timestamp: string;
}

export interface MetricCardData {
  label: string;
  value: string;
  trend: number;
  icon: string;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  price: number;
  category: 'Cosmetic' | 'Functional';
  type: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export interface Tournament {
  id: string;
  name: string;
  game: string;
  prize: string;
  status: 'REGISTRATION' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  maxParticipants: number;
  participants: string[]; // User IDs
  bracket?: any;
}

export interface Match {
  id: string;
  tournamentId: string;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  score?: string;
  round: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}
