
import React, { useState } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';
import { User, UserSettings } from '../types';

interface SettingsProps {
  user: User;
  onUpdate: (user: User) => void;
  onLogout?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'account'>('profile');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username,
    bio: user.bio,
    email: user.email,
    avatar: user.avatar
  });
  const [privacySettings, setPrivacySettings] = useState<UserSettings>(user.settings);
  const [streamSettings, setStreamSettings] = useState(user.settings.streaming || {
    defaultTitle: 'Tactical Broadcast',
    lowLatency: true,
    allowChat: true,
    showViewers: true
  });

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

  const handleTogglePrivacy = async (key: string, value: any) => {
    const newSettings = { ...privacySettings };
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      (newSettings as any)[parent] = { ...(newSettings as any)[parent], [child]: value };
    } else {
      (newSettings as any)[key] = value;
    }
    setPrivacySettings(newSettings);
    try {
      const updated = await backendService.updateUserProfile(user.id, { settings: newSettings });
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStreaming = async (updates: any) => {
    const newStreaming = { ...streamSettings, ...updates };
    setStreamSettings(newStreaming);
    const newSettings = { ...privacySettings, streaming: newStreaming };
    setPrivacySettings(newSettings);
    try {
      const updated = await backendService.updateUserProfile(user.id, { settings: newSettings });
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNode = async () => {
    if (confirm("CRITICAL_WARNING: This operation is irreversible. All node data will be purged. Proceed?")) {
      try {
        await fetch(`http://localhost:5000/api/users/${user.id}`, { method: 'DELETE' });
        await backendService.logout();
        window.location.reload();
      } catch (err) {
        alert("PURGE_FAILURE: Authorization denied or network error.");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-end gap-4">
        <div>
          <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter">Node_Config</h2>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Mainframe_Calibration / Settings_v2.5</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Nav */}
        <div className="w-full lg:w-64 space-y-2">
          {['profile', 'streaming', 'privacy', 'account'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={`w-full text-left px-6 py-4 rounded-xl font-orbitron text-xs font-bold uppercase transition-all border ${activeTab === t ? 'bg-primary border-primary text-black' : 'bg-surface border-white/5 text-slate-500 hover:border-white/20'
                }`}
            >
              <div className="flex items-center gap-3">
                {t === 'profile' && getIcon('Users', 16)}
                {t === 'streaming' && getIcon('Radio', 16)}
                {t === 'privacy' && getIcon('Shield', 16)}
                {t === 'account' && getIcon('Cpu', 16)}
                {t}_Protocol
              </div>
            </button>
          ))}
        </div>

        {/* Form Area */}
        <div className="flex-1 glass p-10 rounded-[40px] border border-white/5 shadow-2xl">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] ml-2">Display_Alias</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm outline-none focus:border-primary text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] ml-2">Identity_Mailbox</label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 font-mono text-sm text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] ml-2">Avatar_Source_Link</label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm outline-none focus:border-primary text-white"
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] ml-2">Operator_Bio</label>
                <textarea
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm outline-none focus:border-primary resize-none text-white"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] ml-2">Visual_Theme</label>
                <div className="flex gap-4">
                  {(['dark', 'neon', 'high-contrast'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTogglePrivacy('theme', t)}
                      className={`px-4 py-2 rounded-lg font-mono text-[10px] border transition-all ${privacySettings.theme === t ? 'bg-primary text-black border-primary' : 'bg-black/20 text-slate-500 border-white/5'
                        }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-primary text-black font-orbitron font-black text-xs rounded-xl hover:bg-accent transition-all uppercase tracking-widest flex items-center gap-3 active:scale-95"
              >
                {loading && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                Execute_Sync
              </button>
            </form>
          )}

          {activeTab === 'streaming' && (
            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] ml-2">Default_Node_Title</label>
                <input
                  type="text"
                  value={streamSettings.defaultTitle}
                  onChange={(e) => handleUpdateStreaming({ defaultTitle: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm outline-none focus:border-primary text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-6 bg-black/20 rounded-3xl border border-white/5">
                  <div>
                    <h4 className="font-orbitron font-bold text-white text-sm uppercase">Low_Latency_Mode</h4>
                    <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">Reduced buffer for real-time mesh sync.</p>
                  </div>
                  <button
                    onClick={() => handleUpdateStreaming({ lowLatency: !streamSettings.lowLatency })}
                    className={`w-14 h-8 rounded-full transition-all relative ${streamSettings.lowLatency ? 'bg-primary' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${streamSettings.lowLatency ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-6 bg-black/20 rounded-3xl border border-white/5">
                  <div>
                    <h4 className="font-orbitron font-bold text-white text-sm uppercase">Allow_Chat</h4>
                    <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">Enable external node communication.</p>
                  </div>
                  <button
                    onClick={() => handleUpdateStreaming({ allowChat: !streamSettings.allowChat })}
                    className={`w-14 h-8 rounded-full transition-all relative ${streamSettings.allowChat ? 'bg-primary' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${streamSettings.allowChat ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between p-6 bg-black/20 rounded-3xl border border-white/5">
                <div>
                  <h4 className="font-orbitron font-bold text-white text-sm uppercase">Stealth_Mode (Private Profile)</h4>
                  <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">When active, your node is hidden from the public explorer.</p>
                </div>
                <button
                  onClick={() => handleTogglePrivacy('isPublic', !privacySettings.isPublic)}
                  className={`w-14 h-8 rounded-full transition-all relative ${!privacySettings.isPublic ? 'bg-primary' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${!privacySettings.isPublic ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-orbitron font-bold text-primary text-[10px] uppercase tracking-[0.3em] ml-2">Notification_Channels</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['emails', 'push', 'mentions'].map(key => (
                    <div key={key} className="p-6 bg-black/20 rounded-3xl border border-white/5 flex flex-col items-center gap-4 group hover:border-primary/20 transition-all">
                      <span className="text-[10px] font-mono text-slate-300 uppercase">{key}</span>
                      <button
                        onClick={() => handleTogglePrivacy(`notifications.${key}`, !(privacySettings.notifications as any)[key])}
                        className={`w-full py-2 rounded-lg font-mono text-[10px] transition-all border ${(privacySettings.notifications as any)[key] ? 'border-primary text-primary bg-primary/5' : 'border-white/5 text-slate-600'
                          }`}
                      >
                        {(privacySettings.notifications as any)[key] ? 'CONNECTED' : 'OFFLINE'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-10">
              <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-3xl space-y-4">
                <h4 className="font-orbitron font-black text-red-500 text-sm uppercase">Node_Destruction</h4>
                <p className="text-xs font-mono text-slate-400">Warning: Permanently purging your operator record will result in loss of all CodeBits and tournament data.</p>
                <button
                  onClick={handleDeleteNode}
                  className="px-6 py-3 bg-red-500/10 border border-red-500 text-red-500 font-orbitron text-[10px] font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all uppercase"
                >
                  Destroy_Identity
                </button>
              </div>

              {onLogout && (
                <div className="p-8 border border-white/10 bg-white/5 rounded-3xl space-y-4">
                  <h4 className="font-orbitron font-black text-white text-sm uppercase">Session_Termination</h4>
                  <p className="text-xs font-mono text-slate-400">Securely disconnect your operator node from the current session.</p>
                  <button
                    onClick={onLogout}
                    className="px-6 py-3 bg-primary text-black font-orbitron text-[10px] font-bold rounded-xl hover:bg-accent transition-all uppercase"
                  >
                    Log_Out_Node
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default Settings;
