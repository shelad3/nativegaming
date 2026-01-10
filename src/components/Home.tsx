
import React, { useState, useEffect } from 'react';
import { getIcon, MOCK_TOURNAMENTS } from '../constants';
import { backendService } from '../services/backendService';
import { User, Post } from '../types';
import CreatePostModal from './CreatePostModal';
import ActivityFeed from './ActivityFeed';
import MediaGallery from './MediaGallery';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeProps {
  user: User;
  onNavigate: (tab: string) => void;
  onNavigateProfile: (userId: string) => void;
  onWatchStream: (streamData: { broadcasterId: string, peerId: string, title: string }) => void;
}

const Home: React.FC<HomeProps> = ({ user, onNavigate, onNavigateProfile, onWatchStream }) => {
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [liveUsers, setLiveUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingMedia, setTrendingMedia] = useState<any[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lData, pData, mData, liveData] = await Promise.all([
          backendService.getLeaderboard(),
          backendService.getGlobalPosts(),
          fetch('http://localhost:5000/api/media/trending?limit=4').then(r => r.json()),
          backendService.getLiveUsers()
        ]);
        setLeaderboard(lData);
        setPosts(pData);
        setTrendingMedia(mData);
        setLiveUsers(liveData);
      } catch (err) {
        console.error('Failed to pull core nodes', err);
      } finally {
        setIsLoadingPosts(false);
        setIsLoadingMedia(false);
      }
    };
    fetchData();
  }, []);

  const handlePostSuccess = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const startMatchmaking = () => {
    setIsMatchmaking(true);
    setMatchStatus("SYNCING_PLAYER_NODES...");

    setTimeout(() => setMatchStatus("ESTABLISHING_VPN_TUNNEL..."), 1500);
    setTimeout(() => setMatchStatus("MATCH_FOUND: [CS2_TOKYO_SERVER]"), 3000);
    setTimeout(() => {
      setIsMatchmaking(false);
      setMatchStatus(null);
    }, 5000);
  };

  const handleMediaInteraction = async (id: string, type: 'LIKE' | 'GIFT', amount?: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/media/${id}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, type, amount })
      });
      const updated = await response.json();
      setTrendingMedia(prev => prev.map(m => m._id === id ? updated : m));
    } catch (err) {
      console.error('[MEDIA] Interaction error:', err);
    }
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-1000">
      <CreatePostModal
        user={user}
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={handlePostSuccess}
      />

      {/* HERO SECTION - REBUILT FOR AAA AESTHETIC */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden rounded-[3rem] border border-white/5 shadow-2xl">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/80 to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,0,0.05),transparent_70%)]"></div>

          {/* Animated Mesh Grid */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
          }}></div>
        </div>

        <div className="relative z-10 container mx-auto px-8 py-20 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-[0.5em] font-bold">Nexus_Core_Online</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-6xl md:text-8xl lg:text-9xl font-orbitron font-black text-white mb-8 tracking-tighter leading-none"
          >
            THE FUTURE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x neon-text">
              OF_GAMING
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="max-w-2xl text-slate-400 text-lg md:text-xl font-mono mb-12 leading-relaxed opacity-80"
          >
            High-fidelity tournament protocols, ultra-low latency mesh-streaming, and a self-sovereign player economy. Built for the technically elite.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-6"
          >
            <button
              onClick={startMatchmaking}
              disabled={isMatchmaking}
              className="group relative px-10 py-5 bg-primary text-black font-orbitron font-black text-sm rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,255,0,0.3)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              {isMatchmaking ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
                  {matchStatus}
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  {getIcon('Zap', 20)}
                  INITIATE_NEXUS_SYNC
                </span>
              )}
            </button>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="px-10 py-5 bg-white/5 border border-white/10 backdrop-blur-xl text-white font-orbitron font-black text-sm rounded-2xl transition-all hover:bg-white/10 hover:border-white/20 flex items-center gap-3 group"
            >
              {getIcon('Plus', 20)}
              <span className="group-hover:tracking-widest transition-all">ESTABLISH_NODE</span>
            </button>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-12 mt-20 pt-12 border-t border-white/5 w-full max-w-4xl"
          >
            {[
              { label: 'Active_Nodes', value: '42.9K' },
              { label: 'Network_Ping', value: '0.04ms' },
              { label: 'Combat_Rating', value: 'ELO_2400' },
              { label: 'Mesh_Status', value: 'NOMINAL' },
            ].map((stat, i) => (
              <div key={i} className="text-center md:text-left">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-xl font-orbitron font-black text-white">{stat.value}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {user && (
        <div className="flex items-center justify-between mt-12 mb-8">
          <div>
            <h2 className="text-3xl font-orbitron font-black text-white italic uppercase tracking-tighter">Tactical_Dashboard</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[8px] font-mono rounded uppercase">Secure_Link</span>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Operator: {user.username}</p>
            </div>
          </div>
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-mono font-bold hover:bg-primary hover:text-black transition-all uppercase flex items-center gap-2 group"
          >
            {getIcon('Send', 16)}
            <span className="group-hover:translate-x-1 transition-transform">Push_Transmission</span>
          </button>
        </div>
      )}

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-16">

        {/* Main Feed - Spans 8 COLUMNS on Large Screens */}
        <div className="xl:col-span-8 space-y-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-orbitron font-bold text-white tracking-widest flex items-center gap-3">
              <span className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(0,255,0,0.5)]"></span>
              LIVE_MESH_CHRONICLE
            </h2>
            <div className="flex gap-2">
              <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all text-slate-400 hover:text-primary">
                {getIcon('Search', 16)}
              </button>
              <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all text-slate-400 hover:text-primary">
                {getIcon('Filter', 16)}
              </button>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {isLoadingPosts ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-surface/30 border border-white/5 h-64 rounded-3xl animate-pulse"></div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-1 gap-8">
                {posts.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group bg-surface/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-primary/20 transition-all duration-500 shadow-xl"
                  >
                    <div className="flex flex-col md:flex-row h-full">
                      <div className="md:w-2/5 relative overflow-hidden aspect-video md:aspect-auto">
                        <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-secondary/80 via-transparent to-transparent"></div>
                      </div>
                      <div className="flex-1 p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <img src={post.authorAvatar} alt={post.authorName} className="w-8 h-8 rounded-full border border-primary/30" />
                            <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest">{post.authorName}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-700"></span>
                            <span className="text-[9px] font-mono text-slate-500 uppercase">{new Date(post.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                          <h3 className="text-2xl font-orbitron font-black text-white mb-3 group-hover:neon-text transition-all duration-500">{post.title}</h3>
                          <p className="text-sm text-slate-400 font-mono line-clamp-2 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity italic">"{post.content}"</p>
                        </div>
                        <div className="flex justify-between items-center pt-8 mt-4 border-t border-white/5">
                          <div className="flex gap-8">
                            <button className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-mono text-[10px] font-bold group/btn">
                              {getIcon('Heart', 16)}
                              <span className="group-hover/btn:translate-x-1 transition-transform">{post.likes?.length || 0}</span>
                            </button>
                            <button className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-mono text-[10px] font-bold group/btn">
                              {getIcon('MessageSquare', 16)}
                              <span className="group-hover/btn:translate-x-1 transition-transform">12</span>
                            </button>
                          </div>
                          <button className="text-primary hover:text-accent transition-colors">
                            {getIcon('ArrowRight', 20)}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center gap-4 text-slate-600 bg-surface/20 rounded-[3rem] border border-dashed border-white/5">
                <div className="p-6 rounded-full bg-white/5 animate-pulse">
                  {getIcon('WifiOff', 48)}
                </div>
                <p className="font-mono text-sm uppercase tracking-[0.5em] italic">Mesh_Terminal_Idle</p>
                <button
                  onClick={() => setIsPostModalOpen(true)}
                  className="mt-6 px-10 py-4 border border-primary text-primary font-orbitron font-bold text-[10px] rounded-2xl hover:bg-primary hover:text-black transition-all uppercase tracking-widest"
                >
                  Broadcast_First_Signal
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* BENTO SIDEBAR - Spans 4 COLUMNS */}
        <div className="xl:col-span-4 space-y-8">

          {/* Bento Card 1: Live Transmissions */}
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-surface/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 text-primary rotate-12 group-hover:scale-110 transition-transform">
              {getIcon('Radio', 80)}
            </div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-orbitron text-white text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                {getIcon('Monitor', 24)} MESH_LIVE
              </h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-[8px] font-mono text-red-500 font-bold uppercase tracking-widest">Receiving</span>
              </div>
            </div>

            <div className="space-y-4">
              {liveUsers.length > 0 ? liveUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => u.peerId && onWatchStream({ broadcasterId: u.id, peerId: u.peerId, title: u.streamTitle || 'Tactical Feed' })}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group/stream"
                >
                  <div className="relative">
                    <img src={u.avatar} alt={u.username} className="w-12 h-12 rounded-full border-2 border-primary/20 group-hover/stream:border-primary transition-colors" />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-secondary animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-white uppercase group-hover/stream:text-primary transition-colors truncate">{u.username}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate uppercase tracking-widest">{u.streamTitle || 'UNIDENTIFIED_SIGNAL'}</p>
                  </div>
                  <div className="opacity-0 group-hover/stream:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <div className="bg-primary text-black p-2 rounded-xl">
                      {getIcon('Play', 14)}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-8 flex flex-col items-center gap-3 text-slate-700">
                  {getIcon('WifiOff', 32)}
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em]">No_Active_Nodes</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Bento Card 2: Arena Pulse */}
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-primary border border-primary shadow-[0_0_50px_rgba(0,255,0,0.1)] rounded-[2.5rem] p-8 text-black group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform">
              {getIcon('Trophy', 100)}
            </div>
            <div className="relative z-10">
              <h3 className="font-orbitron font-black text-2xl uppercase tracking-tighter mb-2 italic">ARENA_PULSE</h3>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] opacity-60 mb-8 underline decoration-2 underline-offset-4">Top_Tier_Sector_Operations</p>

              <div className="space-y-4">
                {MOCK_TOURNAMENTS.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-black/5 rounded-2xl border border-black/10 hover:bg-black/10 transition-all cursor-pointer group/item">
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">{t.name}</p>
                      <p className="text-[10px] font-mono font-bold mt-1 opacity-60">PRIZE: {t.prize}</p>
                    </div>
                    <div className="bg-black text-primary p-2 rounded-xl transition-all group-hover/item:bg-white group-hover/item:text-black">
                      {getIcon('ArrowRight', 16)}
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-4 bg-black text-primary font-orbitron font-black text-[10px] rounded-2xl uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all">
                ENTER_ARENA_NAVIGATOR
              </button>
            </div>
          </motion.div>

          {/* Bento Card 3: Shell Assist */}
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-surface/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30 text-primary">
                  {getIcon('Cpu', 24)}
                </div>
                <div>
                  <h3 className="font-orbitron font-black text-white text-lg uppercase tracking-tighter">SHELL_ASSIST</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-primary rounded-full animate-ping"></span>
                    <span className="text-[9px] font-mono text-primary uppercase font-bold">Neural_Link_Ready</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-400 font-mono leading-relaxed mb-6 opacity-80 italic">
                "Operator, current system stability is 99.98%. Tournament match detected in 4 sectors. Awaiting commands..."
              </p>
              <button className="w-full py-4 bg-primary/10 border border-primary/30 text-primary font-orbitron font-black text-[10px] rounded-2xl hover:bg-primary hover:text-black transition-all uppercase tracking-[0.3em] shadow-lg shadow-primary/5">
                ACTIVATE_NEURAL_LINK
              </button>
            </div>
          </motion.div>

          {/* Bento Card 4: Global Events / Audit */}
          <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 shadow-xl">
            <ActivityFeed title="NEXUS_PULSE" limit={4} onNavigateProfile={onNavigateProfile} userId={user.id} />
            <button className="w-full mt-8 py-3 bg-white/5 border border-white/10 text-slate-500 font-mono text-[9px] rounded-xl uppercase tracking-[0.3em] hover:text-white hover:bg-white/10 transition-all">
              Deep_Cycle_Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
