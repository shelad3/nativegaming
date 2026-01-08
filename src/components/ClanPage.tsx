import React, { useState, useEffect, useRef } from 'react';
import { getIcon } from '../constants';
import { User } from '../types';
import { useSocket } from '../context/SocketContext';

interface ClanPageProps {
    user: User;
    clanId: string;
    onBack: () => void;
}

interface Member {
    userId: string;
    role: 'leader' | 'officer' | 'member';
    joinedAt: string;
    username?: string;
    avatar?: string;
    stats?: {
        rating: number;
        trophies: number;
    };
}

interface Clan {
    _id: string;
    name: string;
    tag: string;
    description: string;
    avatar: string;
    membersWithDetails: Member[];
    stats: {
        totalWins: number;
        totalTrophies: number;
        memberCount: number;
        level: number;
    };
    settings: {
        isPublic: boolean;
        maxMembers: number;
        minRating: number;
    };
}

const ClanPage: React.FC<ClanPageProps> = ({ user, clanId, onBack }) => {
    const { socket } = useSocket();
    const [clan, setClan] = useState<Clan | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'stats' | 'settings'>('chat');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchClanDetails();
        fetchChatHistory();

        if (socket) {
            socket.emit('join_clan', clanId);
            socket.on('clan_message', handleReceiveMessage);
        }

        return () => {
            if (socket) {
                socket.emit('leave_clan', clanId);
                socket.off('clan_message', handleReceiveMessage);
            }
        };
    }, [clanId, socket]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeTab]);

    const fetchClanDetails = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/clans/${clanId}`);
            const data = await response.json();
            setClan(data);
        } catch (err) {
            console.error('[CLAN_PAGE] Error fetching details:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatHistory = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/clans/${clanId}/messages`);
            const data = await response.json();
            setMessages(data);
        } catch (err) {
            console.error('[CLAN_PAGE] Error fetching messages:', err);
        }
    };

    const handleReceiveMessage = (message: any) => {
        setMessages(prev => [...prev, message]);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await fetch(`http://localhost:5000/api/clans/${clanId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: user.id,
                    senderName: user.username,
                    content: newMessage
                })
            });
            setNewMessage('');
        } catch (err) {
            console.error('[CLAN_PAGE] Send message error:', err);
        }
    };

    const handleKickMember = async (targetUserId: string) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;

        try {
            const response = await fetch(`http://localhost:5000/api/clans/${clanId}/kick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, targetUserId })
            });

            if (response.ok) {
                fetchClanDetails();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to kick member');
            }
        } catch (err) {
            console.error('[CLAN_PAGE] Kick error:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!clan) return <div className="text-white">Clan not found</div>;

    const myMemberData = clan.membersWithDetails.find(m => m.userId === user.id);
    const isLeader = myMemberData?.role === 'leader';
    const isOfficer = myMemberData?.role === 'officer';

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="glass border border-white/10 rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-slate-400 hover:text-white"
                    >
                        {getIcon('ChevronLeft', 24)}
                    </button>
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary">
                        <img src={clan.avatar} alt={clan.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-orbitron font-black text-white flex items-center gap-3">
                            {clan.name}
                            <span className="text-primary font-mono text-base font-medium">[{clan.tag}]</span>
                        </h1>
                        <p className="text-slate-400 font-mono text-sm mt-1">{clan.description}</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase font-mono">Trophies</p>
                            <p className="text-xl font-bold text-primary">{clan.stats.totalTrophies}</p>
                        </div>
                        <div className="text-center bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase font-mono">Members</p>
                            <p className="text-xl font-bold text-white">{clan.stats.memberCount}/{clan.settings.maxMembers}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 glass rounded-2xl border border-white/10 w-fit mb-6">
                {[
                    { id: 'chat', label: 'Tactical Comms', icon: 'MessageSquare' },
                    { id: 'members', label: 'Operators', icon: 'Users' },
                    { id: 'stats', label: 'War Room', icon: 'BarChart' },
                    { id: 'settings', label: 'HQ Settings', icon: 'Settings' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-2.5 rounded-xl font-orbitron font-bold text-xs uppercase transition-all flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-primary text-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        {getIcon(tab.icon, 16)}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">
                {activeTab === 'chat' && (
                    <div className="glass border border-white/10 rounded-3xl h-full flex flex-col overflow-hidden">
                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-sm"
                        >
                            {messages.length === 0 && (
                                <div className="text-center py-20 text-slate-500 italic">
                                    Secure channel established. Awaiting communication...
                                </div>
                            )}
                            {messages.map((msg, i) => {
                                const isMe = msg.senderId === user.id;
                                return (
                                    <div key={msg._id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            {!isMe && <span className="text-[10px] font-bold text-primary uppercase">[{clan.tag}]</span>}
                                            <span className="text-[10px] font-bold text-slate-500">{msg.senderName}</span>
                                            <span className="text-[10px] text-slate-700">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${isMe
                                                ? 'bg-primary/20 border border-primary/30 text-white rounded-tr-none'
                                                : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-none'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5 flex gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message to the clan..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-3 font-mono text-sm text-white outline-none focus:border-primary"
                            />
                            <button
                                type="submit"
                                className="p-3 bg-primary text-black rounded-2xl hover:bg-emerald-400 transition-colors"
                            >
                                {getIcon('Send', 24)}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="glass border border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {clan.membersWithDetails.map((member) => (
                                <div key={member.userId} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group">
                                    <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden shrink-0">
                                        <img src={member.avatar} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-black font-orbitron">{member.username}</span>
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${member.role === 'leader' ? 'bg-primary text-black' :
                                                    member.role === 'officer' ? 'bg-blue-500 text-white' : 'bg-white/10 text-slate-400'
                                                }`}>
                                                {member.role}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-mono text-slate-500 mt-1">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right mr-4">
                                        <p className="text-[10px] text-slate-500 uppercase font-mono">Trophies</p>
                                        <p className="text-sm font-bold text-primary">{member.stats?.trophies || 0}</p>
                                    </div>

                                    {/* Actions */}
                                    {(isLeader || (isOfficer && member.role === 'member')) && member.userId !== user.id && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleKickMember(member.userId)}
                                                className="p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Kick Member"
                                            >
                                                {getIcon('UserX', 18)}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="glass p-6 rounded-3xl border border-white/10 text-center">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                {getIcon('Zap', 24)}
                            </div>
                            <h4 className="text-slate-500 text-[10px] uppercase font-mono mb-1">Total Wins</h4>
                            <p className="text-3xl font-black text-white font-orbitron">{clan.stats.totalWins}</p>
                        </div>
                        <div className="glass p-6 rounded-3xl border border-white/10 text-center">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                {getIcon('Trophy', 24)}
                            </div>
                            <h4 className="text-slate-500 text-[10px] uppercase font-mono mb-1">Combat Rating</h4>
                            <p className="text-3xl font-black text-white font-orbitron">{Math.floor(clan.stats.totalTrophies / (clan.stats.memberCount || 1))}</p>
                        </div>
                        <div className="glass p-6 rounded-3xl border border-white/10 text-center">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                {getIcon('Activity', 24)}
                            </div>
                            <h4 className="text-slate-500 text-[10px] uppercase font-mono mb-1">Clan Level</h4>
                            <p className="text-3xl font-black text-white font-orbitron">{clan.stats.level}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="glass border border-white/10 rounded-3xl p-8 max-w-2xl">
                        <h3 className="text-xl font-orbitron font-black text-white mb-6 uppercase">Clan Management</h3>
                        {!isLeader && (
                            <div className="bg-white/5 p-6 rounded-2xl text-slate-400 font-mono text-sm flex items-center gap-3">
                                {getIcon('Lock', 20)}
                                Access limited to Clan Leader only.
                            </div>
                        )}
                        {isLeader && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-slate-500 uppercase ml-2">Clan Status</label>
                                    <div className="flex gap-4">
                                        <button className="flex-1 py-3 bg-primary text-black rounded-xl font-bold font-orbitron text-xs">PUBLIC</button>
                                        <button className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl font-bold font-orbitron text-xs">PRIVATE (SOON)</button>
                                    </div>
                                </div>
                                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
                                    <h4 className="text-red-500 font-bold text-sm mb-2 uppercase">Danger Zone</h4>
                                    <p className="text-xs text-red-500/70 mb-4 font-mono">Disbanding the clan is an irreversible action. All stats and tags will be purged.</p>
                                    <button className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold font-orbitron text-[10px] hover:bg-red-600 transition-colors uppercase">
                                        Disband Clan
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClanPage;
