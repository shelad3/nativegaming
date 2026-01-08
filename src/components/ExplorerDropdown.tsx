import React, { useState, useEffect, useRef } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { User } from '../types';

interface ExplorerDropdownProps {
    currentUser: User | null;
    onNavigateProfile: (userId: string) => void;
    onClose: () => void;
}

const ExplorerDropdown: React.FC<ExplorerDropdownProps> = ({ currentUser, onNavigateProfile, onClose }) => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (!search.trim()) {
            setResults([]);
            return;
        }

        const fetchUsers = async () => {
            setLoading(true);
            try {
                const users = await backendService.searchUsers(search);
                // Filter out self if logged in
                setResults(currentUser ? users.filter(u => u.id !== currentUser.id) : users);
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(fetchUsers, 300);
        return () => clearTimeout(debounce);
    }, [search, currentUser]);

    return (
        <div className="fixed right-24 top-1/2 -translate-y-1/2 w-96 glass border border-primary/20 rounded-[2.5rem] p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-right-12 duration-500 z-50 flex flex-col max-h-[70vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-sm font-orbitron font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        {getIcon('Search', 16)}
                        Node_Explorer
                    </h3>
                    <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">Scanning_Global_Mesh</p>
                </div>
                <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-slate-500 hover:text-white">
                    {getIcon('X', 14)}
                </button>
            </div>

            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-4 flex items-center text-primary/50">
                    {getIcon('Database', 16)}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="SEARCH_OPERATORS..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 font-mono text-xs text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-700"
                />
                {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {results.map(u => (
                    <div
                        key={u.id}
                        onClick={() => { onNavigateProfile(u.id); onClose(); }}
                        className="flex items-center gap-4 p-3 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/30 rounded-2xl transition-all cursor-pointer group"
                    >
                        <div className="w-10 h-10 rounded-full border border-white/10 group-hover:border-primary/50 p-0.5 overflow-hidden transition-all shrink-0">
                            <img src={u.avatar} alt={u.username} className="w-full h-full object-cover rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">{u.username}</span>
                                {u.isLive && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(239,68,68,1)]"></span>}
                            </div>
                            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter truncate">{u.archetype || 'Operator'}</p>
                        </div>
                    </div>
                ))}

                {!loading && search && results.length === 0 && (
                    <div className="py-10 text-center">
                        <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest">Signal_Lost: No_Matches_Found</p>
                    </div>
                )}

                {!search && (
                    <div className="py-10 text-center space-y-4">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-700">
                            {getIcon('Search', 24)}
                        </div>
                        <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest">Enter_Signal_To_Begin_Scan</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExplorerDropdown;
