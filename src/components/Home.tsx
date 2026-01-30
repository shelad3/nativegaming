import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { User, Post, Tournament } from '../types';
import CreatePostModal from './CreatePostModal';
import { motion } from 'framer-motion';

interface HomeProps {
  user: User;
  onNavigate: (tab: string) => void;
  onNavigateProfile: (userId: string) => void;
  onWatchStream: (streamData: { broadcasterId: string, peerId: string, title: string }) => void;
}

const Home: React.FC<HomeProps> = ({ user, onNavigate, onNavigateProfile, onWatchStream }) => {
  // State
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [liveUsers, setLiveUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lData, pData, liveData, tData] = await Promise.all([
          backendService.getLeaderboard(),
          backendService.getGlobalPosts(),
          backendService.getLiveUsers(),
          backendService.getTournaments()
        ]);
        setLeaderboard(lData);
        setPosts(pData);
        setLiveUsers(liveData);
        setTournaments(tData);
      } catch (err) {
        console.error('Failed to sync Nexus nodes', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePostSuccess = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'LEGEND': return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
      case 'ELITE': return 'text-purple-500 border-purple-500/50 bg-purple-500/10';
      case 'PREMIUM': return 'text-blue-500 border-blue-500/50 bg-blue-500/10';
      default: return 'text-slate-400 border-slate-500/50 bg-slate-500/10';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <CreatePostModal
        user={user}
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={handlePostSuccess}
      />

      {/* --- COMMAND HEADER (Personalized) --- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Stats Card */}
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-8 flex items-center justify-between group shadow-xl">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="relative">
              <img src={user.avatar} className="w-24 h-24 rounded-2xl border-2 border-white/10 shadow-xl" alt="" />
              <div className={`absolute -bottom-3 -right-3 px-3 py-1 rounded-lg border backdrop-blur-md text-xs font-black font-orbitron uppercase ${getTierColor(user.tier)}`}>
                {user.tier}
              </div>
            </div>
            <div>
              <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-1">Welcome back, Operator</p>
              <h1 className="text-3xl md:text-4xl font-black font-orbitron text-white uppercase tracking-tighter">{user.username}</h1>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg border border-white/5">
                  <span className="text-primary">{getIcon('Zap', 14)}</span>
                  <span className="text-sm font-bold text-white font-mono">{user.codeBits.toLocaleString()} <span className="text-slate-500 text-[10px]">BITS</span></span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg border border-white/5">
                  <span className="text-yellow-500">{getIcon('Trophy', 14)}</span>
                  <span className="text-sm font-bold text-white font-mono">{user.stats?.rating || 0} <span className="text-slate-500 text-[10px]">ELO</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Status / Missions */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-orbitron font-bold text-white uppercase text-sm">Daily Protocol</h3>
            <span className="text-[10px] font-mono text-slate-500">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center">{getIcon('Check', 16)}</div>
              <div>
                <p className="text-xs font-bold text-white">System Login</p>
                <p className="text-[10px] text-slate-500 font-mono">+50 BITS REWARDED</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 opacity-60">
              <div className="w-8 h-8 rounded-lg bg-white/5 text-slate-500 flex items-center justify-center border border-white/5">2</div>
              <div>
                <p className="text-xs font-bold text-white">Broadcast Stream</p>
                <p className="text-[10px] text-slate-500 font-mono">PENDING (30 MIN)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: FEED (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-orbitron font-black text-white uppercase flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              Tactical Feed
            </h2>
          </div>

          {/* Mobile Create Post (Visible only on small screens) */}
          <div className="md:hidden">
            <button onClick={() => setIsPostModalOpen(true)} className="w-full py-4 bg-white/5 border border-dashed border-white/20 rounded-2xl text-slate-400 font-mono text-xs uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              {getIcon('Plus', 16)} Transmit Update
            </button>
          </div>

          <div className="space-y-6">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all group"
              >
                {/* Post Header */}
                <div className="p-4 flex items-center gap-3 border-b border-white/5">
                  <div className="relative cursor-pointer" onClick={() => onNavigateProfile(post.authorId)}>
                    <img src={post.authorAvatar} className="w-10 h-10 rounded-full border border-white/10" alt="" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white hover:text-primary transition-colors cursor-pointer" onClick={() => onNavigateProfile(post.authorId)}>{post.authorName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{new Date(post.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="aspect-video relative bg-black/50 overflow-hidden cursor-pointer group-hover:bg-black/40 transition-colors">
                  {post.thumbnail ? (
                    <>
                      <img src={post.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-primary/90 text-black flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
                          {getIcon('Play', 24)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-slate-600 font-mono text-xs uppercase">Text Transmission</p>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">{post.content}</p>

                  <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                    <button className="flex items-center gap-2 text-slate-400 text-xs hover:text-primary transition-colors">
                      {getIcon('Heart', 16)} <span>{post.likes?.length || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-slate-400 text-xs hover:text-white transition-colors">
                      {getIcon('MessageSquare', 16)} <span>Reply</span>
                    </button>
                    <button className="flex items-center gap-2 text-slate-400 text-xs hover:text-white transition-colors ml-auto">
                      {getIcon('Share2', 16)} <span>Share</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {posts.length === 0 && (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                <p className="text-slate-500 font-mono uppercase text-xs">Signal Silence. No Transmissions.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WIDGETS (4 cols) */}
        <div className="lg:col-span-4 space-y-8">

          {/* Live Operations Widget */}
          <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-orbitron font-bold text-white uppercase text-sm flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Live Ops
              </h3>
              <span className="text-[10px] font-mono text-slate-500 bg-black/20 px-2 py-1 rounded">{liveUsers.length} ONLINE</span>
            </div>
            <div className="space-y-3">
              {liveUsers.slice(0, 4).map(u => (
                <div key={u.id}
                  onClick={() => onWatchStream({ broadcasterId: u.id, peerId: u.peerId || '', title: u.streamTitle || 'Stream' })}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <img src={u.avatar} className="w-10 h-10 rounded-lg object-cover border border-white/5 group-hover:border-primary/50 transition-colors" alt="" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{u.username}</p>
                    <p className="text-[9px] font-mono text-slate-400 truncate uppercase">{u.streamTitle || 'Classified'}</p>
                  </div>
                  <div className="text-[10px] text-red-500">{getIcon('Radio', 14)}</div>
                </div>
              ))}
              {liveUsers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[10px] font-mono text-slate-600 uppercase">Sector Quiet</p>
                </div>
              )}
            </div>
            <button onClick={() => onNavigate('studio')} className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-slate-400 hover:text-white uppercase rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2">
              {getIcon('Wifi', 14)} Start Broadcast
            </button>
          </div>

          {/* War Room (Tournaments) Widget */}
          <div className="bg-black/20 border border-white/5 rounded-3xl p-6">
            <h3 className="font-orbitron font-bold text-white uppercase text-sm mb-4 flex items-center gap-2">
              {getIcon('Crosshair', 16)} War Room
            </h3>
            <div className="space-y-3">
              {tournaments.slice(0, 3).map(t => (
                <div key={t.id} className="p-3 bg-gradient-to-br from-surface to-black border border-white/5 rounded-xl hover:border-primary/30 transition-all cursor-pointer" onClick={() => onNavigate('tournaments')}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-white uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded">{t.game}</span>
                    <span className="text-[10px] font-mono text-yellow-500">{t.prize}</span>
                  </div>
                  <p className="text-xs font-bold text-white mb-1 line-clamp-1">{t.name}</p>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                    <span>{new Date(t.startDate).toLocaleDateString()}</span>
                    <span className={`${t.status === 'REGISTRATION' ? 'text-green-400' : 'text-slate-400'}`}>{t.status}</span>
                  </div>
                </div>
              ))}
              {tournaments.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[10px] font-mono text-slate-600 uppercase">Peace Times</p>
                </div>
              )}
            </div>
            <button onClick={() => onNavigate('tournaments')} className="w-full mt-4 py-3 bg-primary/10 hover:bg-primary/20 text-[10px] font-mono text-primary uppercase rounded-xl transition-all border border-primary/20">
              View Operations
            </button>
          </div>

          {/* Leaderboard Teaser */}
          <div className="bg-secondary/20 border border-white/5 rounded-3xl p-6">
            <h3 className="font-orbitron font-bold text-white uppercase text-sm mb-4">Top Operatives</h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 3).map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer" onClick={() => onNavigateProfile(u.id)}>
                  <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-black rounded ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}>{i + 1}</span>
                  <img src={u.avatar} className="w-8 h-8 rounded-full" alt="" />
                  <span className="text-xs font-bold text-white truncate flex-1">{u.username}</span>
                  <span className="text-[10px] font-mono text-slate-500">{u.stats?.rating}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
