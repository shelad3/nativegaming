import React, { useState } from 'react';
import { getIcon } from '../constants';
import ReportModal from './ReportModal';

interface MediaItem {
    _id: string;
    userId: {
        _id: string;
        username: string;
        avatar: string;
    };
    type: 'CLIP' | 'VOD';
    title: string;
    url: string;
    thumbnail: string;
    game: string;
    stats: {
        views: number;
        likes: string[];
        gifts: number;
    };
    createdAt: string;
}

interface MediaGalleryProps {
    items: MediaItem[];
    loading?: boolean;
    title?: string;
    onInteract?: (id: string, type: 'LIKE' | 'GIFT', amount?: number) => void;
    currentUser: any;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ items, loading, title = "TACTICAL_ARCHIVES", onInteract, currentUser }) => {
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-video bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-orbitron font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <span className="w-2 h-8 bg-primary rounded-full"></span>
                    {title}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map(item => (
                    <div
                        key={item._id}
                        className="group relative bg-surface/40 border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-xl"
                        onClick={() => setSelectedMedia(item)}
                    >
                        {/* Thumbnail */}
                        <div className="relative aspect-video overflow-hidden">
                            <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                            {/* Overlay Indicators */}
                            <div className="absolute top-2 right-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest ${item.type === 'CLIP' ? 'bg-primary text-black' : 'bg-red-500 text-white'}`}>
                                    {item.type}
                                </span>
                            </div>

                            <div className="absolute bottom-2 left-2 flex items-center gap-2">
                                <span className="text-[10px] font-mono text-white/90 bg-black/40 px-2 py-0.5 rounded backdrop-blur-md">
                                    {getIcon('Eye', 10)} {item.stats.views.toLocaleString()}
                                </span>
                            </div>

                            {/* Play Icon on Hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-12 h-12 bg-primary/20 backdrop-blur-md rounded-full flex items-center justify-center border border-primary/50 text-primary">
                                    {getIcon('Play', 24)}
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors mb-1">{item.title}</h3>
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-mono text-slate-500 uppercase truncate">{item.game}</p>
                                <span className="text-[9px] font-mono text-slate-600">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10 shrink-0">
                                    <img src={item.userId.avatar} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">@{item.userId.username}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                    <p className="font-mono text-sm text-slate-600 uppercase tracking-widest italic">NO_MEDIA_SIGNALS_FOUND</p>
                </div>
            )}

            {/* Tactical Video Player Modal */}
            {selectedMedia && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="max-w-6xl w-full glass rounded-[2.5rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col md:flex-row max-h-[90vh]">
                        {/* Player Column */}
                        <div className="flex-[2] bg-black relative flex items-center justify-center">
                            <video
                                src={selectedMedia.url}
                                poster={selectedMedia.thumbnail}
                                controls
                                autoPlay
                                className="w-full h-full max-h-[80vh] object-contain"
                            />
                            <button
                                onClick={() => setSelectedMedia(null)}
                                className="absolute top-4 left-4 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all border border-white/10"
                            >
                                {getIcon('X', 20)}
                            </button>
                        </div>

                        {/* Intel Column */}
                        <div className="flex-1 p-8 flex flex-col border-l border-white/10 bg-secondary/50">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest ${selectedMedia.type === 'CLIP' ? 'bg-primary text-black' : 'bg-red-500 text-white'}`}>
                                        {selectedMedia.type}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">SIGNAL_ID: {selectedMedia._id.slice(-8)}</span>
                                </div>

                                <h2 className="text-2xl font-orbitron font-black text-white mb-2 leading-tight uppercase">{selectedMedia.title}</h2>
                                <p className="text-primary font-mono text-xs mb-8 uppercase tracking-widest">{selectedMedia.game}</p>

                                <div className="flex items-center gap-4 mb-8 bg-black/20 p-4 rounded-2xl border border-white/5">
                                    <img src={selectedMedia.userId.avatar} className="w-12 h-12 rounded-xl border border-white/10" />
                                    <div>
                                        <p className="text-sm font-bold text-white uppercase">{selectedMedia.userId.username}</p>
                                        <p className="text-[10px] font-mono text-slate-500 uppercase">Field Operator</p>
                                    </div>
                                    <button className="ml-auto px-4 py-2 bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] rounded-lg hover:bg-primary/20 transition-all uppercase">Link_Node</button>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">Views</p>
                                        <p className="text-lg font-bold text-white">{selectedMedia.stats.views.toLocaleString()}</p>
                                    </div>
                                    <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">Likes</p>
                                        <p className="text-lg font-bold text-primary">{selectedMedia.stats.likes.length}</p>
                                    </div>
                                    <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">Gifts</p>
                                        <p className="text-lg font-bold text-amber-500">{selectedMedia.stats.gifts.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    className="flex-1 py-4 bg-primary text-black font-orbitron font-black text-xs rounded-xl uppercase tracking-widest hover:bg-accent transition-all flex items-center justify-center gap-2"
                                    onClick={() => onInteract?.(selectedMedia._id, 'LIKE')}
                                >
                                    {getIcon('Heart', 18)} APPROVE_INTEL
                                </button>
                                <button
                                    className="flex-1 py-4 bg-amber-500/10 border border-amber-500/30 text-amber-500 font-orbitron font-black text-xs rounded-xl uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
                                    onClick={() => onInteract?.(selectedMedia._id, 'GIFT', 100)}
                                >
                                    {getIcon('Zap', 18)} TRANSMIT_GIFT
                                </button>
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="p-4 bg-red-600/10 border border-red-600/30 text-red-500 rounded-xl hover:bg-red-600/20 transition-all flex items-center justify-center"
                                    title="Report Violation"
                                >
                                    {getIcon('ShieldAlert', 20)}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedMedia && (
                <ReportModal
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                    targetType="MEDIA"
                    targetId={selectedMedia._id}
                    targetName={selectedMedia.title}
                    reporterId={currentUser.id}
                />
            )}
        </div>
    );
};

export default MediaGallery;
