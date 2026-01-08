import React, { useState } from 'react';
import { getIcon } from '../constants';
import { User } from '../types';

interface CreateClanModalProps {
    user: User;
    onClose: () => void;
    onSuccess: (clanId: string) => void;
}

const CreateClanModal: React.FC<CreateClanModalProps> = ({ user, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [description, setDescription] = useState('');
    const [avatar, setAvatar] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const CLAN_CREATION_COST = 1000;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (user.codeBits < CLAN_CREATION_COST) {
            setError('Insufficient CodeBits to create a clan.');
            return;
        }

        if (name.length < 3 || name.length > 20) {
            setError('Clan name must be between 3 and 20 characters.');
            return;
        }

        if (tag.length < 2 || tag.length > 5) {
            setError('Clan tag must be between 2 and 5 characters.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/clans/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    name,
                    tag: tag.toUpperCase(),
                    description,
                    avatar: avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${tag}`
                })
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess(data._id);
            } else {
                setError(data.error || 'Failed to create clan');
            }
        } catch (err) {
            console.error('[CREATE_CLAN] Error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="glass rounded-3xl border border-white/10 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-orbitron font-black text-white uppercase flex items-center gap-2">
                            {getIcon('Plus', 20)}
                            Establish New Clan
                        </h2>
                        <p className="text-xs font-mono text-slate-500 mt-1">Cost: {CLAN_CREATION_COST} CodeBits</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        {getIcon('X', 24)}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-500 text-xs font-mono flex items-center gap-2 animate-pulse">
                            {getIcon('AlertTriangle', 16)}
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase ml-2">Clan Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Cyber Reapers"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-primary text-white"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase ml-2">Clan Tag</label>
                            <input
                                type="text"
                                required
                                maxLength={5}
                                value={tag}
                                onChange={(e) => setTag(e.target.value.toUpperCase())}
                                placeholder="CYBR"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-primary text-white uppercase text-center"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-slate-500 uppercase ml-2">Legacy (Description)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your clan's mission..."
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-primary text-white resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-slate-500 uppercase ml-2">Standard (Avatar URL)</label>
                        <input
                            type="url"
                            value={avatar}
                            onChange={(e) => setAvatar(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-primary text-white"
                        />
                        <p className="text-[10px] text-slate-500 ml-2 italic">Leave blank for a generated sigil.</p>
                    </div>

                    {/* Preview */}
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                        <p className="text-[10px] font-mono text-slate-500 uppercase mb-3 text-center">Chat Identity Preview</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary/30">
                                <img
                                    src={avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${tag || 'clan'}`}
                                    className="w-full h-full object-cover"
                                    alt="Clan Preview"
                                />
                            </div>
                            <div className="font-mono text-sm">
                                <span className="text-primary font-bold mr-2">[{tag || 'TAG'}]</span>
                                <span className="text-white font-bold">{user.username}:</span>
                                <span className="text-slate-400 ml-2">Ready for deployment.</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || user.codeBits < CLAN_CREATION_COST}
                        className={`w-full py-4 text-black font-orbitron font-black text-sm rounded-xl uppercase transition-all flex items-center justify-center gap-2 ${loading || user.codeBits < CLAN_CREATION_COST
                                ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                                : 'bg-primary hover:bg-emerald-400'
                            }`}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        ) : (
                            <>
                                {getIcon('Zap', 18)}
                                Authorize Creation
                            </>
                        )}
                    </button>

                    {user.codeBits < CLAN_CREATION_COST && (
                        <p className="text-[10px] text-red-400 text-center font-mono">
                            You need {CLAN_CREATION_COST - user.codeBits} more CodeBits to establish a clan.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CreateClanModal;
