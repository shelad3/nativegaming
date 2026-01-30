import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { backendService } from '../services/backendService';
import { useSocket } from '../context/SocketContext';
import {
    Send,
    Search,
    MoreVertical,
    MessageSquare,
    Shield,
    Clock,
    Check,
    CheckCheck,
    Smile,
    Gamepad,
    Image as ImageIcon
} from 'lucide-react';

interface MessengerProps {
    currentUser: User;
    onNavigateProfile: (id: string) => void;
    initialRecipientId?: string | null;
    onClearRecipient?: () => void;
}

const COMMON_EMOJIS = ['👍', '🔥', '😂', '❤️', '🎮', '💀', '👀', '🎉'];

const Messenger: React.FC<MessengerProps> = ({ currentUser, onNavigateProfile, initialRecipientId, onClearRecipient }) => {
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversation, setActiveConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { socket } = useSocket();

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            const data = await backendService.getConversations();
            setConversations(data);
            setIsLoading(false);

            if (initialRecipientId) {
                const existing = data.find((c: any) =>
                    c.participants.some((p: any) => (p._id || p.id) === initialRecipientId)
                );

                if (existing) {
                    setActiveConversation(existing);
                } else {
                    try {
                        const targetUser = await backendService.getUserById(initialRecipientId);
                        if (targetUser) {
                            const newConv = {
                                _id: 'TEMP_CONV',
                                participants: [currentUser, targetUser],
                                isPlaceholder: true,
                                lastActivity: new Date()
                            };
                            setActiveConversation(newConv);
                            setConversations(prev => [newConv, ...prev]);
                        }
                    } catch (err) {
                        console.error('Target node not found', err);
                    }
                }
                if (onClearRecipient) onClearRecipient();
            }
        };
        init();
    }, [initialRecipientId]);

    // --- Socket Listeners ---
    useEffect(() => {
        if (activeConversation && !activeConversation.isPlaceholder) {
            loadMessages(activeConversation._id);
            if (socket) socket.emit('join_conversation', activeConversation._id);
        } else if (activeConversation?.isPlaceholder) {
            setMessages([]);
        }
    }, [activeConversation]);

    useEffect(() => {
        if (!socket) return;
        socket.on('new_message', (msg: any) => {
            if (activeConversation && msg.conversationId === activeConversation._id) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            }
            loadConversations(); // Refresh list for last message/unread
        });

        socket.on('dm_typing_update', (data: any) => {
            if (activeConversation && data.conversationId === activeConversation._id && data.userId !== currentUser.id) {
                setIsTyping(data.isTyping);
            }
        });

        return () => {
            socket.off('new_message');
            socket.off('dm_typing_update');
        };
    }, [socket, activeConversation]);

    // --- Helpers ---
    const loadConversations = async () => {
        const data = await backendService.getConversations();
        setConversations(data);
    };

    const loadMessages = async (convId: string) => {
        const msgs = await backendService.getConversationMessages(convId);
        setMessages(msgs);
        scrollToBottom();
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
    };

    const handleSendMessage = async (textOverride?: string) => {
        const text = textOverride || inputMessage;
        if (!text.trim() || !activeConversation) return;

        const receiver = activeConversation.participants.find((p: any) => (p._id || p.id) !== currentUser.id);
        if (!receiver) return;

        setInputMessage('');
        setShowEmoji(false);

        try {
            await backendService.sendMessage({
                senderId: currentUser.id,
                receiverId: receiver._id || receiver.id,
                content: text
            });

            if (activeConversation.isPlaceholder) {
                // Refresh to get real conversation ID
                const data = await backendService.getConversations();
                setConversations(data);
                const newConv = data.find((c: any) => c.participants.some((p: any) => (p._id || p.id) === (receiver._id || receiver.id)));
                if (newConv) setActiveConversation(newConv);
            }
        } catch (err) {
            console.error('Transmission error', err);
        }
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);
        if (socket && activeConversation && !activeConversation.isPlaceholder) {
            socket.emit('dm_typing_start', { conversationId: activeConversation._id, userId: currentUser.id });
            clearTimeout((window as any).typingTimeout);
            (window as any).typingTimeout = setTimeout(() => {
                socket.emit('dm_typing_stop', { conversationId: activeConversation._id, userId: currentUser.id });
            }, 2000);
        }
    };

    // --- Render ---
    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">

            {/* Sidebar */}
            <div className="w-80 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 space-y-4">
                    <h2 className="text-xl font-orbitron font-black text-white uppercase flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Encrypted_Comms
                    </h2>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="SCAN_MESH_FOR_OPERATORS..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl pl-12 pr-6 py-5 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none transition-all placeholder:text-[var(--text-muted)]"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {isLoading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse mx-2" />)
                    ) : (
                        conversations.map(conv => {
                            const otherUser = conv.participants.find((p: any) => (p._id || p.id) !== currentUser.id);
                            if (!otherUser) return null;
                            const isActive = activeConversation?._id === conv._id;

                            return (
                                <button
                                    key={conv._id}
                                    onClick={() => setActiveConversation(conv)}
                                    className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${isActive ? 'bg-primary/20 border border-primary/20' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    <div className="relative">
                                        <img src={otherUser.avatar} className="w-10 h-10 rounded-full bg-slate-800" alt="" />
                                        {otherUser.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-black"></div>}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <p className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-white'}`}>{otherUser.username}</p>
                                            <span className="text-[9px] font-mono text-slate-500">{conv.lastActivity ? new Date(conv.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate opacity-70 font-mono">{conv.isPlaceholder ? 'Initializing_Link...' : (conv.lastMessage?.content || 'Secure_Link_Established')}</p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] flex flex-col overflow-hidden relative shadow-2xl">
                {!activeConversation ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-50">
                        <Shield size={64} className="text-white/20" />
                        <p className="mt-4 font-mono text-sm uppercase tracking-widest">Select a secure channel to begin transmission.</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="px-8 py-4 border-b border-white/5 flex justify-between items-center bg-[var(--bg-secondary)]">
                            <div className="flex items-center gap-4">
                                <img src={activeConversation.participants.find((p: any) => (p._id || p.id) !== currentUser.id)?.avatar} className="w-8 h-8 rounded-full" alt="" />
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{activeConversation.participants.find((p: any) => (p._id || p.id) !== currentUser.id)?.username}</h3>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isTyping ? 'bg-primary animate-pulse' : 'bg-slate-600'}`}></div>
                                        <p className="text-[9px] font-mono text-slate-500 uppercase">{isTyping ? 'ENCODING_RESPONSE...' : 'IDLE'}</p>
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-white/5 rounded-full text-slate-400"><MoreVertical size={16} /></button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {messages.map((msg, i) => {
                                const isOwn = msg.senderId === currentUser.id;
                                return (
                                    <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                        <div className={`max-w-[70%] p-4 rounded-3xl text-sm ${isOwn ? 'bg-primary text-black rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none border border-white/5'}`}>
                                            <p>{msg.content}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                                                <span className="text-[9px] font-mono uppercase">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isOwn && (msg.isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white/5 text-slate-400 px-4 py-2 rounded-2xl rounded-tl-none text-xs font-mono animate-pulse">...</div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-[var(--bg-secondary)] border-t border-white/5 relative">
                            {showEmoji && (
                                <div className="absolute bottom-20 left-4 bg-black border border-white/10 p-2 rounded-xl grid grid-cols-4 gap-2 shadow-xl z-20">
                                    {COMMON_EMOJIS.map(exo => (
                                        <button key={exo} onClick={() => { setInputMessage(prev => prev + exo); setShowEmoji(false); }} className="text-xl hover:bg-white/10 p-2 rounded-lg">{exo}</button>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 pr-2">
                                <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-slate-400 hover:text-white transition-colors"><Smile className="w-5 h-5" /></button>
                                <button className="p-2 text-slate-400 hover:text-white transition-colors"><ImageIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleSendMessage("[TACTICAL_INVITE] Join my lobby in Arena 01")} className="p-2 text-primary hover:text-primary/80 transition-colors" title="Send Game Invite"><Gamepad className="w-5 h-5" /></button>

                                <input
                                    value={inputMessage}
                                    onChange={handleTyping}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Transmit_Data..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white px-2 placeholder:text-slate-600"
                                />
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={!inputMessage.trim()}
                                    className="p-3 bg-primary text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Messenger;
