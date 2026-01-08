import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { User as UserType } from '../types';
import CreateThreadModal from './CreateThreadModal';

interface ForumsProps {
    user: UserType;
    onViewThread: (threadId: string) => void;
}

interface Category {
    _id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    isAdminOnly: boolean;
}

interface Thread {
    _id: string;
    title: string;
    authorName: string;
    authorAvatar: string;
    authorClanTag?: string;
    categoryId: string;
    isPinned: boolean;
    isLocked: boolean;
    stats: {
        views: number;
        replyCount: number;
        upvotes: string[];
    };
    lastActivity: string;
    createdAt: string;
}

const Forums: React.FC<ForumsProps> = ({ user, onViewThread }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchThreads();
    }, [selectedCategory]);

    const fetchCategories = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/forums/categories');
            const data = await response.json();
            setCategories(data);
        } catch (err) {
            console.error('[FORUM] Category fetch error:', err);
        }
    };

    const fetchThreads = async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:5000/api/forums/threads';
            if (selectedCategory) url += `?categoryId=${selectedCategory}`;
            const response = await fetch(url);
            const data = await response.json();
            setThreads(data);
        } catch (err) {
            console.error('[FORUM] Thread fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderCategoryList = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(cat => (
                <div
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)}
                    className="glass rounded-3xl border border-white/5 p-6 hover:border-white/10 transition-all cursor-pointer group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                            {getIcon(cat.icon, 24)}
                        </div>
                        <div>
                            <h3 className="text-lg font-orbitron font-black text-white group-hover:text-primary transition-colors">{cat.name}</h3>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Active_Zone</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-400 font-mono leading-relaxed">{cat.description}</p>
                    {cat.isAdminOnly && (
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase">
                            {getIcon('ShieldCheck', 12)}
                            Secure Feed
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    const renderThreadList = () => {
        const currentCategory = categories.find(c => c._id === selectedCategory);
        return (
            <div className="space-y-6">
                {/* Thread Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all"
                        >
                            {getIcon('ChevronLeft', 20)}
                        </button>
                        <div>
                            <h2 className="text-2xl font-orbitron font-black text-white uppercase">{currentCategory?.name}</h2>
                            <p className="text-[10px] font-mono text-slate-500">Transmission Log // Sector_{selectedCategory?.slice(-4)}</p>
                        </div>
                    </div>
                    {(!currentCategory?.isAdminOnly || user.isAdmin) && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-primary text-black font-orbitron font-black text-xs rounded-xl uppercase hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            {getIcon('Plus', 16)}
                            New Thread
                        </button>
                    )}
                </div>

                {/* Search & Sort */}
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search sector comms..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 pl-12 font-mono text-sm text-white outline-none focus:border-primary transition-all"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                            {getIcon('Search', 18)}
                        </div>
                    </div>
                </div>

                {/* Threads */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="glass rounded-3xl p-20 text-center border border-white/5">
                            <p className="text-slate-500 font-mono text-sm italic">No active signals detected in this sector.</p>
                        </div>
                    ) : (
                        threads.map(thread => (
                            <div
                                key={thread._id}
                                onClick={() => onViewThread(thread._id)}
                                className="glass rounded-2xl border border-white/5 p-5 hover:border-primary/30 transition-all cursor-pointer group flex items-center gap-6"
                            >
                                {/* Thread Icon/Stats */}
                                <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-black/40 border border-white/5 shrink-0">
                                    <p className="text-lg font-black text-primary font-orbitron">{thread.stats.upvotes.length}</p>
                                    <p className="text-[8px] font-mono text-slate-500 uppercase">Votes</p>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        {thread.isPinned && (
                                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded uppercase flex items-center gap-1 border border-blue-500/30">
                                                {getIcon('Bookmark', 10)}
                                                Pinned
                                            </span>
                                        )}
                                        {thread.isLocked && (
                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded uppercase flex items-center gap-1 border border-red-500/30">
                                                {getIcon('Lock', 10)}
                                                Locked
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors truncate">{thread.title}</h3>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 shrink-0">
                                                <img src={thread.authorAvatar} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400">{thread.authorName}</span>
                                        </div>
                                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                        <span className="text-[10px] font-mono text-slate-500 uppercase">{new Date(thread.lastActivity).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Replies/Views */}
                                <div className="hidden sm:flex items-center gap-6 shrink-0 pr-4">
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-white">{thread.stats.replyCount}</p>
                                        <p className="text-[9px] font-mono text-slate-500 uppercase">Replies</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-300">{thread.stats.views}</p>
                                        <p className="text-[9px] font-mono text-slate-500 uppercase">Views</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            {/* Header */}
            {!selectedCategory && (
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter">Community_Hub</h2>
                        <p className="text-sm font-mono text-slate-500 mt-2">Secure long-form comms for the NativeCodeX elite</p>
                    </div>
                </div>
            )}

            {/* Content Swapper */}
            {!selectedCategory ? renderCategoryList() : renderThreadList()}

            {/* Create Thread Modal */}
            {showCreateModal && selectedCategory && (
                <CreateThreadModal
                    user={user}
                    categoryId={selectedCategory}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(threadId) => {
                        setShowCreateModal(false);
                        onViewThread(threadId);
                    }}
                />
            )}
        </div>
    );
};

export default Forums;
