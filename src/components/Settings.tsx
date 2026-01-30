import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { User, UserSettings } from '../types';

interface SettingsProps {
  user: User;
  onUpdate: (user: User) => void;
  onLogout?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'gameplay' | 'collections' | 'security' | 'connections'>('profile');
  const [loading, setLoading] = useState(false);
  const [myThemes, setMyThemes] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    username: user.username,
    bio: user.bio,
    email: user.email,
    avatar: user.avatar
  });
  const [privacySettings, setPrivacySettings] = useState<UserSettings>(user.settings);

  const [connections, setConnections] = useState(user.settings.connections || {
    discord: { connected: false, id: '', username: '' },
    steam: { connected: false, id: '', username: '' },
    twitch: { connected: false, id: '', username: '' }
  });

  const [security, setSecurity] = useState(user.settings.security || {
    twoFactor: false,
    activeSessions: [{ id: 'current', device: 'Linux Workstation', location: 'Unknown', active: true }]
  });

  const [gameplay, setGameplay] = useState(user.settings.gameplay || {
    region: 'TOKYO (JP)',
    crossplay: true,
    streamerMode: false
  });

  useEffect(() => {
    if (activeTab === 'collections') {
      const fetchThemes = async () => {
        try {
          const allThemes = await backendService.getStoreThemes();
          const owned = allThemes.filter((t: any) => user.ownedThemes.includes(t._id));
          setMyThemes(owned);
        } catch (err) {
          console.error("Failed to sync inventory", err);
        }
      };
      fetchThemes();
    }
  }, [activeTab, user.ownedThemes]);

  const updateSettings = async (section: string, updates: any) => {
    let newSettings = { ...user.settings };
    if (section === 'root') {
      newSettings = { ...newSettings, ...updates };
      setPrivacySettings(newSettings);
    } else {
      (newSettings as any)[section] = { ...(newSettings as any)[section], ...updates };
      if (section === 'connections') setConnections(newSettings.connections!);
      if (section === 'security') setSecurity(newSettings.security!);
      if (section === 'gameplay') setGameplay(newSettings.gameplay!);
    }

    try {
      const updated = await backendService.updateUserProfile(user.id, { settings: newSettings });
      onUpdate(updated);
    } catch (err) {
      console.error("Sync Failure:", err);
    }
  };

  const handleTogglePrivacy = (key: string, value: any) => {
    if (key.includes('.')) {
      const [section, field] = key.split('.');
      updateSettings(section, { [field]: value });
    } else {
      updateSettings('root', { [key]: value });
    }
  };

  const handleUpdateGameplay = (updates: any) => {
    updateSettings('gameplay', updates);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await backendService.updateUserProfile(user.id, formData);
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleConnection = (platform: 'discord' | 'steam' | 'twitch') => {
    const current = connections[platform];
    const newState = !current.connected;
    const newId = newState ? `${user.username}_${platform}` : '';

    updateSettings('connections', {
      [platform]: { ...current, connected: newState, id: newId }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-end gap-4 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-primary/20 rounded-lg text-primary">{getIcon('Settings', 24)}</span>
            <h2 className="text-3xl font-orbitron font-black text-white uppercase tracking-tighter">System_Config</h2>
          </div>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest pl-12">Operator Node Configuration v3.0</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-72 space-y-2">
          {[
            { id: 'profile', icon: 'User', label: 'Identity' },
            { id: 'gameplay', icon: 'Crosshair', label: 'Gameplay' },
            { id: 'connections', icon: 'Link', label: 'Integrations' },
            { id: 'security', icon: 'Shield', label: 'Security' },
            { id: 'collections', icon: 'ShoppingBag', label: 'Inventory' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`w-full text-left px-6 py-4 rounded-xl font-orbitron text-xs font-bold uppercase transition-all border flex items-center justify-between group ${activeTab === t.id
                ? 'bg-primary border-primary text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/20 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                {getIcon(t.icon, 18)}
                {t.label}
              </div>
              {activeTab === t.id && <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>}
            </button>
          ))}

          <div className="pt-8 mt-8 border-t border-white/5">
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full text-left px-6 py-4 rounded-xl font-orbitron text-xs font-bold uppercase transition-all border border-red-500/20 text-red-500 hover:bg-red-500/10 flex items-center gap-3"
              >
                {getIcon('LogOut', 18)} Terminate Session
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-surface/30 backdrop-blur-md p-8 lg:p-12 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            {getIcon('Settings', 200)}
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-8 relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <img src={user.avatar} className="w-20 h-20 rounded-2xl border-2 border-primary shadow-[0_0_20px_rgba(16,185,129,0.3)]" alt="" />
                <div>
                  <h3 className="text-xl font-bold text-white uppercase">{user.username}</h3>
                  <p className="text-xs font-mono text-primary">OPERATOR LEVEL {user.tier}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest ml-1">Codename</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:border-primary outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest ml-1">Comms ID (Email)</label>
                    <input
                      type="email"
                      disabled
                      value={formData.email}
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest ml-1">Avatar Link</label>
                  <input
                    type="text"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:border-primary outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest ml-1">Service Record (Bio)</label>
                  <textarea
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white focus:border-primary outline-none transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 bg-primary text-black font-black font-orbitron text-xs rounded-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  {loading ? 'SYNCING...' : 'SAVE CONFIGURATION'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'gameplay' && (
            <div className="space-y-8 relative z-10">
              <h3 className="text-lg font-orbitron font-bold text-white uppercase border-b border-white/10 pb-4">Matchmaking Parameters</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-black/20 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Region Lock</p>
                    <p className="text-[10px] text-slate-500 font-mono">PREFERRED SERVER NODE</p>
                  </div>
                  <select
                    value={privacySettings.theme}
                    onChange={(e) => handleTogglePrivacy('theme', e.target.value)}
                    className="bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[var(--primary)]"
                  >
                    <option value="dark">DARK_PROTOCOL</option>
                    <option value="light">LIGHT_UPLINK</option>
                    <option value="neon">NEON_MESH</option>
                    <option value="high-contrast">STARK_CONTRAST</option>
                  </select>
                </div>

                <div className="p-6 bg-black/20 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Crossplay</p>
                    <p className="text-[10px] text-slate-500 font-mono">MATCH WITH CONSOLE OPERATORS</p>
                  </div>
                  <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer" onClick={() => handleUpdateGameplay({ crossplay: !gameplay.crossplay })}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${gameplay.crossplay ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>

                <div className="p-6 bg-black/20 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Streamer Mode</p>
                    <p className="text-[10px] text-slate-500 font-mono">HIDE SENSITIVE DATA ON HUD</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${gameplay.streamerMode ? 'bg-primary' : 'bg-slate-700'}`} onClick={() => handleUpdateGameplay({ streamerMode: !gameplay.streamerMode })}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${gameplay.streamerMode ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-8 relative z-10">
              <h3 className="text-lg font-orbitron font-bold text-white uppercase border-b border-white/10 pb-4">External Links</h3>

              <div className="space-y-4">
                <div className="p-6 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#5865F2] rounded-xl flex items-center justify-center text-white">
                      {getIcon('Hash', 24)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Discord</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {connections.discord.connected ? `LINKED: ${connections.discord.id}` : 'NOT LINKED'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleConnection('discord')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${connections.discord.connected ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {connections.discord.connected ? 'DISCONNECT' : 'CONNECT'}
                  </button>
                </div>

                <div className="p-6 bg-[#171a21]/40 border border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white border border-white/10">
                      {getIcon('Monitor', 24)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Steam</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {connections.steam.connected ? `LINKED: ${connections.steam.id}` : 'NOT LINKED'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleConnection('steam')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${connections.steam.connected ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {connections.steam.connected ? 'DISCONNECT' : 'CONNECT'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 relative z-10">
              <h3 className="text-lg font-orbitron font-bold text-white uppercase border-b border-white/10 pb-4">Security Protocols</h3>

              <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    Two-Factor Authentication
                    <span className="text-[8px] bg-primary text-black px-1.5 py-0.5 rounded font-black font-mono">RECOMMENDED</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">SECURE YOUR NODE WITH MOBILE AUTH</p>
                </div>
                <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${security.twoFactor ? 'bg-primary' : 'bg-slate-700'}`} onClick={() => updateSettings('security', { twoFactor: !security.twoFactor })}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${security.twoFactor ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Active Sessions</h4>
                <div className="space-y-3">
                  {security.activeSessions.map((session, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${session.active ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                        <div>
                          <p className="text-xs font-bold text-white">{session.device}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{session.location}</p>
                        </div>
                      </div>
                      {session.active && <span className="text-[9px] text-green-500 font-mono border border-green-500/20 px-2 py-1 rounded">CURRENT</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'collections' && (
            <div className="space-y-8 relative z-10">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="text-lg font-orbitron font-bold text-white uppercase tracking-tighter">Acquired Assets</h3>
                <span className="text-[10px] font-mono text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">{myThemes.length} Protocols Found</span>
              </div>

              {myThemes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 text-slate-700">{getIcon('Package', 48)}</div>
                  <h3 className="text-white font-orbitron text-sm uppercase">Archive Empty</h3>
                  <p className="text-xs font-mono text-slate-500 mt-2 max-w-xs">No aesthetic protocols detected in your neural link. Visit the Marketplace to sync new assets.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myThemes.map((theme: any) => (
                    <div key={theme._id} className="bg-black/40 border border-white/10 p-5 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        {theme.assets?.colors ? (
                          <div className="flex gap-1 p-2 bg-black/60 rounded-xl border border-white/10">
                            <div className="w-3 h-8 rounded-full" style={{ backgroundColor: theme.assets.colors.primary }} title="Primary"></div>
                            <div className="w-3 h-8 rounded-full" style={{ backgroundColor: theme.assets.colors.secondary }} title="Secondary"></div>
                            <div className="w-3 h-8 rounded-full" style={{ backgroundColor: theme.assets.colors.accent }} title="Accent"></div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                            {getIcon('Palette', 20)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-white uppercase tracking-tighter">{theme.name}</p>
                          <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-mono border border-white/5 uppercase">{theme.type}</span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const updated = await backendService.applyTheme(user.id, theme._id, theme.type);
                          onUpdate(updated);
                          alert("Skin Synchronized.");
                        }}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black font-orbitron text-primary hover:bg-primary hover:text-black transition-all"
                      >
                        APPLY
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-8 mt-4 border-t border-white/5">
                <div className="mb-4">
                  <h4 className="text-xs font-mono text-slate-500 uppercase mb-2">Unequip by Slot</h4>
                  <div className="flex gap-2 flex-wrap">
                    {['banner','animation','effect','font','profile','colors'].map(slot => (
                      <button
                        key={slot}
                        onClick={async () => {
                          const updated = await backendService.applyTheme(user.id, null, slot);
                          onUpdate(updated);
                          alert(`${slot} theme cleared.`);
                        }}
                        className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-black font-orbitron text-slate-500 hover:text-white transition-all uppercase"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const updated = await backendService.applyTheme(user.id, null);
                    onUpdate(updated);
                    alert("Standard Theme Restored.");
                  }}
                  className="w-full py-4 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black font-orbitron text-slate-500 hover:text-white transition-all uppercase tracking-widest"
                >
                  RESTORE DEFAULT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
