
import React, { useState } from 'react';
import { X, Upload, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { User, Post } from '../types';
import { backendService } from '../services/backendService';

interface CreatePostModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (post: Post) => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ user, isOpen, onClose, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);

        try {
            let thumbnailUrl = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800'; // Default

            if (mediaFile) {
                thumbnailUrl = await backendService.uploadAsset(mediaFile, (p) => setProgress(p));
            }

            const newPost = await backendService.createPost({
                authorId: user.id,
                authorName: user.username,
                authorAvatar: user.avatar,
                title,
                content,
                thumbnail: thumbnailUrl,
                timestamp: new Date().toISOString()
            });

            onSuccess(newPost);
            onClose();
            // Reset
            setTitle('');
            setContent('');
            setMediaFile(null);
        } catch (err) {
            console.error('Failed to transmit post node:', err);
        } finally {
            setIsUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-xl bg-surface border-2 border-primary/20 rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(5,217,255,0.3)]">
                {/* Header decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-orbitron font-bold text-white tracking-widest flex items-center gap-2">
                            <Rocket className="text-primary w-6 h-6" />
                            UPLOAD_POST://
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-primary uppercase tracking-[0.3em]">Title_Node</label>
                            <input
                                required
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter transmission subject..."
                                className="w-full bg-secondary/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-primary uppercase tracking-[0.3em]">Data_Content</label>
                            <textarea
                                required
                                rows={4}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Initialize content bridge..."
                                className="w-full bg-secondary/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all font-mono resize-none"
                            ></textarea>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-primary uppercase tracking-[0.3em]">Visual_Interface</label>
                            <div
                                className={`relative border-2 border-dashed border-white/10 rounded-xl p-8 transition-all hover:border-primary/30 flex flex-col items-center gap-3 cursor-pointer overflow-hidden ${mediaFile ? 'bg-primary/5' : 'bg-secondary/30'}`}
                                onClick={() => document.getElementById('media-upload')?.click()}
                            >
                                {mediaFile ? (
                                    <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                                        <ShieldCheck className="text-primary w-8 h-8 mb-2" />
                                        <span className="text-sm text-white font-mono">{mediaFile.name}</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Ready_For_Upload</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="text-slate-500 w-8 h-8" />
                                        <span className="text-sm text-slate-400 font-mono tracking-tight">DROP_OR_SELECT_FILE</span>
                                        <span className="text-[10px] text-slate-600 uppercase tracking-widest">Image / VOD Format Supported</span>
                                    </>
                                )}
                                <input
                                    id="media-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                                />
                            </div>
                        </div>

                        {isUploading && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between text-[10px] font-mono text-primary uppercase tracking-widest">
                                    <span>Uploading_Stream...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary shadow-[0_0_10px_#05d9ff] transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-orbitron text-[10px] font-bold rounded-lg transition-all border border-white/10 uppercase tracking-widest"
                            >
                                Abort_System
                            </button>
                            <button
                                disabled={isUploading}
                                type="submit"
                                className="flex-3 py-3 bg-primary text-black font-orbitron text-[10px] font-bold rounded-lg transition-all hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-[0_0_20px_rgba(5,217,255,0.2)] flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        TRANSMITTING...
                                    </span>
                                ) : (
                                    <>
                                        <Sparkles size={14} />
                                        EXECUTE_UPLOAD
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreatePostModal;
