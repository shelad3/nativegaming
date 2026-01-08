
import React, { useState, useEffect, useRef } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { User } from '../types';
import { useSocket } from '../context/SocketContext';
import { useStreaming } from '../hooks/useStreaming';

interface StreamRoomProps {
    streamerId: string;
    currentUser: User;
    onBack: () => void;
}

const StreamRoom: React.FC<StreamRoomProps> = ({ streamerId, currentUser, onBack }) => {
    const { socket } = useSocket();
    const [streamer, setStreamer] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [showGifts, setShowGifts] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [metrics, setMetrics] = useState({ bitrate: 0, health: 'LINKING' });
    const chatEndRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { remoteStream, error: streamError } = useStreaming(false, streamer?.peerId);

    const gifts = [
        { name: 'PowerUp', cost: 100, icon: 'Zap', color: 'text-primary' },
        { name: 'Crystal', cost: 500, icon: 'Crown', color: 'text-amber-500' },
        { name: 'Nuclear', cost: 5000, icon: 'Flame', color: 'text-rose-500' },
    ];

    useEffect(() => {
        const fetchStreamer = async () => {
            try {
                const data = await backendService.getUserById(streamerId);
                setStreamer(data);
            } catch (err) {
                console.error("Failed to fetch streamer node", err);
                onBack();
            } finally {
                setLoading(false);
            }
        };
        fetchStreamer();
    }, [streamerId]);

    useEffect(() => {
        if (!socket) return;
        socket.emit('join_stream', streamerId);

        const fetchInitialMessages = async () => {
            try {
                const data = await backendService.getStreamMessages(streamerId);
                setMessages(data);
            } catch (err) {
                console.error("Failed to sync initial comms", err);
            }
        };
        fetchInitialMessages();

        socket.on('receive_message', (message: any) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('metrics_update', (data: any) => {
            setMetrics({ bitrate: data.bitrate, health: data.health });
        });

        socket.on('user_typing_update', ({ username, isTyping }: any) => {
            setTypingUsers(prev =>
                isTyping ? [...prev, username] : prev.filter(u => u !== username)
            );
        });

        return () => {
            socket.emit('leave_stream', streamerId);
            socket.off('receive_message');
            socket.off('metrics_update');
            socket.off('user_typing_update');
        };
    }, [socket, streamerId]);

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        const tempText = inputText;
        setInputText('');
        try {
            await backendService.postStreamMessage(streamerId, currentUser.id, currentUser.username, tempText);
        } catch (err) {
            console.error("Signal broadcast failed", err);
        }
    };

    const handleSendGift = async (gift: any) => {
        try {
            await backendService.interactWithPost('stream', currentUser.id, 'GIFT', gift.name);
            setMessages(prev => [...prev, {
                id: Date.now(),
                user: 'SYSTEM',
                text: `${currentUser.username} transmitted a ${gift.name} (${gift.cost} Ȼ)!`,
                color: gift.color + ' font-bold italic'
            }]);
            setShowGifts(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center font-mono text-primary animate-pulse uppercase tracking-[0.5em]">Establishing_Uplink...</div>;
    if (!streamer) return null;

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6 animate-in fade-in zoom-in-95 duration-700">
            <div className="flex-[3] flex flex-col gap-6">
                <div className="relative group bg-black rounded-[40px] border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                    <div className="w-full aspect-video bg-slate-900 flex items-center justify-center relative">
                        {remoteStream ? (
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="relative">
                                    <img src={streamer.avatar} className="w-48 h-48 rounded-full opacity-20 blur-2xl animate-pulse scale-150 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" alt="" />
                                    <div className="relative z-10 w-32 h-32 rounded-full border-4 border-red-500/50 p-1 animate-pulse">
                                        <img src={streamer.avatar} className="w-full h-full rounded-full object-cover grayscale" alt="" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-red-500 flex justify-center">{getIcon('Radio', 48)}</div>
                                    <p className="font-orbitron text-xs font-black text-rose-500 tracking-[0.5em] uppercase">
                                        {streamError ? 'SIGNAL_LOST' : 'Transmission_Incoming'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="absolute top-8 left-8 flex items-center gap-4">
                        <div className="px-4 py-2 bg-red-600 text-white font-orbitron font-black text-[10px] rounded-lg shadow-lg flex items-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> LIVE
                        </div>
                        <div className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] rounded-lg">
                            Sector: {streamer.streamGame || 'Unknown'}
                        </div>
                    </div>

                    <div className="absolute top-8 right-8 flex items-center gap-2">
                        <div className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] rounded-lg flex items-center gap-2">
                            {getIcon('Eye', 14)} 1,482 NODES
                        </div>
                        <div className="px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 text-primary font-mono text-[10px] rounded-lg flex items-center gap-2">
                            {getIcon('Zap', 14)} {(metrics.bitrate / 1000).toFixed(1)} Mbps
                        </div>
                        <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all">
                            {getIcon('ArrowLeft', 18)}
                        </button>
                    </div>
                </div>

                <div className="glass p-8 rounded-[40px] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl border-2 border-primary/20 p-1">
                            <img src={streamer.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-orbitron font-black text-white uppercase truncate max-w-xl">{streamer.streamTitle || 'TACTICAL_FEED'}</h1>
                            <p className="text-primary font-mono text-[10px] uppercase tracking-widest mt-1">Host: {streamer.username} // Broadcaster_Node</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setShowGifts(!showGifts)} className="px-8 py-4 bg-amber-500 text-black font-orbitron font-black text-xs rounded-2xl uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2">
                            {getIcon('Crown', 16)} Support_Node
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-96 flex flex-col gap-6 relative">
                {showGifts && (
                    <div className="absolute inset-x-0 bottom-32 z-50 animate-in slide-in-from-bottom-5 duration-300">
                        <div className="glass mx-4 p-6 rounded-[30px] border border-amber-500/30 shadow-2xl">
                            <h3 className="text-[10px] font-orbitron font-black text-amber-500 uppercase mb-4 text-center">Protocol: Gift_Transmission</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {gifts.map(g => (
                                    <button key={g.name} onClick={() => handleSendGift(g)} className="flex flex-col items-center p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group">
                                        <div className={`${g.color} mb-2 group-hover:scale-110 transition-transform`}>{getIcon(g.icon, 24)}</div>
                                        <p className="text-[8px] font-bold text-white uppercase">{g.name}</p>
                                        <p className="text-[8px] font-mono text-slate-500">{g.cost}Ȼ</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 glass rounded-[40px] border border-white/5 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-orbitron font-bold text-white uppercase flex items-center gap-2">
                            {getIcon('MessageSquare', 16)} Tactical_Comms
                        </span>
                        <span className="text-[8px] font-mono text-emerald-500 uppercase animate-pulse">Encrypted_Link</span>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                        {messages.map((m, i) => (
                            <div key={i} className="text-[11px] leading-relaxed animate-in slide-in-from-left-2 transition-all">
                                <span className={`font-bold uppercase tracking-tighter ${m.senderId === streamerId ? 'text-primary' : 'text-slate-400'} mr-2`}>
                                    {m.senderName || 'Anonymous'}:
                                </span>
                                <span className="text-slate-200 font-mono">{m.content}</span>
                            </div>
                        ))}
                        {typingUsers.length > 0 && (
                            <div className="text-[9px] font-mono text-primary italic animate-pulse">
                                {typingUsers.join(', ')} transmits signal...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5 bg-black/20">
                        <div className="flex gap-2 bg-black/40 border border-white/10 rounded-2xl px-4 items-center focus-within:border-primary transition-all">
                            <input
                                type="text"
                                placeholder="Transmit_Signal..."
                                value={inputText}
                                onChange={(e) => {
                                    setInputText(e.target.value);
                                    if (socket) {
                                        socket.emit('typing_start', { streamId: streamerId, username: currentUser.username });
                                        if ((window as any).typingTimeout) clearTimeout((window as any).typingTimeout);
                                        (window as any).typingTimeout = setTimeout(() => {
                                            socket.emit('typing_stop', { streamId: streamerId, username: currentUser.username });
                                        }, 2000);
                                    }
                                }}
                                className="flex-1 bg-transparent py-4 font-mono text-xs outline-none text-white"
                            />
                            <button type="submit" className="text-primary hover:text-white transition-colors">
                                {getIcon('Zap', 18)}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StreamRoom;
