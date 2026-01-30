import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { api } from '../services/api';
import { User } from '../types';
import { usePremiumTheme } from './PremiumThemeProvider';
import AchievementBadge from './AchievementBadge';
import MediaGallery from './MediaGallery';
import ReportModal from './ReportModal';
import ThemeStore from './ThemeStore';

interface ProfileProps {
  user: User; // The current logged-in user
  viewedProfileId: string; // The ID of the profile being viewed
  onBackToOwn: () => void;
  onNavigateSettings: () => void;
  onWatchStream: (streamData: { broadcasterId: string, peerId: string, title: string }) => void;
  onNavigateProfile: (userId: string) => void;
  onMessageUser: (userId: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, viewedProfileId, onBackToOwn, onNavigateSettings, onWatchStream, onNavigateProfile, onMessageUser }) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'clips' | 'followers' | 'following'>('clips');
  const [loading, setLoading] = useState(true);
  const [clips, setClips] = useState<any[]>([]);
  const [followersList, setFollowersList] = useState<User[]>([]);
  const [followingList, setFollowingList] = useState<User[]>([]);
  const [achievements, setAchievements] = useState<{ badgeType: string, unlockedAt: string }[]>([]);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showThemeManager, setShowThemeManager] = useState(false);
  const [myThemes, setMyThemes] = useState<any[]>([]);
  const { applyTheme, resetTheme } = usePremiumTheme();

  // NEW: Pinned Content Mock State
  const [pinnedContent, setPinnedContent] = useState<any | null>(null);

  const isOwn = user.id === viewedProfileId;

  // --- Initialization ---
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!viewedProfileId || viewedProfileId === 'undefined') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [data, mediaData, achievementsData] = await Promise.all([
          backendService.getUserById(viewedProfileId),
          backendService.getUserMedia(viewedProfileId),
          backendService.getUserAchievements(viewedProfileId)
        ]);
        setProfile(data);
        setClips(mediaData);
        setAchievements(achievementsData);

        // Mock setting a pinned content if available
        if (mediaData.length > 0) {
          setPinnedContent(mediaData[0]); // Default to first for now
        }

        if (data) {
          applyTheme(data);
          if (activeTab === 'followers' && data.followers) {
            const list = await Promise.all(data.followers.map(id => backendService.getUserById(id)));
            setFollowersList(list.filter(Boolean) as User[]);
          } else if (activeTab === 'following' && data.following) {
            const list = await Promise.all(data.following.map(id => backendService.getUserById(id)));
            setFollowingList(list.filter(Boolean) as User[]);
          }
        }
      } catch (err) {
        console.error('[PROFILE] Sync failure:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();

    if (isOwn) fetchMyThemes();
    return () => resetTheme();
  }, [viewedProfileId, activeTab]);

  const fetchMyThemes = async () => {
    try {
      const { data: allThemes } = await api.get('/store/themes');
      setMyThemes(allThemes.filter((t: any) => user.ownedThemes.includes(t._id)));
    } catch (err) { console.error(err); }
  };

  const handleFollow = async () => {
    if (!profile || interactionLoading) return;
    setInteractionLoading(true);
    try {
      const { user: updatedUser, target: updatedTarget } = await backendService.toggleFollow(user.id, profile.id);
      setProfile(updatedTarget);
    } catch (err) { console.error(err); } finally { setInteractionLoading(false); }
  };

  const handleInteraction = async (id: string, type: 'LIKE' | 'GIFT', amount?: number) => {
    // Basic wrapper for media gallery interaction
    try {
      const { data: updated } = await api.post(`/media/${id}/interact`, {
        userId: user.id, type, amount
      });
      setClips(prev => prev.map(c => c._id === id ? updated : c));
    } catch (err) { console.error(err); }
  };

  const isFollowing = user.following.includes(viewedProfileId);

  if (!profile && !loading) return <div className="py-20 text-center text-red-500 uppercase font-mono">NODE_OFFLINE</div>;
  if (loading) return <div className="py-20 text-center text-primary uppercase font-mono animate-pulse">Decrypting_Profile_Data...</div>;

  // Calculate Scoped Accents for flair
  const profileAccent = profile?.activeTheme?.colors?.primary || '#10b981';

  return (
    <div
      className={`space-y-12 animate-in fade-in duration-700 ${profile?.activeTheme?.animation || ''}`}
      style={{
        '--user-accent': profileAccent,
        '--primary': 'var(--user-accent)',
      } as React.CSSProperties}
    >

      {/* --- HERO / COVER --- */}
      <div
        className="relative rounded-[3rem] overflow-hidden group shadow-2xl border border-white/5"
        style={{ height: '400px' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] group-hover:scale-110"
          style={{
            backgroundImage: profile?.activeTheme?.banner
              ? `url(${profile!.activeTheme.banner})`
              : 'url(https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2071)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

        {/* Profile Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 flex flex-col md:flex-row items-end gap-8">
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] p-1 bg-black/50 backdrop-blur-md border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
              <img src={profile!.avatar} className="w-full h-full rounded-[1.8rem] object-cover" alt="" />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-black font-orbitron font-black text-[10px] uppercase rounded-full tracking-widest whitespace-nowrap z-10">
              LVL {Math.floor(profile!.stats.rating / 100)}
            </div>
          </div>

          <div className="flex-1 mb-2">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-orbitron font-black text-white uppercase italic tracking-tighter">{profile!.username}</h1>
              {profile!.premiumSettings?.isVerified && <div className="text-blue-400">{getIcon('ShieldCheck', 24)}</div>}
            </div>

            {/* GAMING DNA TAGS */}
            <div className="flex flex-wrap gap-2 mb-4 opacity-80">
              {['FPS_VETERAN', 'STRATEGIST', 'NIGHT_OWL'].map(tag => (
                <span key={tag} className="px-2 py-1 bg-white/10 border border-white/10 rounded text-[9px] font-mono font-bold text-white uppercase tracking-wider">{tag}</span>
              ))}
            </div>

            <p className="text-slate-300 font-mono text-sm max-w-xl line-clamp-2 md:line-clamp-none">
              "{profile!.bio || 'No tactical briefing provided.'}"
            </p>
          </div>

          <div className="flex gap-3 mb-2">
            {isOwn ? (
              <button onClick={onNavigateSettings} className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-orbitron font-bold uppercase transition-all backdrop-blur-md">
                Edit_Config
              </button>
            ) : (
              <>
                <button onClick={handleFollow} className={`px-8 py-3 rounded-xl text-xs font-orbitron font-bold uppercase transition-all shadow-lg ${isFollowing ? 'bg-white/10 text-white' : 'bg-primary text-black hover:scale-105 active:scale-95'}`}>
                  {interactionLoading ? 'Syncing...' : isFollowing ? 'Linked' : 'Connect_Node'}
                </button>
                <button onClick={() => onMessageUser(profile!.id)} className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white transition-all backdrop-blur-md">
                  {getIcon('MessageSquare', 20)}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- STATS & PINNED --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {/* GAMER CARD STATS */}
          <div className="glass p-8 rounded-[3rem] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-white">{getIcon('TrendingUp', 120)}</div>
            <h3 className="font-orbitron font-black text-white uppercase text-sm mb-6 flex items-center gap-2">
              {getIcon('BarChart2', 16)} Performance_Metrics
            </h3>
            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Global_Rank</p>
                <p className="text-2xl font-orbitron font-black text-white">#1,402</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Skill_Rating</p>
                <p className="text-2xl font-orbitron font-black text-primary">{profile!.stats.rating}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Followers</p>
                <p className="text-2xl font-orbitron font-black text-white">{profile!.followers.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Matches</p>
                <p className="text-2xl font-orbitron font-black text-white">842</p>
              </div>
            </div>
          </div>

          {/* ACHIEVEMENTS */}
          <div className="glass p-6 rounded-[3rem] border border-white/5">
            <h3 className="font-orbitron font-black text-white uppercase text-sm mb-4">Medals</h3>
            <div className="flex flex-wrap gap-4">
              {achievements.length > 0 ? achievements.map((a, i) => (
                <AchievementBadge key={i} type={a.badgeType} unlockedAt={a.unlockedAt} size={12} />
              )) : <p className="text-[10px] font-mono text-slate-600 uppercase">Archive_Empty</p>}
            </div>
          </div>
        </div>

        {/* PINNED CLIP & FEED */}
        <div className="lg:col-span-2 space-y-8">
          {pinnedContent && (
            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 group h-64 shadow-2xl">
              <img src={pinnedContent.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" alt="" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent"></div>
              <div className="absolute top-6 left-6">
                <span className="px-3 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase rounded shadow-lg flex items-center gap-2">
                  {getIcon('Pin', 10)} Featured_Highlight
                </span>
              </div>
              <div className="absolute bottom-6 left-6 max-w-md">
                <h3 className="text-2xl font-orbitron font-black text-white mb-2">{pinnedContent.title}</h3>
                <p className="text-xs font-mono text-slate-300 line-clamp-1">{pinnedContent.description}</p>
                <button className="mt-4 px-6 py-2 bg-white text-black font-orbitron font-bold text-[10px] rounded-lg uppercase hover:scale-105 transition-transform">
                  Play_VOD
                </button>
              </div>
            </div>
          )}

          {/* TABS */}
          <div>
            <div className="flex gap-8 border-b border-white/5 mb-6">
              {['clips', 'followers', 'following'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-4 text-xs font-orbitron font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'clips' && (
              <MediaGallery items={clips} loading={loading} title="" onInteract={handleInteraction} currentUser={user} />
            )}
            {/* Followers/Following lists would go here (same logc as before, omitted for brevity but preserved in principle) */}
            {activeTab !== 'clips' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeTab === 'followers' ? followersList : followingList).map(u => (
                  <div key={u.id} className="p-4 bg-surface/30 border border-white/5 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/5" onClick={() => onNavigateProfile(u.id)}>
                    <img src={u.avatar} className="w-10 h-10 rounded-full" alt="" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">{u.username}</p>
                      <p className="text-[9px] font-mono text-slate-500 uppercase">{u.archetype || 'Operator'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showReportModal && profile && (
        <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} targetType="USER" targetId={profile.id} targetName={profile.username} reporterId={user.id} />
      )}
      {showStore && <ThemeStore user={user} onUpdateUser={() => { }} onClose={() => setShowStore(false)} />}
    </div>
  );
};

export default Profile;
