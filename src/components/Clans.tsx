import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { User } from '../types';

interface ClansProps {
    user: User;
    onViewClan: (clanId: string) => void;
}

interface Clan {
    _id: string;
    name: string;
    tag: string;
    description: string;
    avatar: string;
    members: any[];
    stats: {
        totalWins: number;
        totalTrophies: number;
        memberCount: number;
        level: number;
    };
    settings: {
        isPublic: boolean;
        requiresApproval: boolean;
        minRating: number;
        maxMembers: number;
    };
}

const Clans: React.FC<ClansProps> = ({ user, onViewClan }) => {
    const [activeTab, setActiveTab] = useState<'browse' | 'myclan' | 'leaderboard'>('browse');
    const [clans, setClans] = useState<Clan[]>([]);
    const [myClan, setMyClan] = useState<Clan | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('trophies');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchClans();
        if (user.clanId) {
            fetchMyClan();
        }
    }, [sortBy]);

    const fetchClans = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/clans?sort=${sortBy}`);
            const data = await response.json();
            setClans(data);
        } catch (err) {
            console.error('[CLANS] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyClan = async () => {
        if (!user.clanId) return;
        try {
            const response = await fetch(`http://localhost:5000/api/clans/${user.clanId}`);
            const data = await response.json();
            setMyClan(data);
        } catch (err) {
            console.error('[CLANS] My clan fetch error:', err);
        }
    };

    const handleJoinClan = async (clanId: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/clans/${clanId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            if (response.ok) {
                alert('Successfully joined clan!');
                window.location.reload();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to join clan');
            }
        } catch (err) {
            console.error('[CLANS] Join error:', err);
            alert('Failed to join clan');
        }
    };

    const handleCreateClan = async (formData: any) => {
        try {
            const response = await fetch('http://localhost:5000/api/clans/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, userId: user.id })
            });

            if (response.ok) {
                const clan = await response.json();
                alert(`Clan ${clan.name} initialized. Strategic link established.`);
                window.location.reload();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to instantiate clan');
            }
        } catch (err) {
            console.error('[CLANS] Creation error:', err);
        }
    };

    const renderBrowse = () => (
        <div className="space-y-6">
            {/* Search & Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search clans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-3 pl-12 font-mono text-sm outline-none focus:border-primary text-white"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        {getIcon('Search', 18)}
                    </div>
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-2xl px-6 py-3 font-mono text-sm outline-none focus:border-primary text-white"
                >
                    <option value="trophies">Top Trophies</option>
                    <option value="members">Most Members</option>
                    <option value="level">Highest Level</option>
                    <option value="recent">Recently Created</option>
                </select>
            </div>

            {/* Clans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clans
                    .filter(clan =>
                        clan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        clan.tag.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(clan => (
                        <div
                            key={clan._id}
                            className="glass rounded-2xl border border-white/10 p-6 hover:border-primary/50 transition-all cursor-pointer group"
                            onClick={() => onViewClan(clan._id)}
                        >
                            {/* Clan Header */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-primary/30 group-hover:border-primary transition-colors shrink-0">
                                    <img src={clan.avatar} alt={clan.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-orbitron font-black text-white truncate">{clan.name}</h3>
                                    <p className="text-sm font-mono text-primary">[{clan.tag}]</p>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-400 font-mono mb-4 line-clamp-2">{clan.description}</p>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-black/40 rounded-xl p-2 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase">Level</p>
                                    <p className="text-sm font-bold text-white">{clan.stats.level}</p>
                                </div>
                                <div className="bg-black/40 rounded-xl p-2 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase">Members</p>
                                    <p className="text-sm font-bold text-white">{clan.stats.memberCount}/{clan.settings.maxMembers}</p>
                                </div>
                                <div className="bg-black/40 rounded-xl p-2 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase">Trophies</p>
                                    <p className="text-sm font-bold text-primary">{clan.stats.totalTrophies}</p>
                                </div>
                            </div>

                            {/* Join Button */}
                            {!user.clanId && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleJoinClan(clan._id);
                                    }}
                                    className="w-full py-2 bg-primary text-black font-orbitron font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors uppercase"
                                >
                                    Join Clan
                                </button>
                            )}
                        </div>
                    ))}
            </div>

            {clans.length === 0 && !loading && (
                <div className="text-center py-12">
                    <p className="text-slate-500 font-mono text-sm">No clans found. Be the first to create one!</p>
                </div>
            )}
        </div>
    );

    const renderMyClan = () => {
        if (!myClan) {
            return (
                <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        {getIcon('Users', 40)}
                    </div>
                    <p className="text-slate-500 font-mono text-sm mb-4">You are not in a clan yet.</p>
                    <button
                        onClick={() => setActiveTab('browse')}
                        className="px-6 py-3 bg-primary text-black font-orbitron font-bold text-sm rounded-xl hover:bg-emerald-400 transition-colors uppercase"
                    >
                        Browse Clans
                    </button>
                </div>
            );
        }

        return (
            <div
                className="glass rounded-2xl border border-primary/30 p-8 cursor-pointer hover:border-primary transition-colors"
                onClick={() => onViewClan(myClan._id)}
            >
                <div className="flex items-start gap-6 mb-6">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary">
                        <img src={myClan.avatar} alt={myClan.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-3xl font-orbitron font-black text-white mb-2">{myClan.name}</h2>
                        <p className="text-lg font-mono text-primary mb-2">[{myClan.tag}]</p>
                        <p className="text-sm text-slate-400 font-mono">{myClan.description}</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-black/40 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase mb-1">Level</p>
                        <p className="text-2xl font-bold text-white">{myClan.stats.level}</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase mb-1">Members</p>
                        <p className="text-2xl font-bold text-white">{myClan.stats.memberCount}</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase mb-1">Trophies</p>
                        <p className="text-2xl font-bold text-primary">{myClan.stats.totalTrophies}</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase mb-1">Wins</p>
                        <p className="text-2xl font-bold text-white">{myClan.stats.totalWins}</p>
                    </div>
                </div>

                <button className="w-full mt-6 py-3 bg-primary text-black font-orbitron font-bold text-sm rounded-xl hover:bg-emerald-400 transition-colors uppercase">
                    Open Clan Page
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tight">Clans</h2>
                    <p className="text-sm font-mono text-slate-500 mt-2">Join forces with elite operators</p>
                </div>
                {!user.clanId && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-primary text-black font-orbitron font-bold text-sm rounded-xl hover:bg-emerald-400 transition-colors uppercase flex items-center gap-2"
                    >
                        {getIcon('Plus', 18)}
                        Create Clan (1000Ȼ)
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 glass rounded-2xl border border-white/10 w-fit">
                <button
                    onClick={() => setActiveTab('browse')}
                    className={`px-6 py-2 rounded-xl font-orbitron font-bold text-xs uppercase transition-all ${activeTab === 'browse'
                        ? 'bg-primary text-black'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Browse
                </button>
                <button
                    onClick={() => setActiveTab('myclan')}
                    className={`px-6 py-2 rounded-xl font-orbitron font-bold text-xs uppercase transition-all ${activeTab === 'myclan'
                        ? 'bg-primary text-black'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    My Clan
                </button>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`px-6 py-2 rounded-xl font-orbitron font-bold text-xs uppercase transition-all ${activeTab === 'leaderboard'
                        ? 'bg-primary text-black'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Leaderboard
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'browse' && renderBrowse()}
                    {activeTab === 'myclan' && renderMyClan()}
                    {activeTab === 'leaderboard' && (
                        <div className="text-center py-12">
                            <p className="text-slate-500 font-mono text-sm">Leaderboard coming soon...</p>
                        </div>
                    )}
                </>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="glass rounded-[2.5rem] border border-primary/20 p-10 max-w-xl w-full shadow-[0_0_100px_rgba(16,185,129,0.1)]">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-3xl font-orbitron font-black text-white uppercase italic">Instantiate_Clan</h3>
                                <p className="text-[10px] font-mono text-primary uppercase mt-1 tracking-widest">Operation_Cost: 1000 Ȼ</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition-colors">{getIcon('X', 24)}</button>
                        </div>

                        <form onSubmit={(e: any) => {
                            e.preventDefault();
                            const data = {
                                name: e.target.name.value,
                                tag: e.target.tag.value,
                                description: e.target.description.value,
                                avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${e.target.name.value}`
                            };
                            handleCreateClan(data);
                        }} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-2 block">Clan_Designation</label>
                                <input name="name" required placeholder="Ex: Shadow Nexus" className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-2 block">Strategic_Tag (2-5 Chars)</label>
                                <input name="tag" required maxLength={5} placeholder="Ex: SHDW" className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary transition-all uppercase" />
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-2 block">Protocol_Description</label>
                                <textarea name="description" required rows={3} placeholder="Defining the clan's tactical purpose in the mesh..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary resize-none transition-all" />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-primary text-black font-orbitron font-black text-xs rounded-2xl uppercase tracking-[0.2em] hover:bg-accent transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                            >
                                Execute_Instantiation
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clans;
