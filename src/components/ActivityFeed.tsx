import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { User as UserType } from '../types';

interface Activity {
    _id: string;
    userId: {
        _id: string;
        username: string;
        avatar: string;
        archetype: string;
    };
    type: 'THREAD_CREATED' | 'POST_CREATED' | 'CLAN_JOINED' | 'FOLLOW_STARTED' | 'ACHIEVEMENT_UNLOCKED' | 'MEDIA_CREATED';
    metadata: {
        targetId?: string;
        targetName?: string;
        contentPreview?: string;
        badgeType?: string;
        badgeName?: string;
        mediaType?: string;
    };
    createdAt: string;
}

interface ActivityFeedProps {
    userId?: string;
    title?: string;
    limit?: number;
    onNavigateProfile?: (userId: string) => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ userId, title = "Tactical_Feed", limit = 10, onNavigateProfile }) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'global' | 'following'>(userId ? 'following' : 'global');

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                let url = `http://localhost:5000/api/social/feed?limit=${limit}`;
                if (filter === 'following' && userId) url += `&userId=${userId}`;

                const response = await fetch(url);
                const data = await response.json();
                setActivities(data);
            } catch (err) {
                console.error('[FEED] Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();

        // Refresh every 60 seconds
        const interval = setInterval(fetchFeed, 60000);
        return () => clearInterval(interval);
    }, [userId, limit, filter]);

    const renderActivityIcon = (type: Activity['type']) => {
        switch (type) {
            case 'THREAD_CREATED': return { icon: 'Mic', color: 'text-primary' };
            case 'POST_CREATED': return { icon: 'MessageSquare', color: 'text-blue-400' };
            case 'CLAN_JOINED': return { icon: 'Users', color: 'text-amber-500' };
            case 'FOLLOW_STARTED': return { icon: 'Link', color: 'text-purple-400' };
            case 'ACHIEVEMENT_UNLOCKED': return { icon: 'Award', color: 'text-pink-400' };
            case 'MEDIA_CREATED': return { icon: 'PlayCircle', color: 'text-emerald-400' };
            default: return { icon: 'Zap', color: 'text-slate-400' };
        }
    };

    const renderActivityText = (act: Activity) => {
        const userSpan = (
            <span
                className="text-white font-bold cursor-pointer hover:text-primary transition-colors"
                onClick={() => onNavigateProfile?.(act.userId._id)}
            >
                {act.userId.username}
            </span>
        );

        switch (act.type) {
            case 'THREAD_CREATED':
                return <p className="text-sm text-slate-400">
                    {userSpan} initiated a new sector: <span className="text-primary">"{act.metadata.targetName}"</span>
                </p>;
            case 'POST_CREATED':
                return <p className="text-sm text-slate-400">
                    {userSpan} transmitted a response to <span className="text-blue-400 italic">"{act.metadata.contentPreview}..."</span>
                </p>;
            case 'CLAN_JOINED':
                return <p className="text-sm text-slate-400">
                    {userSpan} joined forces with <span className="text-amber-500 font-bold">[{act.metadata.targetName}]</span>
                </p>;
            case 'FOLLOW_STARTED':
                return <p className="text-sm text-slate-400">
                    {userSpan} established a link with <span className="text-purple-400 font-bold cursor-pointer hover:underline" onClick={() => act.metadata.targetId && onNavigateProfile?.(act.metadata.targetId)}>{act.metadata.targetName}</span>
                </p>;
            case 'ACHIEVEMENT_UNLOCKED':
                return <p className="text-sm text-slate-400">
                    {userSpan} earned the <span className="text-pink-400 font-black uppercase tracking-tighter">{act.metadata.badgeName}</span> badge
                </p>;
            case 'MEDIA_CREATED':
                return <p className="text-sm text-slate-400">
                    {userSpan} archived a new <span className="text-emerald-400 font-bold">{act.metadata.mediaType || 'highlight'}</span>: <span className="text-white italic">"{act.metadata.targetName}"</span>
                </p>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-orbitron font-black text-white uppercase tracking-[0.2em]">{title}</h3>
                {userId && (
                    <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/5">
                        <button
                            onClick={() => setFilter('global')}
                            className={`px-2 py-0.5 text-[8px] font-mono rounded uppercase transition-all ${filter === 'global' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}
                        >
                            Global
                        </button>
                        <button
                            onClick={() => setFilter('following')}
                            className={`px-2 py-0.5 text-[8px] font-mono rounded uppercase transition-all ${filter === 'following' ? 'bg-primary text-black' : 'text-slate-500 hover:text-white'}`}
                        >
                            Linked
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="py-10 flex justify-center">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="py-10 text-center border border-white/5 bg-black/20 rounded-2xl">
                        <p className="text-[10px] font-mono text-slate-600 uppercase">NO_SIGNALS_RECORDED</p>
                    </div>
                ) : (
                    activities.map(act => {
                        const style = renderActivityIcon(act.type);
                        return (
                            <div key={act._id} className="flex gap-4 group">
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center ${style.color} group-hover:scale-110 transition-transform`}>
                                        {getIcon(style.icon, 16)}
                                    </div>
                                    <div className="w-px flex-1 bg-white/5 group-last:hidden mt-2"></div>
                                </div>
                                <div className="flex-1 pb-6 group-last:pb-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div
                                            className="w-4 h-4 rounded-full overflow-hidden border border-white/10 shrink-0 cursor-pointer hover:border-primary transition-colors"
                                            onClick={() => onNavigateProfile?.(act.userId._id)}
                                        >
                                            <img src={act.userId.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500 uppercase">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    {renderActivityText(act)}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;
