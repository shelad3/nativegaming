
import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { User, Post } from '../types';
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
  const [applying, setApplying] = useState<string | null>(null);
  const { applyTheme, resetTheme } = usePremiumTheme();

  const isOwn = user.id === viewedProfileId;

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
        console.error('[PROFILE] Connection error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();

    if (isOwn) {
      fetchMyThemes();
    }

    return () => resetTheme();
  }, [viewedProfileId, activeTab]);

  const fetchMyThemes = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/store/themes');
      const allThemes = await response.json();
      setMyThemes(allThemes.filter((t: any) => user.ownedThemes.includes(t._id)));
    } catch (err) {
      console.error('[PROFILE] MyThemes sync failure:', err);
    }
  };

  const handleApplyTheme = async (themeId: string | null) => {
    setApplying(themeId || 'default');
    try {
      const updatedUser = await backendService.applyTheme(user.id, themeId);
      setProfile(updatedUser);
      applyTheme(updatedUser);
      alert('Theme protocol synchronized successfully.');
    } catch (err) {
      console.error('[THEME] Application failure:', err);
    } finally {
      setApplying(null);
    }
  };

  const handleFollow = async () => {
    if (!profile || interactionLoading) return;
    setInteractionLoading(true);
    try {
      const { user: updatedUser, target: updatedTarget } = await backendService.toggleFollow(user.id, profile.id);
      setProfile(updatedTarget);
    } catch (err) {
      console.error(err);
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleInteraction = async (id: string, type: 'LIKE' | 'GIFT', amount?: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/media/${id}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, type, amount })
      });
      const updated = await response.json();
      setClips(prev => prev.map(c => c._id === id ? updated : c));
    } catch (err) {
      console.error('[MEDIA] Interaction error:', err);
    }
  };

  const handleGift = async (clipId: string) => {
    try {
      await backendService.interactWithPost(clipId, user.id, 'GIFT', 'PowerUp');
      alert("Gift Transmitted: 100 CodeBits sent.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isFollowing = user.following.includes(viewedProfileId);

  if (!profile && !loading) return (
    <div className="py-20 text-center font-mono text-red-500 uppercase">NODE_NOT_FOUND_IN_MESH</div>
  );

  if (loading) return (
    <div className="py-20 text-center font-mono animate-pulse text-primary uppercase">Deciphering_Node_Data...</div>
  );

  return (
    <div className={`space-y-12 animate-in fade-in duration-700 ${profile!.activeTheme?.animation || ''}`}>
      {/* Header Card */}
      <div
        className="bg-surface/50 border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl transition-all duration-1000"
        style={{
          backgroundImage: profile!.activeTheme?.banner ? `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(15,23,42,1)), url(${profile!.activeTheme.banner})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderColor: profile!.activeTheme?.colors?.primary ? `${profile!.activeTheme.colors.primary}40` : undefined
        }}
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          {getIcon('Shield', 180)}
        </div>

        <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
          <div className="relative">
            <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full p-1 border-4 border-primary/30 shadow-[0_0_30px_rgba(0,255,0,0.1)] group relative ${profile!.premiumSettings?.customAnimation === 'discord-pulse' ? 'animate-pulse-slow' : ''}`}>
              <img src={profile!.avatar} alt={profile!.username} className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-black px-4 py-1 rounded-full font-orbitron text-[10px] font-black uppercase tracking-tighter whitespace-nowrap shadow-lg">
              {profile!.tier}_NODE
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-4xl font-orbitron font-black text-white tracking-tighter uppercase neon-text">{profile!.username}</h2>
                {profile!.premiumSettings?.isVerified && (
                  <div className="text-blue-400 group-hover:animate-bounce" title="Verified Operator">
                    {getIcon('ShieldCheck', 24)}
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-center">
                {isOwn ? (
                  <div className="flex gap-2">
                    <button onClick={onNavigateSettings} className="px-4 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-mono hover:bg-primary/20 transition-all uppercase">Config_Node</button>
                    <button onClick={() => setShowThemeManager(true)} className="px-4 py-1.5 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-mono hover:bg-white/10 transition-all uppercase flex items-center gap-2">
                      {getIcon('Palette', 14)} Themes
                    </button>
                    <button onClick={() => setShowStore(true)} className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-all" title="Theme Store">
                      {getIcon('ShoppingCart', 18)}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleFollow}
                      disabled={interactionLoading}
                      className={`px-6 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all uppercase flex items-center gap-2 ${isFollowing ? 'bg-white/5 border border-white/20 text-slate-400' : 'bg-primary text-black hover:bg-accent'}`}
                    >
                      {interactionLoading ? <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> : isFollowing ? 'CONNECTED' : 'INITIATE_LINK'}
                    </button>
                    <button
                      onClick={() => onMessageUser(profile!.id)}
                      className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono hover:bg-white/10 transition-all uppercase text-white"
                    >
                      Transmit_DM
                    </button>
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="p-1.5 bg-red-600/10 border border-red-600/30 text-red-500 rounded-lg hover:bg-red-600/20 transition-all"
                      title="Report Violation"
                    >
                      {getIcon('ShieldAlert', 14)}
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="text-primary font-mono text-sm mb-4 tracking-widest uppercase italic">{profile!.archetype || 'GHOST_OPERATOR'}</p>
            <p className="max-w-xl text-slate-400 font-mono text-sm leading-relaxed mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
              "{profile!.bio}"
            </p>

            <div className="mb-8">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">MEDALS_EARNED</p>
              <div className="flex gap-4">
                {achievements.length > 0 ? achievements.map((ach, idx) => (
                  <AchievementBadge key={idx} type={ach.badgeType} unlockedAt={ach.unlockedAt} size={10} />
                )) : (
                  <p className="text-[10px] font-mono text-slate-700 uppercase italic">No medals detected</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-8">
              <div className="text-center md:text-left">
                <p className="text-2xl font-orbitron font-black text-white">{profile!.stats.rating}</p>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Mesh_Rating</p>
              </div>
              <div className="text-center md:text-left cursor-pointer hover:opacity-70 transition-opacity" onClick={() => setActiveTab('followers')}>
                <p className="text-2xl font-orbitron font-black text-white">{profile!.followers.length}</p>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Followers</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-2xl font-orbitron font-black text-white">{profile!.stats.trophies}</p>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Trophies</p>
              </div>
              {profile!.clanId && (
                <div className="text-center md:text-left bg-primary/5 p-3 rounded-2xl border border-primary/20 group cursor-pointer hover:bg-primary/10 transition-all">
                  <p className="text-sm font-orbitron font-black text-primary uppercase">[{profile!.clanId.slice(-4)}]</p>
                  <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">CLAN_AFFILIATE</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {profile!.isLive && (
          <div className="mt-10 p-1 bg-red-500/10 border border-red-500/20 rounded-3xl overflow-hidden relative group">
            <div className="flex items-center justify-between px-6 py-3 bg-red-500/20 border-b border-red-500/20">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-orbitron font-black text-rose-500 uppercase tracking-widest">RECEIVING_TRANSMISSION</span>
              </div>
              <div className="text-[10px] font-mono text-rose-400 font-bold uppercase">{profile!.streamTitle || 'TACTICAL_FEED'}</div>
            </div>
            <div className="aspect-video bg-black relative flex items-center justify-center">
              {isOwn ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                  <p className="font-mono text-primary text-[10px] uppercase tracking-widest">Broadcasting_Local_Node...</p>
                </div>
              ) : (
                <div className="text-center space-y-4 relative group/feed">
                  <img src={profile!.avatar} className="w-32 h-32 rounded-full mx-auto opacity-20 blur-sm scale-150 absolute" alt="" />
                  <div className="relative z-10 space-y-4 group-hover/feed:opacity-0 transition-opacity">
                    <div className="text-rose-500 scale-150 animate-pulse">{getIcon('Radio', 48)}</div>
                    <p className="font-mono text-rose-400 text-xs uppercase tracking-widest">FEED_DECRYPT_IN_PROGRESS...</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/feed:opacity-100 transition-opacity z-20">
                    <button
                      onClick={() => onWatchStream({
                        broadcasterId: profile!.id,
                        peerId: profile!.peerId || '',
                        title: profile!.streamTitle || 'Tactical Feed'
                      })}
                      className="px-8 py-3 bg-red-600 text-white font-orbitron font-black text-xs rounded-xl shadow-2xl shadow-red-500/50 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Enter_Decrypted_Stream
                    </button>
                  </div>
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono text-white flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span> 1.4K VIEWERS
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex gap-8">
            <button onClick={() => setActiveTab('clips')} className={`text-xs font-orbitron font-bold uppercase tracking-widest pb-4 -mb-[18px] transition-all ${activeTab === 'clips' ? 'text-primary border-b-2 border-primary neon-text' : 'text-slate-500'}`}>Node_Streams</button>
            <button onClick={() => setActiveTab('followers')} className={`text-xs font-orbitron font-bold uppercase tracking-widest pb-4 -mb-[18px] transition-all ${activeTab === 'followers' ? 'text-primary border-b-2 border-primary neon-text' : 'text-slate-500'}`}>Followers</button>
            <button onClick={() => setActiveTab('following')} className={`text-xs font-orbitron font-bold uppercase tracking-widest pb-4 -mb-[18px] transition-all ${activeTab === 'following' ? 'text-primary border-b-2 border-primary neon-text' : 'text-slate-500'}`}>Following</button>
          </div>
        </div>

        {activeTab === 'clips' && (
          <MediaGallery
            items={clips}
            loading={loading}
            title="NODE_STREAMS"
            onInteract={handleInteraction}
            currentUser={user}
          />
        )}

        {(activeTab === 'followers' || activeTab === 'following') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeTab === 'followers' ? followersList : followingList).map(u => (
              <div
                key={u.id}
                onClick={() => onNavigateProfile(u.id)}
                className="p-4 bg-surface/30 border border-white/5 rounded-2xl flex items-center gap-4 group hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer"
              >
                <img src={u.avatar} className="w-12 h-12 rounded-full border-2 border-white/5 group-hover:border-primary/50 transition-colors" alt="" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-orbitron font-bold text-white uppercase truncate group-hover:text-primary transition-colors">{u.username}</p>
                  <p className="text-[10px] font-mono text-slate-500 truncate uppercase">{u.archetype || 'Sovereign_Node'}</p>
                </div>
                <div className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono rounded-lg transition-all uppercase text-slate-400">Inspect</div>
              </div>
            ))}
            {(activeTab === 'followers' ? followersList : followingList).length === 0 && (
              <div className="col-span-full py-20 text-center font-mono text-slate-700 text-xs uppercase italic tracking-widest">
                NO_LINK_PROTOCOLS_FOUND_IN_THIS_SECTOR
              </div>
            )}
          </div>
        )}
      </div>

      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="USER"
          targetId={profile.id}
          targetName={profile.username}
          reporterId={user.id}
        />
      )}

      {showStore && (
        <ThemeStore
          user={user}
          onUpdateUser={(updated) => { /* user is usually updated globally, but we can sync here too if needed */ }}
          onClose={() => setShowStore(false)}
        />
      )}

      {showThemeManager && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="glass rounded-[2rem] border border-white/10 p-8 max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-orbitron font-black text-white uppercase tracking-tighter">Theme_Management</h3>
              <button onClick={() => setShowThemeManager(false)} className="text-slate-500 hover:text-white transition-colors">{getIcon('X', 20)}</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div
                onClick={() => handleApplyTheme(null)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${!profile!.activeTheme ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
              >
                <div>
                  <p className="text-sm font-bold text-white uppercase">Default_Native_Interface</p>
                  <p className="text-[10px] text-slate-500 font-mono">Revert to standard protocol aesthetics.</p>
                </div>
                {applying === 'default' && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
              </div>

              {myThemes.map(t => (
                <div
                  key={t._id}
                  onClick={() => handleApplyTheme(t._id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${profile!.activeTheme?.banner === t.assets.bannerUrl || profile!.activeTheme?.animation === t.assets.animationClass ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                >
                  <div className="flex items-center gap-4">
                    <img src={t.previewUrl} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <p className="text-sm font-bold text-white uppercase">{t.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{t.type} Protocol</p>
                    </div>
                  </div>
                  {applying === t._id && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
