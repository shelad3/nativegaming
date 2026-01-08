import { IBackendService } from './IBackendService';
import { User, Post, MarketplaceItem, SubscriptionTier } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';
const AUTH_SESSION_KEY = 'native_codex_auth_token';

// Helper for authenticated requests
const getHeaders = () => {
    const userId = localStorage.getItem(AUTH_SESSION_KEY);
    return {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-user-id': userId } : {})
    };
};

export const realBackend: IBackendService = {
    // --- AUTH ---
    getCurrentUser: async (): Promise<User | null> => {
        const userId = localStorage.getItem(AUTH_SESSION_KEY);
        if (!userId) return null;
        try {
            const resp = await fetch(`${API_BASE_URL}/users/${userId}`);
            if (!resp.ok) return null;
            const user = await resp.json();
            return { ...user, id: user._id };
        } catch {
            return null;
        }
    },

    login: async (email: string, method: 'OAUTH' | 'PASSWORD', username?: string): Promise<User> => {
        const resp = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, authProvider: method })
        });
        if (!resp.ok) throw new Error("AUTH_FAILURE");
        const user = await resp.json();
        const mappedUser = { ...user, id: user._id };
        localStorage.setItem(AUTH_SESSION_KEY, mappedUser.id);
        return mappedUser;
    },

    verifyEmail: async (email: string, code: string): Promise<User> => {
        const resp = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        if (!resp.ok) throw new Error("VERIFICATION_FAILURE");
        const user = await resp.json();
        return { ...user, id: user._id };
    },

    logout: async () => {
        localStorage.removeItem(AUTH_SESSION_KEY);
    },

    // --- SOCIAL ---
    getUserById: async (userId: string): Promise<User | null> => {
        const resp = await fetch(`${API_BASE_URL}/users/${userId}`);
        if (!resp.ok) return null;
        const user = await resp.json();
        if (!user) return null;
        return { ...user, id: user._id };
    },

    searchUsers: async (query: string): Promise<User[]> => {
        const resp = await fetch(`${API_BASE_URL}/users?query=${query}`);
        const users = await resp.json();
        return users.map((u: any) => ({ ...u, id: u._id }));
    },

    toggleFollow: async (currentUserId: string, targetUserId: string): Promise<{ user: User; target: User }> => {
        const resp = await fetch(`${API_BASE_URL}/social/follow`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ currentUserId, targetUserId })
        });
        if (!resp.ok) throw new Error("SOCIAL_FAILURE");
        const data = await resp.json();
        return {
            user: { ...data.user, id: data.user._id },
            target: { ...data.target, id: data.target._id }
        };
    },

    // --- CONTENT ---
    interactWithPost: async (postId: string, userId: string, action: 'LIKE' | 'VIEW' | 'GIFT', giftType?: string): Promise<Post> => {
        const resp = await fetch(`${API_BASE_URL}/posts/${postId}/interact`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, action, giftType })
        });
        const post = await resp.json();
        return { ...post, id: post._id };
    },

    updateUserProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
        const resp = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(updates)
        });
        const user = await resp.json();
        return { ...user, id: user._id };
    },

    pushAuditLog: async (userId: string, entry: any) => {
        await fetch(`${API_BASE_URL}/users/${userId}/audit`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ entry })
        });
    },

    getAuditLogs: async (userId: string) => {
        // Fetched via user object usually, but let's re-fetch user
        const user = await realBackend.getUserById(userId);
        return user?.audit_logs || [];
    },

    uploadAsset: async (file: File, onProgress: (progress: number) => void): Promise<string> => {
        // Mock upload for now as server doesn't have file upload route
        let progress = 0;
        while (progress < 100) {
            await new Promise(r => setTimeout(r, 100));
            progress += 20;
            onProgress(progress);
        }
        return `https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&q=80&w=800&file=${file.name}`;
    },

    getGlobalPosts: async (): Promise<Post[]> => {
        const resp = await fetch(`${API_BASE_URL}/posts`);
        const posts = await resp.json();
        return posts.map((p: any) => ({ ...p, id: p._id }));
    },

    createPost: async (postData: Partial<Post>): Promise<Post> => {
        const resp = await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(postData)
        });
        const post = await resp.json();
        return { ...post, id: post._id };
    },

    getLeaderboard: async (): Promise<User[]> => {
        const resp = await fetch(`${API_BASE_URL}/leaderboard`);
        const users = await resp.json();
        return users.map((u: any) => ({ ...u, id: u._id }));
    },

    getLiveUsers: async (): Promise<User[]> => {
        const resp = await fetch(`${API_BASE_URL}/users/live`);
        const users = await resp.json();
        return users.map((u: any) => ({ ...u, id: u._id }));
    },

    getUserPosts: async (userId: string): Promise<Post[]> => {
        const resp = await fetch(`${API_BASE_URL}/users/${userId}/posts`);
        const posts = await resp.json();
        return posts.map((p: any) => ({ ...p, id: p._id }));
    },

    // --- STREAMING ---
    startStream: async (userId: string, metadata: { title: string, game: string, description: string, peerId?: string }): Promise<User> => {
        const resp = await fetch(`${API_BASE_URL}/streams/start`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, ...metadata })
        });
        const user = await resp.json();
        return { ...user, id: user._id };
    },

    stopStream: async (userId: string): Promise<User> => {
        const resp = await fetch(`${API_BASE_URL}/streams/stop`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId })
        });
        const user = await resp.json();
        return { ...user, id: user._id };
    },

    getStreamMessages: async (streamId: string): Promise<any[]> => {
        const resp = await fetch(`${API_BASE_URL}/streams/${streamId}/messages`);
        return await resp.json();
    },

    postStreamMessage: async (streamId: string, senderId: string, senderName: string, content: string): Promise<any> => {
        const resp = await fetch(`${API_BASE_URL}/streams/${streamId}/messages`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ senderId, senderName, content })
        });
        return await resp.json();
    },

    // --- ADMIN ---
    getAllUsers: async (adminId: string): Promise<User[]> => {
        const resp = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: getHeaders()
        });
        if (!resp.ok) {
            console.error("Failed to fetch users");
            return [];
        }
        const users = await resp.json();
        return users.map((u: any) => ({ ...u, id: u._id }));
    },

    updateUserStatus: async (adminId: string, userId: string, status: 'active' | 'banned'): Promise<User> => {
        const resp = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ status })
        });
        const user = await resp.json();
        return { ...user, id: user._id };
    },

    getPlatformMetrics: async (adminId: string): Promise<any> => {
        const resp = await fetch(`${API_BASE_URL}/admin/metrics`, {
            headers: getHeaders()
        });
        if (!resp.ok) return null;
        return await resp.json();
    },

    getReportedContent: async (): Promise<any[]> => {
        return []; // Not implemented in backend yet
    },

    // --- MARKETPLACE ---
    buyItem: async (userId: string, item: MarketplaceItem): Promise<User> => {
        const resp = await fetch(`${API_BASE_URL}/marketplace/purchase`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, itemId: item.id, price: item.price })
        });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || "PURCHASE_FAILED");
        }
        const user = await resp.json();
        return { ...user, id: user._id };
    },

    // --- TOURNAMENTS ---
    getTournaments: async (): Promise<any[]> => {
        const resp = await fetch(`${API_BASE_URL}/tournaments`);
        return await resp.json();
    },

    getTournamentById: async (id: string): Promise<any> => {
        const resp = await fetch(`${API_BASE_URL}/tournaments/${id}`);
        return await resp.json();
    },

    registerForTournament: async (userId: string, tournamentId: string): Promise<User> => {
        const resp = await fetch(`${API_BASE_URL}/tournaments/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, tournamentId })
        });

        if (!resp.ok) {
            try {
                const err = await resp.json();
                throw new Error(err.error || "TOURNAMENT_REGISTRATION_FAILED");
            } catch {
                throw new Error("TOURNAMENT_REGISTRATION_FAILED");
            }
        }
        const user = await resp.json();
        return { ...user, id: user._id };
    },

    getMatches: async (tournamentId: string): Promise<any[]> => {
        const resp = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/matches`);
        return await resp.json();
    },

    setMatchResult: async (matchId: string, winnerId: string, score: string): Promise<any> => {
        const resp = await fetch(`${API_BASE_URL}/matches/${matchId}/result`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ winnerId, score })
        });
        return await resp.json();
    },

    // --- MESSAGES ---
    getMessages: async (userId: string): Promise<any[]> => {
        const resp = await fetch(`${API_BASE_URL}/messages/${userId}`);
        return await resp.json();
    },

    getConversations: async (): Promise<any[]> => {
        const resp = await fetch(`${API_BASE_URL}/conversations`, {
            headers: getHeaders()
        });
        return await resp.json();
    },

    getConversationMessages: async (conversationId: string): Promise<any[]> => {
        const resp = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
            headers: getHeaders()
        });
        return await resp.json();
    },

    sendMessage: async (messageData: any): Promise<any> => {
        const resp = await fetch(`${API_BASE_URL}/messages`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(messageData)
        });
        return await resp.json();
    },

    getNotifications: async (userId: string): Promise<any[]> => {
        const resp = await fetch(`${API_BASE_URL}/notifications/${userId}`);
        return await resp.json();
    }
};
