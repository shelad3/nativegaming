import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getIcon } from '../constants';
import { User } from '../types';
import { backendService } from '../services/backendService';

interface Theme {
    _id: string;
    name: string;
    type: 'banner' | 'animation' | 'effect' | 'bundle';
    price: number;
    description: string;
    previewUrl: string;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    assets: any;
}

interface ThemeStoreProps {
    user: User;
    onUpdateUser: (user: User) => void;
    onClose: () => void;
}

const ThemeStore: React.FC<ThemeStoreProps> = ({ user, onUpdateUser, onClose }) => {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetchThemes();
    }, []);

    const fetchThemes = async () => {
        try {
            const data = await backendService.getStoreThemes();
            setThemes(data);
        } catch (err) {
            console.error('[STORE] Sync failure:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (theme: Theme) => {
        if (user.codeBits < theme.price) {
            alert('Insufficient CodeBits for this aesthetic upgrade.');
            return;
        }

        setPurchasing(theme._id);
        try {
            const updatedUser = await backendService.purchaseTheme(user.id, theme._id);
            onUpdateUser(updatedUser);
            alert(`${theme.name} protocol acquired. Syncing with inventory...`);
        } catch (err) {
            alert('Connection to store node lost.');
        } finally {
            setPurchasing(null);
        }
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'Legendary': return 'text-amber-500 border-amber-500/30 bg-amber-500/5';
            case 'Epic': return 'text-purple-500 border-purple-500/30 bg-purple-500/5';
            case 'Rare': return 'text-blue-500 border-blue-500/30 bg-blue-500/5';
            default: return 'text-slate-400 border-white/10 bg-white/5';
        }
    };

    const filteredThemes = filter === 'All' ? themes : themes.filter(t => t.type === filter.toLowerCase());

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="glass rounded-[3rem] border border-primary/20 p-8 max-w-6xl w-full h-[90vh] flex flex-col shadow-[0_0_100px_rgba(16,185,129,0.1)]">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 shrink-0">
                    <div>
                        <h2 className="text-4xl font-orbitron font-black text-white italic uppercase tracking-tighter">Aesthetic_Armor_Store</h2>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.3em]">Protocol: Visual_Superiority</span>
                            <div className="h-px w-12 bg-white/10 text-slate-500"></div>
                            <span className="text-[10px] font-mono text-amber-500 uppercase tracking-[0.3em]">Balance: {user.codeBits.toLocaleString()} Ȼ</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-500 hover:text-white">
                        {getIcon('X', 24)}
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-8 shrink-0">
                    {['All', 'Banner', 'Animation', 'Bundle'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all border ${filter === f ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <motion.div
                            layout
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {filteredThemes.map((theme, i) => {
                                const isOwned = user.ownedThemes.includes(theme._id);
                                return (
                                    <motion.div
                                        key={theme._id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        whileHover={{ y: -5, borderColor: 'var(--primary)' }}
                                        className="glass rounded-3xl border border-white/5 p-5 group transition-all flex flex-col h-full bg-white/[0.02]"
                                    >
                                        <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 border border-white/5">
                                            <img src={theme.previewUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            <motion.div
                                                animate={{
                                                    opacity: [0, 0.2, 0],
                                                    scale: [1, 1.05, 1]
                                                }}
                                                transition={{ duration: 4, repeat: Infinity }}
                                                className="absolute inset-0 bg-primary/20 pointer-events-none"
                                            />
                                            <div className="absolute top-3 left-3">
                                                <span className={`px-2 py-1 rounded text-[8px] font-bold border uppercase tracking-wider ${getRarityColor(theme.rarity)}`}>
                                                    {theme.rarity}
                                                </span>
                                            </div>
                                            <div className="absolute bottom-3 right-3">
                                                <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-mono text-primary border border-white/10 uppercase">
                                                    {theme.type}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-orbitron font-black text-white mb-2 uppercase tracking-tighter">{theme.name}</h3>
                                        <p className="text-xs text-slate-500 font-mono mb-6 flex-1 line-clamp-2">{theme.description}</p>

                                        <div className="flex items-center justify-between gap-4 mt-auto">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-mono text-slate-500 uppercase">Cost</span>
                                                <span className="text-lg font-mono font-bold text-amber-500">{theme.price.toLocaleString()} Ȼ</span>
                                            </div>
                                            <button
                                                onClick={() => !isOwned && handlePurchase(theme)}
                                                disabled={isOwned || purchasing === theme._id}
                                                className={`flex-1 py-4 rounded-xl font-orbitron font-bold text-[10px] uppercase tracking-widest transition-all ${isOwned
                                                    ? 'bg-slate-900 border border-slate-700 text-slate-500 cursor-default'
                                                    : 'bg-primary text-black hover:bg-accent shadow-lg shadow-primary/10 hover:shadow-primary/30'
                                                    }`}
                                            >
                                                {purchasing === theme._id ? 'SYNCING...' : isOwned ? 'OWNED_ASSET' : 'ACQUIRE_PROTOCOL'}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThemeStore;
