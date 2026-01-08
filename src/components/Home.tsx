
import React, { useState, useEffect } from 'react';
import { getIcon, MOCK_TOURNAMENTS } from '../constants';
import { backendService } from '../services/backendService';
import { User, Post } from '../types';
import CreatePostModal from './CreatePostModal';
import ActivityFeed from './ActivityFeed';
import MediaGallery from './MediaGallery';

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

      {!user && (
        <section className="relative h-[500px] rounded-3xl overflow-hidden group">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: 'url(https://picsum.photos/seed/cyber/1920/1080)' }}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/70 to-transparent"></div>
          <div className="absolute inset-0 flex flex-col justify-center p-12">
            <div className="flex items-center gap-2 text-primary font-mono mb-6">
              <span className="w-8 h-[1px] bg-primary"></span>
              <span className="text-xs uppercase tracking-[0.3em]">System_Online_v2.0</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-orbitron font-black text-white mb-6 leading-tight">
              THE NEXT GEN <br />
              <span className="text-primary neon-text italic">GAMING_ECOSYSTEM</span>
            </h1>
            <p className="max-w-xl text-slate-300 text-lg mb-8 font-light leading-relaxed">
              Experience high-fidelity 3D tournaments, ultra-low latency streaming,
              and a sovereign player economy built for the technically elite.
            </p>
            <div className="flex gap-4">
              <button
                onClick={startMatchmaking}
                disabled={isMatchmaking}
                className={`bg-primary text-black px-8 py-3 rounded font-orbitron font-bold text-sm hover:bg-accent transition-all flex items-center gap-2 ${isMatchmaking ? 'animate-pulse' : ''}`}
              >
                {isMatchmaking ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    {matchStatus}
                  </div>
                ) : (
                  <>
                    {getIcon('Zap', 18)} JOIN_BATTLE_NOW
                  </>
                )}
              </button>
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="bg-white/5 border border-white/10 backdrop-blur-md px-8 py-3 rounded font-orbitron font-bold text-sm hover:bg-white/10 transition-all flex items-center gap-2"
              >
                {getIcon('Plus', 18)} CREATE_STREAM_NODE
              </button>
            </div>
          </div>
        </section>
      )}

      {user && (
        <div className="border-b border-white/5 pb-8 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-orbitron font-black text-white italic uppercase tracking-tighter">Tactical_Dashboard</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-2">Operational_Status: Ready_For_Engagement</p>
          </div>
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-6 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-xl text-xs font-mono hover:bg-primary/20 transition-all uppercase flex items-center gap-2"
          >
            {getIcon('Send', 16)} New_Transmission
          </button>
        </div>
      )}

      {/* Media Highlights */}
      <section>
        <MediaGallery
          items={trendingMedia}
          loading={isLoadingMedia}
          title="TOP_BATTLE_INTEL"
          onInteract={handleMediaInteraction}
          currentUser={user}
        />
      </section>

      {/* Main Grid: Feed + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Global Feed */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-orbitron font-bold text-white tracking-widest flex items-center gap-3">
              <span className="w-2 h-8 bg-primary rounded-full"></span>
              GLOBAL_FEED://
            </h2>
            <div className="flex gap-2">
              <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:border-primary/50 transition-colors">
                {getIcon('Search', 16)}
              </button>
              <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:border-primary/50 transition-colors">
                {getIcon('Filter', 16)}
              </button>
            </div>
          </div>

          {isLoadingPosts ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface/30 border border-white/5 h-64 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 gap-8">
              {posts.map(post => (
                <div key={post.id} className="bg-surface/50 border border-white/10 rounded-2xl overflow-hidden group hover:border-primary/30 transition-all duration-500">
                  <div className="relative aspect-video overflow-hidden">
                    <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <img src={post.authorAvatar} alt={post.authorName} className="w-8 h-8 rounded-full border border-primary/50 shadow-[0_0_10px_rgba(5,217,255,0.3)]" />
                      <span className="text-[10px] font-mono text-white tracking-widest font-bold bg-black/50 px-2 py-1 rounded backdrop-blur-md">@ {post.authorName.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-orbitron font-black text-white mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                    <p className="text-sm text-slate-400 font-mono mb-6 line-clamp-2 leading-relaxed italic opacity-80">{post.content}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <div className="flex gap-6">
                        <button className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-mono text-[10px]">
                          {getIcon('Heart', 14)} {post.likes?.length || 0}
                        </button>
                        <button className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-mono text-[10px]">
                          {getIcon('MessageSquare', 14)} 0
                        </button>
                        <button className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-mono text-[10px]">
                          {getIcon('Share2', 14)}
                        </button>
                      </div>
                      <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
                        {new Date(post.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center gap-4 text-slate-600">
              {getIcon('WifiOff', 40)}
              <p className="font-mono text-sm uppercase tracking-widest italic animate-pulse">NO_CONTENT_FOUND_IN_MESH</p>
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="mt-4 px-6 py-2 border border-primary/20 text-primary font-mono text-[10px] rounded-lg hover:bg-primary/5 transition-all"
              >
                INITIALIZE_FIRST_NODE
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-8">
          <div className="bg-surface/50 border border-white/5 rounded-2xl p-6 hover:border-primary/20 transition-all shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-orbitron text-white text-lg flex items-center gap-2">
                {getIcon('Trophy', 20)} ARENA_PULSE
              </h3>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">Live</span>
            </div>
            <div className="space-y-4">
              {MOCK_TOURNAMENTS.slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group/t">
                  <div>
                    <p className="text-xs font-bold text-white group-hover/t:text-primary transition-colors">{t.name}</p>
                    <p className="text-[10px] text-primary font-mono">{t.prize}</p>
                  </div>
                  <button className="text-slate-500 hover:text-white transition-colors">
                    {getIcon('ArrowRight', 16)}
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors border-t border-white/5 pt-4">
              VIEW_ALL_OPERATIONS
            </button>
          </div>

          <div className="bg-surface/50 border border-white/5 rounded-2xl p-6 hover:border-primary/20 transition-all shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-orbitron text-white text-lg flex items-center gap-2">
                {getIcon('Monitor', 20)} LIVE_BROADCASTS
              </h3>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">Mesh_Live</span>
            </div>
            <div className="space-y-4">
              {liveUsers.length > 0 ? liveUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => u.peerId && onWatchStream({ broadcasterId: u.id, peerId: u.peerId, title: u.streamTitle || 'Tactical Feed' })}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer group/stream"
                >
                  <div className="relative">
                    <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-full border-2 border-primary/20 group-hover/stream:border-primary transition-colors" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0a0c] animate-pulse"></div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-white uppercase group-hover/stream:text-primary transition-colors truncate">{u.username}</p>
                    <p className="text-[9px] text-slate-400 font-mono truncate">{u.streamTitle || 'UNIDENTIFIED_SIGNAL'}</p>
                  </div>
                  {getIcon('Play', 14, 'text-primary opacity-0 group-hover/stream:opacity-100 transition-opacity')}
                </div>
              )) : (
                <div className="py-8 flex flex-col items-center gap-2 text-slate-600">
                  {getIcon('WifiOff', 24)}
                  <p className="text-[9px] font-mono uppercase tracking-widest">NO_ACTIVE_TRANSMISSIONS</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface/50 border border-white/5 rounded-2xl p-6 hover:border-primary/20 transition-all shadow-xl">
            <ActivityFeed title="GLOBAL_EVENTS" limit={5} onNavigateProfile={onNavigateProfile} userId={user.id} />
            <button className="w-full mt-4 py-2 text-[8px] font-mono text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
              OPEN_LIVE_CONSOLE
            </button>
          </div>

          {/* Account Tier Widget */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:scale-125 transition-transform">
              {getIcon('Zap', 100)}
            </div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-orbitron text-white text-lg flex items-center gap-2 mb-1">
                  {getIcon('Shield', 20)} NODE_CLEARANCE
                </h3>
                <p className="text-[10px] font-mono text-primary uppercase tracking-[0.2em]">{user.tier}_OPERATOR</p>
              </div>
              <div className="bg-primary/20 p-2 rounded-lg border border-primary/30">
                {getIcon('Crown', 18)}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Available_Funds</span>
                <span className="text-sm font-bold text-amber-500">{(user.codeBits || 0).toLocaleString()} Ȼ</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Mesh_Access</span>
                <span className="text-sm font-bold text-white">Full_Tunnel</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('subscriptions')}
              className="w-full py-4 bg-primary text-black font-orbitron font-black text-xs rounded-xl uppercase tracking-widest hover:bg-accent transition-all shadow-[0_0_15px_rgba(0,255,0,0.3)]"
            >
              ELEVATE_ACCESS_TIER
            </button>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:scale-125 transition-transform">
              {getIcon('Terminal', 100)}
            </div>
            <h3 className="font-orbitron text-primary text-lg flex items-center gap-2 mb-4">
              {getIcon('Cpu', 20)} SHELL_ASSIST
            </h3>
            <p className="text-sm text-slate-400 mb-6 font-mono leading-tight italic">
              "Welcome, Admin. System stability at 99.98%. I've identified 3 potential tournament matches based on your recent skill metrics."
            </p>
            <button className="w-full py-2 bg-primary/10 border border-primary/30 text-primary rounded font-mono text-[10px] hover:bg-primary/20 transition-all uppercase tracking-widest font-black">
              ACTIVATE_ASSISTANT_AI
            </button>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Home;
