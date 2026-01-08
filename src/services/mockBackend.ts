
import { User, SubscriptionTier, Post, UserSettings, MarketplaceItem } from '../types';

const STORAGE_KEY = 'native_codex_cloud_db';
const AUTH_SESSION_KEY = 'native_codex_auth_token';

const getCloudMesh = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { users: {}, posts: {}, marketplace: [], leaderboard: [] };
};

const syncToCloudMesh = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

import { IBackendService } from './IBackendService';

export const backendService: IBackendService = {
  // --- AUTH PROTOCOLS ---
  getCurrentUser: async (): Promise<User | null> => {
    await new Promise(r => setTimeout(r, 400));
    const session = localStorage.getItem(AUTH_SESSION_KEY);
    if (!session) return null;
    const mesh = getCloudMesh();
    return mesh.users[session] || null;
  },

  login: async (email: string, method: 'OAUTH' | 'PASSWORD', username?: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 800));
    const mesh = getCloudMesh();
    const userId = btoa(email);

    if (!mesh.users[userId]) {
      mesh.users[userId] = {
        id: userId,
        username: username || email.split('@')[0].toUpperCase(),
        email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        tier: SubscriptionTier.FREE,
        codeBits: 1000,
        stats: { rating: 1200, winRate: '0%', trophies: 0, tournaments: 0 },
        preferences: [],
        bio: 'Identity sync active. Welcome to the Nexus.',
        hasCompletedOnboarding: false,
        followers: [],
        following: [],
        blocked: [],
        settings: {
          isPublic: true,
          allowMessages: 'all',
          notifications: { emails: true, push: true, mentions: true },
          theme: 'dark'
        },
        audit_logs: [],
        inventory: []
      };
      syncToCloudMesh(mesh);
    }

    localStorage.setItem(AUTH_SESSION_KEY, userId);
    return mesh.users[userId];
  },

  verifyEmail: async (email: string, code: string): Promise<User> => {
    return backendService.login(email, 'PASSWORD'); // Mock verification success
  },

  logout: async () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
  },

  // --- SOCIAL PROTOCOLS ---
  getUserById: async (userId: string): Promise<User | null> => {
    const mesh = getCloudMesh();
    return mesh.users[userId] || null;
  },

  searchUsers: async (query: string): Promise<User[]> => {
    await new Promise(r => setTimeout(r, 300));
    const mesh = getCloudMesh();
    const users = Object.values(mesh.users) as User[];
    if (!query) return users.slice(0, 10);
    return users.filter(u =>
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.bio.toLowerCase().includes(query.toLowerCase())
    );
  },

  toggleFollow: async (currentUserId: string, targetUserId: string): Promise<{ user: User; target: User }> => {
    await new Promise(r => setTimeout(r, 400));
    const mesh = getCloudMesh();
    const user = mesh.users[currentUserId];
    const target = mesh.users[targetUserId];

    if (!user || !target) throw new Error("ENTITY_NOT_FOUND");

    const isFollowing = user.following.includes(targetUserId);

    if (isFollowing) {
      user.following = user.following.filter((id: string) => id !== targetUserId);
      target.followers = target.followers.filter((id: string) => id !== currentUserId);
    } else {
      user.following.push(targetUserId);
      target.followers.push(currentUserId);
    }

    syncToCloudMesh(mesh);
    return { user, target };
  },

  // --- INTERACTION PROTOCOLS ---
  interactWithPost: async (postId: string, userId: string, action: 'LIKE' | 'VIEW' | 'GIFT', giftType?: string): Promise<Post> => {
    const mesh = getCloudMesh();
    if (!mesh.posts) mesh.posts = {};

    let post = mesh.posts[postId];
    // If post doesn't exist in simulation, create a dummy for interaction
    if (!post) {
      post = {
        id: postId,
        likes: [],
        views: 0,
        gifts: [],
        timestamp: new Date().toISOString()
      };
      mesh.posts[postId] = post;
    }

    if (action === 'LIKE') {
      if (post.likes.includes(userId)) {
        post.likes = post.likes.filter((id: string) => id !== userId);
      } else {
        post.likes.push(userId);
      }
    } else if (action === 'VIEW') {
      post.views += 1;
    } else if (action === 'GIFT' && giftType) {
      const user = mesh.users[userId];
      const cost = 100; // Mock gift cost
      if (user.codeBits < cost) throw new Error("INSUFFICIENT_FUNDS");
      user.codeBits -= cost;
      post.gifts.push({ from: userId, type: giftType, amount: cost });
    }

    syncToCloudMesh(mesh);
    return post;
  },

  // --- PROFILE/SETTINGS PROTOCOLS ---
  updateUserProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
    const mesh = getCloudMesh();
    mesh.users[userId] = { ...mesh.users[userId], ...updates };
    syncToCloudMesh(mesh);
    return mesh.users[userId];
  },

  pushAuditLog: async (userId: string, entry: any) => {
    const mesh = getCloudMesh();
    if (mesh.users[userId]) {
      if (!mesh.users[userId].audit_logs) mesh.users[userId].audit_logs = [];
      mesh.users[userId].audit_logs.unshift(entry);
      syncToCloudMesh(mesh);
    }
  },

  getAuditLogs: async (userId: string) => {
    const mesh = getCloudMesh();
    return mesh.users[userId]?.audit_logs || [];
  },

  uploadAsset: async (file: File, onProgress: (progress: number) => void): Promise<string> => {
    let progress = 0;
    while (progress < 100) {
      await new Promise(r => setTimeout(r, 100));
      progress += 20;
      onProgress(progress);
    }
    return `cloud-storage://${file.name}`;
  },

  // --- FEED & DISCOVERY PROTOCOLS ---
  getGlobalPosts: async (): Promise<Post[]> => {
    const mesh = getCloudMesh();
    return Object.values(mesh.posts || {}) as Post[];
  },

  createPost: async (postData: Partial<Post>): Promise<Post> => {
    const mesh = getCloudMesh();
    const postId = 'p-' + Math.random().toString(36).substr(2, 9);
    const post: Post = {
      id: postId,
      authorId: postData.authorId || 'unknown',
      authorName: postData.authorName || 'Anonymous',
      authorAvatar: postData.authorAvatar || '',
      title: postData.title || '',
      content: postData.content || '',
      thumbnail: postData.thumbnail || '',
      likes: [],
      views: 0,
      gifts: [],
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...postData
    } as Post;

    if (!mesh.posts) mesh.posts = {};
    mesh.posts[postId] = post;
    syncToCloudMesh(mesh);
    return post;
  },

  getLeaderboard: async (): Promise<User[]> => {
    const mesh = getCloudMesh();
    return Object.values(mesh.users || {}) as User[];
  },

  getLiveUsers: async (): Promise<User[]> => {
    const mesh = getCloudMesh();
    const users = Object.values(mesh.users || {}) as User[];
    return users.filter(u => u.isLive);
  },

  // --- STREAMING ---
  startStream: async (userId: string, metadata: { title: string, game: string, description: string, peerId?: string }): Promise<User> => {
    const mesh = getCloudMesh();
    const user = mesh.users[userId];
    if (!user) throw new Error("USER_NOT_FOUND");

    user.isLive = true;
    user.streamTitle = metadata.title;
    user.streamGame = metadata.game;
    user.streamDescription = metadata.description;

    syncToCloudMesh(mesh);
    return user;
  },

  stopStream: async (userId: string): Promise<User> => {
    const mesh = getCloudMesh();
    const user = mesh.users[userId];
    if (!user) throw new Error("USER_NOT_FOUND");

    user.isLive = false;
    user.streamTitle = undefined;
    syncToCloudMesh(mesh);
    return user;
  },

  // --- ADMIN PROTOCOLS ---
  getAllUsers: async (adminId: string): Promise<User[]> => {
    const mesh = getCloudMesh();
    return Object.values(mesh.users || {}) as User[];
  },

  updateUserStatus: async (adminId: string, userId: string, status: 'active' | 'banned'): Promise<User> => {
    // Mock status update
    const mesh = getCloudMesh();
    return mesh.users[userId];
  },

  getPlatformMetrics: async (adminId: string) => {
    return {
      totalUsers: 100,
      activeStreams: 5,
      revenue: 50000
    };
  },

  getReportedContent: async () => {
    return [];
  },

  // --- MARKETPLACE PROTOCOLS ---
  buyItem: async (userId: string, item: MarketplaceItem): Promise<User> => {
    const mesh = getCloudMesh();
    const user = mesh.users[userId];
    if (!user) throw new Error("USER_NOT_FOUND");

    if (user.codeBits < item.price) throw new Error("INSUFFICIENT_FUNDS");

    user.codeBits -= item.price;
    if (!user.inventory) user.inventory = [];
    user.inventory.push(item.id);

    syncToCloudMesh(mesh);
    return user;
  },

  getUserPosts: async (userId: string): Promise<Post[]> => {
    const mesh = getCloudMesh();
    const posts = Object.values(mesh.posts || {}) as Post[];
    return posts.filter(p => p.authorId === userId);
  },

  // --- TOURNAMENT PROTOCOLS ---
  getTournaments: async () => {
    return [];
  },

  getTournamentById: async (id: string) => {
    return null;
  },

  registerForTournament: async (userId: string, tournamentId: string): Promise<User> => {
    const mesh = getCloudMesh();
    const user = mesh.users[userId];
    if (!user) throw new Error("USER_NOT_FOUND");

    if (!user.registeredTournaments) user.registeredTournaments = [];
    if (user.registeredTournaments.includes(tournamentId)) return user; // Already registered

    user.registeredTournaments.push(tournamentId);
    user.stats.tournaments += 1;
    syncToCloudMesh(mesh);
    return user;
  },

  getMatches: async (tournamentId: string) => {
    return [];
  },

  setMatchResult: async (matchId: string, winnerId: string, score: string) => {
    return { success: true };
  },

  // --- MESSAGE PROTOCOLS ---
  getMessages: async (userId: string) => {
    return [
      { id: 'm1', sender: 'System_Core', content: 'Welcome to the platform.', timestamp: new Date().toISOString() }
    ];
  },

  getConversations: async () => {
    return [];
  },

  getConversationMessages: async (conversationId: string) => {
    return [];
  },

  sendMessage: async (messageData: any) => {
    // In a real app, store this. For now, just return success.
    return { success: true, timestamp: new Date().toISOString() };
  },

  getStreamMessages: async (streamId: string) => {
    return [];
  },

  postStreamMessage: async (streamId: string, senderId: string, senderName: string, content: string) => {
    return { id: Math.random().toString(), senderId, senderName, content, timestamp: new Date().toISOString() };
  },

  getNotifications: async (userId: string) => {
    return [
      { id: 'n1', title: 'Welcome', message: 'You have initialized the Nexus.', read: false }
    ];
  }
};
