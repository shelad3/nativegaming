import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { User } from '../types';

interface NotificationCenterProps {
    user: User;
    onClose: () => void;
}

interface Notification {
    _id: string;
    userId: string;
    type: 'FOLLOW' | 'LIKE' | 'COMMENT' | 'TOURNAMENT' | 'ACHIEVEMENT' | 'SYSTEM';
    fromUser?: string;
    content: string;
    read: boolean;
    createdAt: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        fetchNotifications();
    }, [user.id]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await backendService.getUserNotifications(user.id);
            setNotifications(data);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await backendService.markNotificationRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
            );
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
            await Promise.all(unreadIds.map(id => backendService.markNotificationRead(id)));
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'FOLLOW': return { icon: 'UserPlus', color: 'text-blue-400' };
            case 'LIKE': return { icon: 'Heart', color: 'text-red-400' };
            case 'COMMENT': return { icon: 'MessageCircle', color: 'text-green-400' };
            case 'TOURNAMENT': return { icon: 'Trophy', color: 'text-yellow-400' };
            case 'ACHIEVEMENT': return { icon: 'Award', color: 'text-purple-400' };
            case 'SYSTEM': return { icon: 'Bell', color: 'text-slate-400' };
            default: return { icon: 'Info', color: 'text-slate-400' };
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                {getIcon('Bell', 24)}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">Notifications</h2>
                                {unreadCount > 0 && (
                                    <p className="text-xs text-slate-400">{unreadCount} unread</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
                        >
                            {getIcon('X', 20)}
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${filter === 'all'
                                ? 'bg-primary text-black'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${filter === 'unread'
                                ? 'bg-primary text-black'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            Unread {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
                        </button>
                    </div>
                </div>

                {/* Actions */}
                {unreadCount > 0 && (
                    <div className="px-6 py-3 border-b border-white/10 bg-white/5">
                        <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-primary hover:text-emerald-400 font-semibold transition-colors flex items-center gap-1"
                        >
                            {getIcon('CheckCircle', 14)} Mark all as read
                        </button>
                    </div>
                )}

                {/* Notifications List */}
                <div className="max-h-[600px] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-4xl mb-4">🔔</div>
                            <p className="text-slate-400 text-sm">
                                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredNotifications.map((notification) => {
                                const { icon, color } = getNotificationIcon(notification.type);
                                return (
                                    <div
                                        key={notification._id}
                                        className={`p-4 transition-colors cursor-pointer group ${!notification.read
                                            ? 'bg-primary/5 hover:bg-primary/10'
                                            : 'hover:bg-white/5'
                                            }`}
                                        onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 ${color}`}>
                                                {getIcon(icon as any, 20)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-relaxed ${!notification.read ? 'text-white font-medium' : 'text-slate-300'
                                                    }`}>
                                                    {notification.content}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {formatTimestamp(notification.createdAt)}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="p-4 border-t border-white/10 bg-slate-800/50">
                        <button
                            onClick={fetchNotifications}
                            className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            {getIcon('RefreshCw', 16)} Refresh
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;
