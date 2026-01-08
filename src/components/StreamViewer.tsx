
import React, { useEffect, useRef } from 'react';
import { useStreaming } from '../hooks/useStreaming';
import { useSocket } from '../context/SocketContext';
import { getIcon } from '../constants';

interface StreamViewerProps {
    broadcasterId: string;
    peerId: string;
    title: string;
    onClose: () => void;
}

const StreamViewer: React.FC<StreamViewerProps> = ({ broadcasterId, peerId, title, onClose }) => {
    const { remoteStream, error } = useStreaming(false, peerId);
    const { socket } = useSocket();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [metrics, setMetrics] = React.useState({ bitrate: 0, health: 'LINKING' });

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    useEffect(() => {
        if (!socket) return;
        socket.emit('join_stream', broadcasterId);

        socket.on('metrics_update', (data: any) => {
            setMetrics({ bitrate: data.bitrate, health: data.health });
        });

        return () => {
            socket.emit('leave_stream', broadcasterId);
            socket.off('metrics_update');
        };
    }, [socket, broadcasterId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                {/* Header Overlay */}
                <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="px-3 py-1 bg-red-600 rounded-full text-[10px] font-orbitron font-black text-white animate-pulse">LIVE SIGNAL</span>
                            <h3 className="text-xl font-orbitron font-bold text-white tracking-tight">{title}</h3>
                        </div>
                        <p className="text-xs font-mono text-slate-400">Broadcaster Node: {broadcasterId.slice(0, 8)}...</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"
                    >
                        {getIcon('X', 24)}
                    </button>
                </div>

                {/* Video Signal */}
                {!remoteStream && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                        <p className="text-xs font-mono uppercase tracking-widest animate-pulse">Establishing Peer Link...</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 bg-red-500/10">
                        {getIcon('AlertCircle', 48)}
                        <p className="mt-4 text-sm font-orbitron font-bold uppercase tracking-widest">Signal Loss: {error}</p>
                        <button
                            onClick={onClose}
                            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full text-xs font-bold"
                        >
                            RETURN TO BASE
                        </button>
                    </div>
                )}

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                {/* Metrics Overlay */}
                <div className="absolute bottom-6 right-6 p-4 rounded-2xl glass border border-white/10 flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        {getIcon('Eye', 16)}
                        <span className="text-xs font-mono text-white">4.2k Viewers</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {getIcon('Zap', 16)}
                        <span className="text-xs font-mono text-primary">{(metrics.bitrate / 1000).toFixed(1)} Mbps</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${metrics.health === 'STABLE' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                        <span className="text-[10px] font-mono text-slate-400 capitalize">{metrics.health}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StreamViewer;
