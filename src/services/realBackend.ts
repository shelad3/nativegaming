import { IBackendService } from './IBackendService';
import { User, Post, MarketplaceItem } from '../types';
import { api, setAuthToken, clearAuthToken } from './api';

export const realBackend: IBackendService = {
    // --- AUTH ---
    getCurrentUser: async (): Promise<User | null> => {
        try {
            const resp = await api.get('/auth/me');
            const user = resp.data;
            return { ...user, id: user._id };
        } catch (err) {
            // If 401 or network error, user is not logged in or session expired
            return null;
        }
    },

    login: async (email: string, method: 'OAUTH' | 'PASSWORD', username?: string): Promise<User | any> => {
        // This is primarily for the DEV login route
        const resp = await api.post('/auth/login', { email, username, authProvider: method });

        if (resp.data.token) {
            const { token, ...user } = resp.data;
            setAuthToken(token);
            return { ...user, id: user._id };
        }
        return resp.data;
    },

    // Google Login adapter
    loginWithGoogle: async (idToken: string): Promise<User | any> => {
        const resp = await api.post('/auth/google', { token: idToken });
        // Check if we got a token or a requirement
        if (resp.data.token) {
            const { token, ...user } = resp.data;
            setAuthToken(token);
            return { ...user, id: user._id };
        }
        return resp.data; // Returns { require2FA: true, email... } or { requireAdminAuth: true... }
    },

    verifyAdmin: async (email: string, password: string): Promise<User> => {
        const resp = await api.post('/auth/verify-admin', { email, password });
        const { token, ...user } = resp.data;
        setAuthToken(token);
        return { ...user, id: user._id };
    },

    verify2FA: async (email: string, code: string): Promise<User | any> => {
        const resp = await api.post('/auth/verify-2fa', { email, code });
        if (resp.data.token) {
            const { token, ...user } = resp.data;
            setAuthToken(token);
            return { ...user, id: user._id };
        }
        return resp.data;
    },

    verifyEmail: async (email: string, code: string): Promise<User> => {
        const resp = await api.post('/auth/verify', { email, code });
        return { ...resp.data, id: resp.data._id };
    },

    logout: async () => {
        clearAuthToken();
    },

    // --- SOCIAL ---
    getUserById: async (userId: string): Promise<User | null> => {
        try {
            const resp = await api.get(`/users/${userId}`);
            return { ...resp.data, id: resp.data._id };
        } catch {
            return null;
        }
    },

    searchUsers: async (query: string): Promise<User[]> => {
        const resp = await api.get(`/users?query=${query}`);
        return resp.data.map((u: any) => ({ ...u, id: u._id }));
    },

    toggleFollow: async (currentUserId: string, targetUserId: string): Promise<{ user: User; target: User }> => {
        // Updated backend route expects { targetUserId } and gets current from token
        // But legacy signature passed currentUserId. We can ignore it if we use token.
        const resp = await api.post('/users/follow', { targetUserId });
        const data = resp.data;
        return {
            user: { ...data.user, id: data.user._id },
            target: { ...data.target, id: data.target._id }
        };
    },

    // --- CONTENT ---
    interactWithPost: async (postId: string, userId: string, action: 'LIKE' | 'VIEW' | 'GIFT', giftType?: string): Promise<Post> => {
        const resp = await api.post(`/posts/${postId}/interact`, { userId, action, giftType });
        return { ...resp.data, id: resp.data._id };
    },

    updateUserProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
        const resp = await api.patch(`/users/${userId}`, updates);
        return { ...resp.data, id: resp.data._id };
    },

    onboard: async (userId: string, data: any): Promise<User> => {
        const resp = await api.post('/users/onboard', data);
        return { ...resp.data, id: resp.data._id };
    },

    pushAuditLog: async (userId: string, entry: any) => {
        await api.post(`/users/${userId}/audit`, { entry });
    },

    getAuditLogs: async (userId: string) => {
        const resp = await api.get(`/users/${userId}`);
        return resp.data.audit_logs || [];
    },

    getUserMedia: async (userId: string): Promise<any[]> => {
        const resp = await api.get(`/users/${userId}/media`);
        return resp.data;
    },

    getUserAchievements: async (userId: string): Promise<any[]> => {
        const resp = await api.get(`/users/${userId}/achievements`);
        return resp.data;
    },

    getUserNotifications: async (userId: string): Promise<any[]> => {
        const resp = await api.get(`/users/${userId}/notifications`);
        return resp.data;
    },

    markNotificationRead: async (notificationId: string): Promise<any> => {
        const resp = await api.patch(`/users/notifications/${notificationId}/read`);
        return resp.data;
    },

    getActivities: async (): Promise<any[]> => {
        const resp = await api.get('/activities');
        return resp.data;
    },

    getUserActivities: async (userId: string): Promise<any[]> => {
        const resp = await api.get(`/activities/user/${userId}`);
        return resp.data;
    },

    applyTheme: async (userId: string, themeId: string | null, slot?: string): Promise<User> => {
        // Use the route in themes.ts which is mounted at /api
        const resp = await api.post('/user/apply-theme', { userId, themeId, slot });
        return { ...resp.data, id: resp.data._id };
    },

    getStoreThemes: async (): Promise<any[]> => {
        const resp = await api.get('/store/themes');
        return resp.data;
    },

    purchaseTheme: async (userId: string, themeId: string): Promise<User> => {
        const resp = await api.post('/store/purchase-theme', { userId, themeId });
        return { ...resp.data, id: resp.data._id };
    },

    uploadAsset: async (file: File, onProgress: (progress: number) => void): Promise<string> => {
        try {
            // Import the upload service
            const { uploadToFirebase } = await import('./fileUpload');

            // Get current user ID from token (you might need to adjust this based on your auth implementation)
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Not authenticated');
            }

            // Decode token to get user ID (simplified - you might want to use jwt-decode)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId || payload.id;

            // Upload to Firebase Storage
            const result = await uploadToFirebase(
                file,
                `users/${userId}/uploads`,
                file.name,
                { onProgress }
            );

            return result.downloadURL;
        } catch (error: any) {
            console.error('Upload failed:', error);
            throw new Error(`Upload failed: ${error.message}`);
        }
    },

    getGlobalPosts: async (): Promise<Post[]> => {
        const resp = await api.get('/posts');
        return resp.data.map((p: any) => ({ ...p, id: p._id }));
    },

    createPost: async (postData: Partial<Post>): Promise<Post> => {
        const resp = await api.post('/posts', postData);
        return { ...resp.data, id: resp.data._id };
    },

    getLeaderboard: async (): Promise<User[]> => {
        const resp = await api.get('/leaderboard');
        return resp.data.map((u: any) => ({ ...u, id: u._id }));
    },

    getLiveUsers: async (): Promise<User[]> => {
        const resp = await api.get('/users/live');
        return resp.data.map((u: any) => ({ ...u, id: u._id }));
    },

    getUserPosts: async (userId: string): Promise<Post[]> => {
        const resp = await api.get(`/users/${userId}/posts`);
        return resp.data.map((p: any) => ({ ...p, id: p._id }));
    },

    // --- STREAMING ---
    startStream: async (userId: string, metadata: { title: string, game: string, description: string, peerId?: string }): Promise<User> => {
        const resp = await api.post('/streams/start', { userId, ...metadata });
        return { ...resp.data, id: resp.data._id };
    },

    stopStream: async (userId: string): Promise<User> => {
        const resp = await api.post('/streams/stop', { userId });
        return { ...resp.data, id: resp.data._id };
    },

    getStreamMessages: async (streamId: string): Promise<any[]> => {
        try {
            const resp = await api.get(`/streams/${streamId}/messages`);
            return resp.data;
        } catch { return []; }
    },

    postStreamMessage: async (streamId: string, senderId: string, senderName: string, content: string): Promise<any> => {
        const resp = await api.post(`/streams/${streamId}/messages`, { senderId, senderName, content });
        return resp.data;
    },

    // --- ADMIN ---
    getAllUsers: async (adminId: string): Promise<User[]> => {
        const resp = await api.get('/admin/users');
        return resp.data.map((u: any) => ({ ...u, id: u._id }));
    },

    updateUserStatus: async (adminId: string, userId: string, status: 'active' | 'banned'): Promise<User> => {
        const resp = await api.patch(`/admin/users/${userId}/status`, { status });
        return { ...resp.data, id: resp.data._id };
    },

    getPlatformMetrics: async (adminId: string): Promise<any> => {
        try {
            const resp = await api.get('/admin/metrics');
            return resp.data;
        } catch { return null; }
    },

    getReportedContent: async (): Promise<any[]> => {
        return [];
    },

    getReports: async (): Promise<any[]> => {
        const resp = await api.get('/admin/reports');
        return resp.data;
    },

    resolveReport: async (reportId: string, action: 'BAN' | 'DISMISS', adminNotes?: string, banReason?: string): Promise<any> => {
        const resp = await api.post('/admin/resolve-report', { reportId, action, adminNotes, banReason });
        return resp.data;
    },

    // --- MARKETPLACE ---
    buyItem: async (userId: string, item: MarketplaceItem): Promise<User> => {
        const resp = await api.post('/marketplace/purchase', { userId, itemId: item.id, price: item.price });
        return { ...resp.data, id: resp.data._id };
    },

    // --- TOURNAMENTS ---
    getTournaments: async (): Promise<any[]> => {
        const resp = await api.get('/tournaments');
        return resp.data;
    },

    getTournamentById: async (id: string): Promise<any> => {
        const resp = await api.get(`/tournaments/${id}`);
        return resp.data;
    },

    registerForTournament: async (userId: string, tournamentId: string): Promise<User> => {
        const resp = await api.post('/tournaments/register', { userId, tournamentId });
        return { ...resp.data, id: resp.data._id };
    },

    getMatches: async (tournamentId: string): Promise<any[]> => {
        const resp = await api.get(`/tournaments/${tournamentId}/matches`);
        return resp.data;
    },

    setMatchResult: async (matchId: string, winnerId: string, score: string): Promise<any> => {
        const resp = await api.post(`/matches/${matchId}/result`, { winnerId, score });
        return resp.data;
    },

    // --- MESSAGES ---
    getMessages: async (userId: string): Promise<any[]> => {
        try {
            // Updated to conversations if that's what the backend provides, 
            // or we add a specific message fetcher. For now, matching the mount.
            const resp = await api.get('/messages/conversations', {
                headers: { 'x-user-id': userId }
            });
            return resp.data;
        } catch { return []; }
    },

    getConversations: async (): Promise<any[]> => {
        const resp = await api.get('/conversations');
        return resp.data;
    },

    getConversationMessages: async (conversationId: string): Promise<any[]> => {
        const resp = await api.get(`/conversations/${conversationId}/messages`);
        return resp.data;
    },

    sendMessage: async (messageData: any): Promise<any> => {
        const resp = await api.post('/messages', messageData);
        return resp.data;
    },

    getNotifications: async (userId: string): Promise<any[]> => {
        const resp = await api.get(`/messages/notifications/${userId}`);
        return resp.data;
    }
};
