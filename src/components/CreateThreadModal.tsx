import React, { useState } from 'react';
import { getIcon } from '../constants';
import { User as UserType } from '../types';

interface CreateThreadModalProps {
    user: UserType;
    categoryId: string;
    onClose: () => void;
    onSuccess: (threadId: string) => void;
}

const CreateThreadModal: React.FC<CreateThreadModalProps> = ({ user, categoryId, onClose, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/forums/threads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    categoryId,
                    title: title.trim(),
                    content: content.trim()
                })
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess(data._id);
            } else {
                setError(data.error || 'Failed to initialize thread sector.');
            }
        } catch (err) {
            console.error('[FORUM] Create thread error:', err);
            setError('System link failure. Please retry.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="glass rounded-[40px] border border-white/10 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Decoration */}
                <div className="h-2 bg-gradient-to-r from-primary/0 via-primary to-primary/0"></div>

                <div className="p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-orbitron font-black text-white uppercase tracking-tighter">Initialize_Thread</h2>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-1">Establishing Secure Sector Comms</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-500 hover:text-white"
                        >
                            {getIcon('X', 24)}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 text-red-500 text-xs font-mono flex items-center gap-3 mb-6 animate-pulse">
                            {getIcon('AlertTriangle', 18)}
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase ml-2 tracking-widest">Signal_Title</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter operation codename..."
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase ml-2 tracking-widest">Payload_Data (Description)</label>
                            <textarea
                                required
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Input core intelligence data..."
                                rows={8}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary resize-none transition-all"
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-orbitron font-black text-xs rounded-2xl uppercase transition-all"
                            >
                                Abort_Operation
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !title.trim() || !content.trim()}
                                className={`flex-1 py-4 font-orbitron font-black text-xs rounded-2xl uppercase transition-all flex items-center justify-center gap-2 ${loading || !title.trim() || !content.trim()
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-primary text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                    }`}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Authorized_Transmission
                                        {getIcon('Zap', 16)}
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

export default CreateThreadModal;
