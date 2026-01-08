import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { User as UserType } from '../types';

interface ForumThreadViewProps {
    user: UserType;
    threadId: string;
    onBack: () => void;
}

interface Post {
    _id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    authorRole: string;
    upvotes: string[];
    downvotes: string[];
    createdAt: string;
}

interface Thread {
    _id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    authorRole: string;
    isPinned: boolean;
    isLocked: boolean;
    stats: {
        views: number;
        replyCount: number;
        upvotes: string[];
        downvotes: string[];
    };
    posts: Post[];
    createdAt: string;
}

const ForumThreadView: React.FC<ForumThreadViewProps> = ({ user, threadId, onBack }) => {
    const [thread, setThread] = useState<Thread | null>(null);
    const [loading, setLoading] = useState(true);
    const [replyContent, setReplyContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        fetchThreadDetails();
    }, [threadId]);

    const fetchThreadDetails = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/forums/threads/${threadId}`);
            const data = await response.json();
            setThread(data);
        } catch (err) {
            console.error('[FORUM] Fetch thread details error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePostReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetch(`http://localhost:5000/api/forums/threads/${threadId}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    content: replyContent
                })
            });

            if (response.ok) {
                setReplyContent('');
                fetchThreadDetails(); // Refresh to show new post
            }
        } catch (err) {
            console.error('[FORUM] Post reply error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (type: 'up' | 'down') => {
        try {
            const response = await fetch(`http://localhost:5000/api/forums/threads/${threadId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, type })
            });

            if (response.ok) {
                fetchThreadDetails();
            }
        } catch (err) {
            console.error('[FORUM] Vote error:', err);
        }
    };

    const handleDelete = async () => {
        if (!confirm('PROTOCOL_WARNING: This action will purge this signal from the mesh permanently. Proceed?')) return;
        try {
            const response = await fetch(`http://localhost:5000/api/forums/threads/${threadId}?userId=${user.id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                onBack();
            }
        } catch (err) {
            console.error('[FORUM] Delete error:', err);
        }
    };

    const handleEditSave = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/forums/threads/${threadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, content: editContent })
            });
            if (response.ok) {
                setIsEditing(false);
                fetchThreadDetails();
            }
        } catch (err) {
            console.error('[FORUM] Edit error:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!thread) return <div className="text-white">Transmission Lost // Thread_Not_Found</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-6">
                <button
                    onClick={onBack}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-slate-400 hover:text-white"
                >
                    {getIcon('ChevronLeft', 24)}
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-orbitron font-black text-white leading-tight">{thread.title}</h1>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="text-[10px] font-mono text-primary uppercase tracking-widest">Signal_ID: {thread._id.slice(-8)}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">{new Date(thread.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                {(thread.authorId === user.id || user.isAdmin) && (
                    <div className="flex gap-2">
                        {thread.authorId === user.id && (
                            <button
                                onClick={() => { setIsEditing(true); setEditContent(thread.content); }}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-blue-400 transition-all"
                                title="Edit Signal"
                            >
                                {getIcon('Settings', 20)}
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-red-500 transition-all"
                            title="Purge Signal"
                        >
                            {getIcon('ShieldAlert', 20)}
                        </button>
                    </div>
                )}
            </div>

            {/* Original Post */}
            <div className="glass border border-primary/20 rounded-[40px] p-8 relative overflow-hidden">
                {/* Voting Sidebar */}
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-black/20 border-r border-white/5 flex flex-col items-center py-8 gap-4">
                    <button
                        onClick={() => handleVote('up')}
                        className={`p-2 rounded-xl transition-all ${thread.stats.upvotes.includes(user.id) ? 'bg-primary text-black' : 'text-slate-500 hover:text-primary'}`}
                    >
                        {getIcon('ChevronLeft', 24)} {/* Rotated icon would be better but let's stick to available */}
                    </button>
                    <span className="font-orbitron font-black text-xl text-white">
                        {thread.stats.upvotes.length - thread.stats.downvotes.length}
                    </span>
                    <button
                        onClick={() => handleVote('down')}
                        className={`p-2 rounded-xl transition-all ${thread.stats.downvotes.includes(user.id) ? 'bg-red-500 text-white' : 'text-slate-500 hover:text-red-500'}`}
                    >
                        {getIcon('ChevronLeft', 24)}
                    </button>
                </div>

                <div className="pl-16">
                    {/* Author Info */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-primary/30 shrink-0">
                            <img src={thread.authorAvatar} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black font-orbitron text-white">{thread.authorName}</span>
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-bold rounded uppercase border border-primary/20">{thread.authorRole}</span>
                            </div>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Tactical_Operator</p>
                        </div>
                    </div>

                    {/* Content */}
                    {isEditing ? (
                        <div className="space-y-4 mb-8">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-black/40 border border-primary/30 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary resize-none transition-all"
                                rows={8}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleEditSave}
                                    className="px-6 py-2 bg-primary text-black font-orbitron font-black text-[10px] rounded-xl uppercase"
                                >
                                    Commit_Changes
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 bg-white/5 text-slate-400 font-orbitron font-black text-[10px] rounded-xl uppercase hover:bg-white/10"
                                >
                                    Abort
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-300 font-mono text-base leading-relaxed whitespace-pre-wrap mb-8">
                            {thread.content}
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="flex gap-6 border-t border-white/5 pt-6">
                        <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                            {getIcon('MessageSquare', 14)}
                            {thread.stats.replyCount} Replies
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                            {getIcon('Activity', 14)}
                            {thread.stats.views} Views
                        </div>
                    </div>
                </div>
            </div>

            {/* Replies Section */}
            <div className="space-y-6">
                <h3 className="text-xl font-orbitron font-black text-white uppercase tracking-tighter pl-4 border-l-4 border-primary/50">Tactical_Feed</h3>

                <div className="space-y-4">
                    {thread.posts.map((post, i) => (
                        <div key={post._id} className="glass border border-white/5 rounded-3xl p-6 relative">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                    <img src={post.authorAvatar} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm">{post.authorName}</span>
                                            <span className="text-[9px] font-mono text-slate-500 uppercase">{new Date(post.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-600">POST_#{i + 1}</span>
                                    </div>
                                    <div className="text-slate-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                                        {post.content}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {thread.posts.length === 0 && (
                        <div className="text-center py-10 glass border border-white/5 rounded-3xl text-slate-500 font-mono text-sm">
                            Channel silent. Be the first to synchronize intelligence.
                        </div>
                    )}
                </div>
            </div>

            {/* Reply Input */}
            {!thread.isLocked && (
                <div className="glass border border-primary/20 rounded-[40px] p-8 mt-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            {getIcon('Send', 16)}
                        </div>
                        <h4 className="text-lg font-orbitron font-black text-white uppercase">Transmit_Reply</h4>
                    </div>

                    <form onSubmit={handlePostReply} className="space-y-4">
                        <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Enter signal payload..."
                            rows={4}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary resize-none transition-all"
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || !replyContent.trim()}
                                className={`px-10 py-4 font-orbitron font-black text-xs rounded-2xl uppercase transition-all flex items-center gap-2 ${submitting || !replyContent.trim()
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-primary text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                    }`}
                            >
                                {submitting ? 'Transmitting...' : 'Authorize_Transmission'}
                                {getIcon('Zap', 14)}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ForumThreadView;
