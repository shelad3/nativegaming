
import { User, SubscriptionTier } from '../types';

const LATENCY = 1200;
const STORAGE_KEY = 'native_codex_user_session';

// Simulated database
const getStoredUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

const setStoredUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const mockApi = {
  // Check for existing session
  getCurrentUser: async (): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return getStoredUser();
  },

  // Login operation
  login: async (email: string, password: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, LATENCY));

    // In a real app, we'd verify password hash. For this mock, any password works.
    const existingUser = getStoredUser();

    if (existingUser && existingUser.email === email) {
      return existingUser;
    }

    // Default mock user if not found in storage
    // Fix: Added missing properties (followers, following, blocked, settings) to satisfy User interface requirements
    const mockUser: User = {
      id: 'u-' + Math.random().toString(36).substr(2, 9),
      username: email.split('@')[0].toUpperCase(),
      email,
      avatar: `https://picsum.photos/seed/${email}/200/200`,
      tier: SubscriptionTier.FREE,
      codeBits: 1000,
      stats: {
        rating: 1200,
        winRate: '50%',
        trophies: 2,
        tournaments: 0
      },
      preferences: [],
      bio: 'New operator initialized in the Nexus.',
      hasCompletedOnboarding: false,
      followers: [],
      following: [],
      blocked: [],
      _id: 'u-' + Math.random().toString(36).substr(2, 9),
      inventory: [],
      isAdmin: false,
      currency: 'Ȼ',
      isEmailVerified: true,
      ownedThemes: [],
      settings: {
        isPublic: true,
        allowMessages: 'all',
        notifications: {
          emails: true,
          push: true,
          mentions: true
        },
        theme: 'dark' as any,
        streaming: {
          defaultTitle: 'Tactical Feed',
          lowLatency: true,
          allowChat: true,
          showViewers: true
        }
      }
    };

    setStoredUser(mockUser);
    return mockUser;
  },

  // Signup operation
  signup: async (username: string, email: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, LATENCY));

    // Fix: Added missing properties (followers, following, blocked, settings) to satisfy User interface requirements
    const newUser: User = {
      id: 'u-' + Math.random().toString(36).substr(2, 9),
      username,
      email,
      avatar: `https://picsum.photos/seed/${username}/200/200`,
      tier: SubscriptionTier.FREE,
      codeBits: 500,
      stats: {
        rating: 1000,
        winRate: '0%',
        trophies: 0,
        tournaments: 0
      },
      preferences: [],
      bio: 'Identity manifest pending tactical analysis.',
      hasCompletedOnboarding: false,
      followers: [],
      following: [],
      blocked: [],
      settings: {
        isPublic: true,
        allowMessages: 'all',
        notifications: {
          emails: true,
          push: true,
          mentions: true
        },
        theme: 'dark' as any,
        streaming: {
          defaultTitle: 'Tactical Feed',
          lowLatency: true,
          allowChat: true,
          showViewers: true
        }
      },
      _id: 'u-' + Math.random().toString(36).substr(2, 9),
      inventory: [],
      isAdmin: false,
      currency: 'Ȼ',
      isEmailVerified: true,
      ownedThemes: []
    };

    setStoredUser(newUser);
    return newUser;
  },

  // Update profile / Complete onboarding
  updateUser: async (updates: Partial<User>): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const current = getStoredUser();
    if (!current) throw new Error('No session active');

    const updated = { ...current, ...updates };
    setStoredUser(updated);
    return updated;
  },

  // Logout
  logout: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setStoredUser(null);
  }
};
