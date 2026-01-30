import { User, Post, MarketplaceItem } from '../types';

export interface IBackendService {
    // Auth
    getCurrentUser(): Promise<User | null>;
    login(email: string, method: 'OAUTH' | 'PASSWORD', username?: string): Promise<User | any>;
    loginWithGoogle(token: string): Promise<User | any>;
    verifyEmail(email: string, code: string): Promise<User>;
    verifyAdmin(email: string, password: string): Promise<User>;
    verify2FA(email: string, code: string): Promise<User | any>;
    logout(): Promise<void>;

    // Social
    getUserById(userId: string): Promise<User | null>;
    searchUsers(query: string): Promise<User[]>;
    toggleFollow(currentUserId: string, targetUserId: string): Promise<{ user: User; target: User }>;

    // Interaction
    interactWithPost(postId: string, userId: string, action: 'LIKE' | 'VIEW' | 'GIFT', giftType?: string): Promise<Post>;

    // Profile
    updateUserProfile(userId: string, updates: Partial<User>): Promise<User>;
    onboard(userId: string, data: { archetype: string; bio: string; preferences: string[] }): Promise<User>;
    pushAuditLog(userId: string, entry: any): Promise<void>;
    getAuditLogs(userId: string): Promise<any[]>;
    uploadAsset(file: File, onProgress: (progress: number) => void): Promise<string>;
    getUserMedia(userId: string): Promise<any[]>;
    getUserAchievements(userId: string): Promise<any[]>;
    getUserNotifications(userId: string): Promise<any[]>;
    markNotificationRead(notificationId: string): Promise<any>;
    getActivities(): Promise<any[]>;
    getUserActivities(userId: string): Promise<any[]>;
    applyTheme(userId: string, themeId: string | null, slot?: string): Promise<User>;
    getStoreThemes(): Promise<any[]>;
    purchaseTheme(userId: string, themeId: string): Promise<User>;

    // Feed
    getGlobalPosts(): Promise<Post[]>;
    createPost(postData: Partial<Post>): Promise<Post>;
    getLeaderboard(): Promise<User[]>;
    getLiveUsers(): Promise<User[]>;
    getUserPosts(userId: string): Promise<Post[]>;

    // Streaming
    startStream(userId: string, metadata: { title: string, game: string, description: string, peerId?: string }): Promise<User>;
    stopStream(userId: string): Promise<User>;
    getStreamMessages(streamId: string): Promise<any[]>;
    postStreamMessage(streamId: string, senderId: string, senderName: string, content: string): Promise<any>;

    // Admin
    getAllUsers(adminId: string): Promise<User[]>;
    updateUserStatus(adminId: string, userId: string, status: 'active' | 'banned'): Promise<User>;
    getPlatformMetrics(adminId: string): Promise<any>;
    getReportedContent(): Promise<any[]>;
    getReports(): Promise<any[]>;
    resolveReport(reportId: string, action: 'BAN' | 'DISMISS', adminNotes?: string, banReason?: string): Promise<any>;

    // Marketplace
    buyItem(userId: string, item: MarketplaceItem): Promise<User>;

    // Tournaments
    getTournaments(): Promise<any[]>;
    getTournamentById(id: string): Promise<any>;
    registerForTournament(userId: string, tournamentId: string): Promise<User>;
    getMatches(tournamentId: string): Promise<any[]>;
    setMatchResult(matchId: string, winnerId: string, score: string): Promise<any>;

    // Messages
    getMessages(userId: string): Promise<any[]>;
    getConversations(): Promise<any[]>;
    getConversationMessages(conversationId: string): Promise<any[]>;
    sendMessage(messageData: any): Promise<any>;
    getNotifications(userId: string): Promise<any[]>;
}
