
import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { User } from '../types';

interface ArenaProps {
    user: User;
}

const Arena: React.FC<ArenaProps> = ({ user: initialUser }) => {
    const [user, setUser] = useState(initialUser);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState<string | null>(null);

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        setLoading(true);
        try {
            const data = await backendService.getTournaments();
            setTournaments(data);
        } catch (err) {
            console.error('Failed to fetch tournaments', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (tournamentId: string) => {
        setRegistering(tournamentId);
        try {
            const updatedUser = await backendService.registerForTournament(user.id, tournamentId);
            setUser(updatedUser);
            // Optional: Refresh tournaments to see updated participant count
            fetchTournaments();
        } catch (err) {
            console.error('Registration failure', err);
            alert('Failed to register for tournament.');
        } finally {
            setRegistering(null);
        }
    };

    const viewBracket = async (tournament: any) => {
        setSelectedTournament(tournament);
        try {
            const data = await backendService.getMatches(tournament._id);
            setMatches(data);
        } catch (err) {
            console.error('Failed to fetch matches', err);
        }
    };

    if (selectedTournament) {
        return (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedTournament(null)}
                        className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                    >
                        {getIcon('ArrowLeft', 20)}
                    </button>
                    <div>
                        <h2 className="text-3xl font-orbitron font-bold text-white uppercase tracking-tighter">{selectedTournament.name}</h2>
                        <p className="text-xs font-mono text-primary uppercase tracking-[0.3em]">Bracket_Protocol_Active</p>
                    </div>
                </div>

                <div className="glass p-8 rounded-[40px] border border-white/5 min-h-[500px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        {getIcon('Shield', 150)}
                    </div>

                    {matches.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                            {getIcon('Cpu', 48)}
                            <div className="space-y-2">
                                <p className="font-orbitron font-bold text-xl uppercase">Awaiting_Generation</p>
                                <p className="font-mono text-xs uppercase tracking-widest">Matches will be broadcast once registration closes.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                            {matches.map((match, i) => (
                                <div key={match._id} className="bg-black/40 border border-white/10 rounded-3xl p-6 hover:border-primary/30 transition-all group">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-[10px] font-mono text-slate-500 uppercase">Round {match.round}</span>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${match.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary animate-pulse'}`}>
                                            {match.status}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${match.winnerId === match.player1Id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-transparent'}`}>
                                            <span className="text-sm font-bold text-white uppercase">{match.player1Id?.username || 'TBD'}</span>
                                            {match.winnerId === match.player1Id && <span className="text-[10px] text-emerald-500 font-black">WIN</span>}
                                        </div>
                                        <div className="flex justify-center">
                                            <span className="text-[10px] font-mono text-slate-600">VS</span>
                                        </div>
                                        <div className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${match.winnerId === match.player2Id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-transparent'}`}>
                                            <span className="text-sm font-bold text-white uppercase">{match.player2Id?.username || 'TBD'}</span>
                                            {match.winnerId === match.player2Id && <span className="text-[10px] text-emerald-500 font-black">WIN</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter mb-2">Arena_Operations</h2>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.3em]">Global_Competitive_Mesh_Initialized</p>
                </div>
                <div className="flex gap-4">
                    {/* Filter/Sort options could go here */}
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 opacity-50">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Scanning_Registry...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {tournaments.length === 0 ? (
                        <div className="col-span-full py-20 text-center opacity-30">
                            <p className="font-mono text-xs uppercase tracking-[0.5em]">No_Tournament_Signals_Detected</p>
                        </div>
                    ) : (
                        tournaments.map(t => {
                            const isRegistered = user.registeredTournaments?.includes(t.id || t._id);
                            const isFull = t.participants.length >= t.maxParticipants;

                            return (
                                <div key={t._id} className={`bg-surface border rounded-[40px] p-8 group transition-all relative overflow-hidden ${isRegistered ? 'border-primary bg-primary/5 shadow-[0_0_30px_rgba(0,255,0,0.05)]' : 'border-white/5 hover:border-primary/40'}`}>
                                    {isRegistered && (
                                        <div className="absolute top-0 right-10 bg-primary text-black px-4 py-1 rounded-b-xl font-orbitron font-black text-[8px] uppercase tracking-widest shadow-lg">
                                            Registered
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-[0.2em]">{t.status}</span>
                                                <h3 className="text-2xl font-orbitron font-black text-white uppercase tracking-tighter leading-none">{t.name}</h3>
                                            </div>
                                            <span className="text-amber-500 font-orbitron font-black text-xl">{t.prize}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                                                <p className="text-[8px] font-mono text-slate-500 uppercase mb-1">Domain</p>
                                                <p className="text-xs font-bold text-white truncate">{t.game}</p>
                                            </div>
                                            <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                                                <p className="text-[8px] font-mono text-slate-500 uppercase mb-1">Force_Size</p>
                                                <p className="text-xs font-bold text-white">{t.participants.length} / {t.maxParticipants}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => !isRegistered && !isFull && handleRegister(t.id || t._id)}
                                                disabled={isRegistered || isFull || registering === (t.id || t._id)}
                                                className={`flex-1 py-4 font-orbitron text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest ${isRegistered
                                                    ? 'bg-primary/20 text-primary cursor-default'
                                                    : isFull
                                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                        : 'bg-primary text-black hover:bg-accent hover:scale-[1.02] active:scale-95 shadow-xl'
                                                    }`}
                                            >
                                                {registering === (t.id || t._id) ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                                        <span>Syncing...</span>
                                                    </div>
                                                ) : isRegistered ? 'Node_Linked' : isFull ? 'Domain_Full' : 'Link_Node'}
                                            </button>

                                            {isRegistered && (
                                                <button
                                                    onClick={() => viewBracket(t)}
                                                    className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all font-orbitron text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    {getIcon('Monitor', 16)}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default Arena;
