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
    CheckCheck
} from 'lucide-react';

interface MessengerProps {
    currentUser: User;
    onNavigateProfile: (id: string) => void;
    initialRecipientId?: string | null;
    onClearRecipient?: () => void;
}

const Messenger: React.FC<MessengerProps> = ({ currentUser, onNavigateProfile, initialRecipientId, onClearRecipient }) => {
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversation, setActiveConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { socket } = useSocket();

    useEffect(() => {
        const init = async () => {
            const data = await backendService.getConversations();
            setConversations(data);
            setIsLoading(false);

            if (initialRecipientId) {
                // Find existing conversation
                const existing = data.find((c: any) =>
                    c.participants.some((p: any) => p._id === initialRecipientId)
                );

                if (existing) {
                    setActiveConversation(existing);
                } else {
                    // Fetch user info to create a placeholder conversation
                    try {
                        const targetUser = await backendService.getUserById(initialRecipientId);
                        if (targetUser) {
                            const placeholderConv = {
                                _id: 'TEMP_CONV',
                                participants: [currentUser, { ...targetUser, _id: targetUser.id }],
                                lastActivity: new Date(),
                                isPlaceholder: true
                            };
                            setActiveConversation(placeholderConv);
                        }
                    } catch (err) {
                        console.error('Failed to resolve tactical recipient node', err);
                    }
                }
                if (onClearRecipient) onClearRecipient();
            }
        };
        init();
    }, [initialRecipientId, onClearRecipient, currentUser]);

    useEffect(() => {
        if (activeConversation && !activeConversation.isPlaceholder) {
            loadMessages(activeConversation._id);
            if (socket) {
                socket.emit('join_conversation', activeConversation._id);
            }
        } else if (activeConversation?.isPlaceholder) {
            setMessages([]);
        }
    }, [activeConversation, socket]);

    useEffect(() => {
        if (!socket) return;

        socket.on('new_message', (msg: any) => {
            // If it's for the active conversation, add it
            if (activeConversation && msg.conversationId === activeConversation._id) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            }

            // Refresh conversation list to show latest message/unread counts
            loadConversations();
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
    }, [socket, activeConversation, currentUser.id]);

    const loadConversations = async () => {
        try {
            const data = await backendService.getConversations();
            setConversations(data);
        } catch (err) {
            console.error('Failed to load conversations', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMessages = async (convId: string) => {
        try {
            const msgs = await backendService.getConversationMessages(convId);
            setMessages(msgs);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Failed to load messages', err);
        }
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !activeConversation) return;

        const receiver = activeConversation.participants.find((p: any) => (p._id || p.id) !== currentUser.id);
        if (!receiver) return;

        const content = inputMessage;
        setInputMessage('');

        try {
            await backendService.sendMessage({
                senderId: currentUser.id,
                receiverId: receiver._id || receiver.id,
                content
            });

            // If it was a placeholder, we should reload conversations to get the real one
            if (activeConversation.isPlaceholder) {
                const data = await backendService.getConversations();
                setConversations(data);
                const newConv = data.find((c: any) =>
                    c.participants.some((p: any) => (p._id || p.id) === (receiver._id || receiver.id))
                );
                if (newConv) setActiveConversation(newConv);
            }
        } catch (err) {
            console.error('Signal transmission failed', err);
        }
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);
        if (socket && activeConversation && !activeConversation.isPlaceholder) {
            socket.emit('dm_typing_start', {
                conversationId: activeConversation._id,
                userId: currentUser.id
            });

            // Debounce typing stop
            clearTimeout((window as any).typingTimeout);
            (window as any).typingTimeout = setTimeout(() => {
                socket.emit('dm_typing_stop', {
                    conversationId: activeConversation._id,
                    userId: currentUser.id
                });
            }, 2000);
        }
    };

    return (
        <div className="flex h-[calc(100vh-10rem)] gap-6 animate-in fade-in duration-500">
            {/* Sidebar: Conversations List */}
            <div className="w-80 bento flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5 space-y-4">
                    <h2 className="text-xl font-orbitron font-black text-white uppercase flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Signals
                    </h2>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search Mesh..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-mono outline-none focus:border-primary transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {isLoading ? (
                        <div className="p-4 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="w-12 h-12 bg-white/5 rounded-full" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-3 bg-white/5 rounded w-1/2" />
                                        <div className="h-2 bg-white/5 rounded w-3/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        (() => {
                            const displayConversations = [...conversations];
                            if (activeConversation?.isPlaceholder && !conversations.some(c => c._id === activeConversation._id)) {
                                displayConversations.unshift(activeConversation);
                            }
                            return displayConversations.map(conv => {
                                const otherUser = conv.participants.find((p: any) => (p._id || p.id) !== currentUser.id);
                                const isActive = activeConversation?._id === conv._id;
                                const unreadCount = conv.unreadCounts?.[currentUser.id] || 0;

                                return (
                                    <button
                                        key={conv._id}
                                        onClick={() => setActiveConversation(conv)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${isActive
                                            ? 'bg-primary/20 border border-primary/20 shadow-lg shadow-primary/10'
                                            : 'hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <div className="relative">
                                            <img
                                                src={otherUser?.avatar}
                                                alt={otherUser?.username}
                                                className="w-12 h-12 rounded-full border border-white/10"
                                            />
                                            {otherUser?.status === 'active' && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary border-2 border-surface rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            )}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className={`text-sm font-bold truncate ${isActive ? 'text-primary' : 'text-white'}`}>
                                                    {otherUser?.username}
                                                </span>
                                                <span className="text-[9px] font-mono text-slate-500">
                                                    {conv.lastActivity ? new Date(conv.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 truncate font-mono">
                                                {conv.isPlaceholder ? 'Strategic initiation...' : (conv.lastMessage?.content || 'Initial link established...')}
                                            </p>
                                        </div>
                                        {unreadCount > 0 && (
                                            <div className="bg-primary text-black text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                                                {unreadCount}
                                            </div>
                                        )}
                                    </button>
                                );
                            });
                        })()
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 bento flex flex-col overflow-hidden relative">
                {!activeConversation ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-[30px] flex items-center justify-center mb-6 animate-pulse">
                            <Shield className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-orbitron font-black text-white uppercase mb-2">Secure_Mesh_Active</h3>
                        <p className="max-w-xs text-sm text-slate-400 font-mono">
                            Select a node from the sidebar to establish a peer-to-peer transmission segment.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-black/20">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => onNavigateProfile(activeConversation.participants.find((p: any) => p._id !== currentUser.id)?._id)}
                                    className="group relative"
                                >
                                    <img
                                        src={activeConversation.participants.find((p: any) => p._id !== currentUser.id)?.avatar}
                                        className="w-10 h-10 rounded-full border border-primary/20 group-hover:border-primary transition-all"
                                        alt="avatar"
                                    />
                                </button>
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                        {activeConversation.participants.find((p: any) => p._id !== currentUser.id)?.username}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_5px_#10b981]" />
                                        <span className="text-[10px] font-mono text-primary/80 uppercase tracking-widest">
                                            {isTyping ? 'Transmitting_Data...' : 'Connection_Secure'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2.5 hover:bg-white/5 rounded-xl transition-colors">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                </button>
                                <button className="p-2.5 hover:bg-white/5 rounded-xl transition-colors">
                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar scroll-smooth"
                        >
                            {messages.map((msg, i) => {
                                const isOwn = msg.senderId === currentUser.id;
                                return (
                                    <div
                                        key={msg._id || i}
                                        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group animate-in slide-in-from-bottom-2 duration-300`}
                                    >
                                        <div className={`
                      max-w-[70%] p-4 rounded-3xl text-sm relative
                      ${isOwn
                                                ? 'bg-primary text-black rounded-tr-none'
                                                : 'bg-white/5 border border-white/10 text-white rounded-tl-none'}
                    `}>
                                            <p className="leading-relaxed">{msg.content}</p>

                                            <div className={`
                        absolute -bottom-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity
                        ${isOwn ? 'right-0 text-right' : 'left-0 text-left'}
                      `}>
                                                <span className="text-[9px] font-mono text-slate-500 uppercase">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isOwn && (
                                                    msg.isRead ? <CheckCheck className="w-3 h-3 text-primary" /> : <Check className="w-3 h-3 text-slate-600" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {isTyping && (
                                <div className="flex items-center gap-2 text-primary/50 font-mono text-[9px] uppercase tracking-tighter animate-pulse">
                                    <div className="flex gap-1">
                                        <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-1 h-1 bg-current rounded-full animate-bounce" />
                                    </div>
                                    Receiving_Stream...
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-xl">
                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-primary/50 transition-all">
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={handleTyping}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Transmit_Signal.exe"
                                    className="flex-1 bg-transparent px-4 py-3 outline-none font-mono text-sm text-white placeholder:text-slate-600"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputMessage.trim()}
                                    className="bg-primary text-black p-3 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
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
