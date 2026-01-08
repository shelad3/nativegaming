
import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { User } from '../types';

interface ExplorerProps {
  currentUser: User;
  onNavigateProfile: (userId: string) => void;
}

const Explorer: React.FC<ExplorerProps> = ({ currentUser, onNavigateProfile }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [liveUsers, setLiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const users = await backendService.getLiveUsers();
        setLiveUsers(users.filter(u => u.id !== currentUser.id));
      } catch (err) {
        console.error('Failed to fetch live users', err);
      }
    };
    fetchLive();
  }, [currentUser.id]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const users = await backendService.searchUsers(search);
      // Filter out self
      setResults(users.filter(u => u.id !== currentUser.id));
      setLoading(false);
    };
    const debounce = setTimeout(fetchUsers, 400);
    return () => clearTimeout(debounce);
  }, [search, currentUser.id]);

  const handleFollow = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    setFollowLoading(targetId);
    try {
      await backendService.toggleFollow(currentUser.id, targetId);
      // Refresh search or live users to reflect state
      // In a real app we'd update global state or local list
      if (search) {
        const users = await backendService.searchUsers(search);
        setResults(users.filter(u => u.id !== currentUser.id));
      }
      const live = await backendService.getLiveUsers();
      setLiveUsers(live.filter(u => u.id !== currentUser.id));
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter">Node_Explorer</h2>
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center text-primary group-focus-within:neon-text transition-all">
            {getIcon('Users', 20)}
          </div>
          <input
            type="text"
            placeholder="SCAN_MESH_FOR_OPERATORS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-2xl pl-12 pr-6 py-5 font-mono text-sm text-white focus:border-primary focus:outline-none transition-all placeholder:text-slate-800"
          />
        </div>
      </div>

      {!search && liveUsers.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
            <h3 className="text-xs font-orbitron font-black text-white uppercase tracking-widest">Live_Nodes_In_Sector</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {liveUsers.map(u => (
              <div
                key={u.id}
                onClick={() => onNavigateProfile(u.id)}
                className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 hover:border-red-500/30 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-red-500/20 p-0.5 group-hover:border-red-500/50 transition-all overflow-hidden">
                    <img src={u.avatar} alt={u.username} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{u.username}</p>
                    <p className="text-[8px] font-mono text-red-400 uppercase tracking-tighter">BROADCASTING_LIVE</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-20 gap-4 opacity-50">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="font-mono text-[10px] tracking-widest uppercase text-primary">Deciphering_Node_Metadata...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.length > 0 ? results.map(u => (
            <div
              key={u.id}
              onClick={() => onNavigateProfile(u.id)}
              className="bg-surface/50 border border-white/5 rounded-3xl p-6 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-primary/20 p-1 group-hover:border-primary transition-colors overflow-hidden">
                  <img src={u.avatar} alt={u.username} className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-lg font-orbitron font-bold text-white uppercase truncate">{u.username}</h3>
                  <p className="text-[10px] font-mono text-primary uppercase tracking-widest truncate">{u.archetype || 'GHOST_OPERATOR'}</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-xs text-slate-500 font-mono line-clamp-2 italic mb-4">"{u.bio}"</p>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-xs font-bold text-white">{u.followers.length}</p>
                      <p className="text-[8px] font-mono text-slate-600 uppercase">Followers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-white">{u.stats.rating}</p>
                      <p className="text-[8px] font-mono text-slate-600 uppercase">Rating</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleFollow(e, u.id)}
                    disabled={followLoading === u.id}
                    className={`px-4 py-1.5 border text-[10px] font-mono rounded transition-all uppercase flex items-center gap-2 ${currentUser.following.includes(u.id)
                      ? 'bg-white/5 border-white/20 text-slate-400'
                      : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                      }`}
                  >
                    {followLoading === u.id ? <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div> : (currentUser.following.includes(u.id) ? 'LINKED' : 'LINK_NODE')}
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center text-slate-700 font-mono text-xs uppercase tracking-widest">
              EMPTY_SECTOR: NO_OPERATORS_FOUND
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Explorer;
