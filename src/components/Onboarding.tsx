import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { generateGamerArchetype } from '../services/geminiService';
import { backendService } from '../services/backendService';
import { User } from '../types';

interface OnboardingProps {
  onComplete: (user: User) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0); // 0: Welcome, 1: Avatar, 2: Gaming Prefs, 3: Skill Assessment, 4: Starter Pack, 5: AI Summary
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'pro'>('intermediate');
  const [playstyle, setPlaystyle] = useState<'casual' | 'competitive' | 'both'>('both');
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [starterPack, setStarterPack] = useState<'standard' | 'hacker' | 'influencer'>('hacker');
  const [analyzing, setAnalyzing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [result, setResult] = useState<{ archetype: string; bio: string } | null>(null);
  const [usernameError, setUsernameError] = useState('');

  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString(36).substring(7));

  useEffect(() => {
    const fetchUser = async () => {
      const current = await backendService.getCurrentUser();
      if (current) {
        setUsername(current.username);
        setAvatar(current.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`);
      }
    };
    fetchUser();
  }, [avatarSeed]);

  const genres = [
    { id: 'fps', label: 'Tactical Combat', emoji: '🎯', description: 'Precision & Reflex Operations', color: 'from-red-600 to-orange-600' },
    { id: 'rpg', label: 'Identity Progression', emoji: '⚔️', description: 'Narrative & Stat Evolution', color: 'from-purple-600 to-pink-600' },
    { id: 'strategy', label: 'Strategic command', emoji: '🧠', description: 'Resource & Logic Management', color: 'from-blue-600 to-cyan-600' },
    { id: 'moba', label: 'Arena Dominance', emoji: '🏆', description: 'Team-Based Tactical Control', color: 'from-green-600 to-emerald-600' },
    { id: 'speedrun', label: 'Temporal Mastery', emoji: '⚡', description: 'High-Efficiency Completion', color: 'from-yellow-600 to-amber-600' },
    { id: 'mmo', label: 'Massive Mesh', emoji: '🌐', description: 'Large-Scale Social Systems', color: 'from-indigo-600 to-violet-600' },
    { id: 'survival', label: 'Persistence Ops', emoji: '🏕️', description: 'Endurance & Base Logistics', color: 'from-teal-600 to-green-600' },
    { id: 'puzzle', label: 'Cognitive Breach', emoji: '🧩', description: 'Advanced Pattern Analysis', color: 'from-pink-600 to-rose-600' },
  ];

  const checkUsernameValidity = (name: string) => {
    if (name.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
    if (name.length > 20) return { valid: false, error: 'Username must be less than 20 characters' };
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return { valid: false, error: 'Only letters, numbers, and underscores allowed' };
    return { valid: true, error: '' };
  };

  const handleUsernameChange = (name: string) => {
    setUsername(name);
    const { error } = checkUsernameValidity(name);
    setUsernameError(error);
  };

  const handleNextStep = () => {
    const { valid, error } = checkUsernameValidity(username);
    if (valid) {
      setStep(1);
    } else {
      setUsernameError(error);
    }
  };

  const handleAnalysis = async () => {
    if (interests.length === 0) return;
    setAnalyzing(true);
    try {
      const data = await generateGamerArchetype(interests);
      setResult(data);
      setStep(5);
    } catch (err) {
      setResult({ archetype: 'VANGUARD OPERATOR', bio: 'Strategic combatant specialized in high-stakes multi-mesh operations.' });
      setStep(5);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFinalize = async () => {
    setCompleting(true);
    try {
      const current = await backendService.getCurrentUser();
      if (current) {
        let initialCodeBits = 1000;
        let starterItems: string[] = [];

        if (starterPack === 'hacker') {
          initialCodeBits = 1500;
          starterItems = ['cyber_deck_basic'];
        } else if (starterPack === 'influencer') {
          initialCodeBits = 2000;
          starterItems = ['stream_cam_v1'];
        } else {
          starterItems = ['standard_badge'];
        }

        // CORRECT HANDSHAKE: Uses the dedicated /onboard endpoint
        const updatedUser = await backendService.onboard(current._id, {
          archetype: result?.archetype || 'OPERATOR',
          bio: result?.bio || 'Identity initialized.',
          preferences: interests
        });

        // Background update for non-handshake fields
        await backendService.updateUserProfile(current._id, {
          username: username,
          avatar: avatar,
          codeBits: initialCodeBits,
          inventory: starterItems
        });

        await backendService.pushAuditLog(current._id, {
          action: 'ONBOARDING_COMPLETED',
          timestamp: new Date().toISOString(),
          details: `Archetype: ${result?.archetype}, Level: ${experienceLevel}, Playstyle: ${playstyle}`
        });

        onComplete(updatedUser);
      } else {
        console.error("User not found during finalization");
        alert("Authentication failed. Please re-login.");
      }
    } catch (err) {
      console.error('Handshake failure', err);
      alert("System Handshake Failed. Retrying...");
    } finally {
      setCompleting(false);
    }
  };

  const avatarStyles = ['avataaars', 'bottts', 'pixel-art', 'big-smile', 'adventurer'];

  const totalSteps = 6;
  const progressPercent = (step / (totalSteps - 1)) * 100;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans text-[var(--text-primary)]">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-3xl bg-[var(--bg-secondary)] backdrop-blur-xl rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-2xl relative z-10 overflow-hidden">

        {/* Progress Bar */}
        <div className="relative h-2 bg-[var(--bg-modifier-active)]">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary)] transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-r from-transparent to-white/30 animate-pulse"></div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-8 pt-6 pb-4">
          <div className="flex items-center justify-between">
            {['Provisioning', 'Identity', 'Specialization', 'Proficiency', 'Gear Cache', 'Sync'].map((label, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${idx < step ? 'bg-[var(--primary)] text-black' :
                  idx === step ? 'bg-[var(--primary)] text-black ring-4 ring-[var(--primary-faded)]' :
                    'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                  }`}>
                  {idx < step ? '✓' : idx + 1}
                </div>
                <span className={`text-[9px] font-medium uppercase tracking-wider hidden sm:block ${idx === step ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                  }`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 md:p-12">

          {/* STEP 0: Welcome */}
          {step === 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-4">
                <div className="inline-block p-4 bg-primary/10 rounded-2xl mb-4">
                  <span className="text-5xl">🎮</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight uppercase tracking-tighter">
                  Initialize <span className="text-primary">System Uplink</span>
                </h1>
                <p className="text-sm font-mono text-slate-500 max-w-md mx-auto uppercase tracking-widest">
                  Secure Identity Handshake Required for Mesh Access
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Operator Callsign</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-4 text-lg text-white font-mono focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-slate-800"
                    placeholder="ENTER_ID"
                  />
                  {usernameError && (
                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      {getIcon('AlertCircle', 14)} {usernameError}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="text-blue-400 mt-0.5">{getIcon('Info', 18)}</div>
                  <div className="text-sm text-slate-300">
                    <strong className="text-blue-300">Quick Tip:</strong> Choose a memorable username - you can't change it later!
                  </div>
                </div>
              </div>

              <button
                onClick={handleNextStep}
                disabled={!checkUsernameValidity(username).valid}
                className="w-full py-4 bg-primary hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-bold rounded-xl transition-all active:scale-95 shadow-lg disabled:shadow-none"
              >
                Continue to Avatar
              </button>
            </div>
          )}

          {/* STEP 1: Avatar Selection */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white">Pick Your Avatar</h2>
                <p className="text-slate-400">Choose a style that represents you</p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="absolute -inset-6 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <img
                    src={avatar}
                    className="w-40 h-40 rounded-full border-4 border-primary relative z-10 bg-slate-800 shadow-xl"
                    alt="Avatar"
                  />
                  <button
                    onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                    className="absolute bottom-0 right-0 bg-primary hover:bg-emerald-400 p-3 rounded-full text-black transition-all duration-300 hover:rotate-180 z-20 shadow-lg"
                  >
                    {getIcon('RefreshCw', 20)}
                  </button>
                </div>

                <div className="w-full space-y-3">
                  <label className="text-sm font-semibold text-slate-300">Avatar Style</label>
                  <div className="grid grid-cols-5 gap-2">
                    {avatarStyles.map(style => (
                      <button
                        key={style}
                        onClick={() => setAvatar(`https://api.dicebear.com/7.x/${style}/svg?seed=${avatarSeed}`)}
                        className={`py-3 text-[9px] font-bold uppercase border rounded-lg transition-all ${avatar.includes(style)
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                      >
                        {style.split('-')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 bg-primary hover:bg-emerald-400 text-black font-bold rounded-xl transition-all active:scale-95 shadow-lg"
                >
                  Next: Gaming Preferences
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Gaming Preferences */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white">What Do You Play?</h2>
                <p className="text-slate-400">Select your favorite game genres (choose at least 1)</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {genres.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setInterests(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id])}
                    className={`relative p-5 rounded-2xl border transition-all group overflow-hidden ${interests.includes(g.id)
                      ? 'bg-gradient-to-br ' + g.color + ' border-white/30 shadow-xl scale-105'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                  >
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <span className="text-3xl">{g.emoji}</span>
                      <span className={`text-xs font-bold uppercase ${interests.includes(g.id) ? 'text-white' : 'text-slate-400'}`}>
                        {g.label}
                      </span>
                      {interests.includes(g.id) && (
                        <div className="absolute -top-1 -right-1 bg-white text-black w-5 h-5 rounded-full flex items-center justify-center text-xs">
                          ✓
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {interests.length > 0 && (
                <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                  <p className="text-sm text-slate-300 text-center">
                    ✨ <strong className="text-primary">{interests.length} genre{interests.length > 1 ? 's' : ''}</strong> selected - Great choices!
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all"
                >
                  Back
                </button>
                <button
                  disabled={interests.length === 0}
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 bg-primary hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-bold rounded-xl transition-all active:scale-95 shadow-lg"
                >
                  Next: Skill Assessment
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Skill Assessment */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Operator Proficiency</h2>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Calibrating Performance Parameters</p>
              </div>

              <div className="space-y-6">
                {/* Experience Level */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Combat Grade</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'beginner', label: 'RECRUIT', emoji: '🌱', desc: 'Initial Entry' },
                      { id: 'intermediate', label: 'VETERAN', emoji: '⚡', desc: 'Standard Ops' },
                      { id: 'pro', label: 'ELITE', emoji: '🏆', desc: 'High-Rank' }
                    ].map(level => (
                      <button
                        key={level.id}
                        onClick={() => setExperienceLevel(level.id as any)}
                        className={`p-4 rounded-xl border transition-all text-left ${experienceLevel === level.id
                          ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,255,65,0.1)]'
                          : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                          }`}
                      >
                        <div className={`text-[10px] font-black mb-1 font-mono ${experienceLevel === level.id ? 'text-primary' : 'text-slate-600'}`}>
                          {level.label}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{level.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Playstyle */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Operational Focus</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'casual', label: 'SOCIAL', emoji: '🎮', desc: 'Leisure Ops' },
                      { id: 'competitive', label: 'LETHAL', emoji: '⚔️', desc: 'Aggressive' },
                      { id: 'both', label: 'HYBRID', emoji: '🎯', desc: 'Versatile' }
                    ].map(style => (
                      <button
                        key={style.id}
                        onClick={() => setPlaystyle(style.id as any)}
                        className={`p-4 rounded-xl border transition-all text-left ${playstyle === style.id
                          ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,255,65,0.1)]'
                          : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                          }`}
                      >
                        <div className={`text-[10px] font-black mb-1 font-mono ${playstyle === style.id ? 'text-primary' : 'text-slate-600'}`}>
                          {style.label}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{style.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weekly Hours */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Mesh Uptime / Week</label>
                    <span className="text-xl font-black text-primary font-mono">{weeklyHours}H</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-4 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-500 font-bold rounded-xl transition-all uppercase text-xs tracking-widest"
                >
                  Return
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-4 bg-primary hover:bg-emerald-400 text-black font-bold rounded-xl transition-all active:scale-95 shadow-lg uppercase text-xs tracking-widest"
                >
                  Proceed to Gear Cache
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Starter Pack */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Provisioning Cache</h2>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Select Initial Asset Configuration</p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'standard',
                    label: 'OFFICER BUNDLE',
                    emoji: '📦',
                    codeBits: 1000,
                    perks: ['Standard ID Badge', 'Basic Cloud Node', 'Global Mesh Access'],
                    recommended: false
                  },
                  {
                    id: 'hacker',
                    label: 'NETRUNNER GRID',
                    emoji: '💻',
                    codeBits: 1500,
                    perks: ['Mk.1 Cyber Deck', 'Security Clearance', 'Thematic Overlays'],
                    recommended: true
                  },
                  {
                    id: 'influencer',
                    label: 'CONTENT CORE',
                    emoji: '📹',
                    codeBits: 2000,
                    perks: ['HD Stream Module', 'Creator Verified ID', 'Priority Uplink'],
                    recommended: false
                  }
                ].map(pack => (
                  <button
                    key={pack.id}
                    onClick={() => setStarterPack(pack.id as any)}
                    className={`relative w-full p-5 text-left border rounded-2xl transition-all ${starterPack === pack.id
                      ? 'bg-primary/5 border-primary/40 shadow-[0_0_20px_rgba(0,255,65,0.05)]'
                      : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                      }`}
                  >
                    {pack.recommended && (
                      <div className="absolute -top-2 left-4 px-3 py-1 bg-primary text-black text-[8px] font-black uppercase rounded-full tracking-widest">
                        OPTIMIZED
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${starterPack === pack.id ? 'bg-primary/20 text-primary' : 'bg-slate-900 text-slate-600'}`}>
                            {pack.id === 'standard' ? getIcon('Shield', 20) : pack.id === 'hacker' ? getIcon('Zap', 20) : getIcon('Video', 20)}
                          </div>
                          <div>
                            <h3 className={`text-sm font-black font-mono tracking-tighter ${starterPack === pack.id ? 'text-primary' : 'text-slate-400'}`}>
                              {pack.label}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-600 font-mono tracking-wider">{pack.codeBits} CODE_BITS_INITIAL</p>
                          </div>
                        </div>
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                          {pack.perks.map((perk, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-[9px] text-slate-500 font-mono uppercase">
                              <span className="text-primary/40">»</span> {perk}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {starterPack === pack.id && (
                        <div className="text-primary animate-pulse">{getIcon('CheckCircle', 20)}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-4 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-500 font-bold rounded-xl transition-all uppercase text-xs tracking-widest"
                >
                  Return
                </button>
                <button
                  onClick={handleAnalysis}
                  disabled={analyzing}
                  className="flex-1 py-4 bg-primary hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-black font-bold rounded-xl transition-all active:scale-95 shadow-lg uppercase text-xs tracking-widest"
                >
                  {analyzing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>SYNCING...</span>
                    </div>
                  ) : 'Generate ID Profile'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Identity Synchronization */}
          {step === 5 && result && (
            <div className="space-y-8 animate-in zoom-in-95 duration-700">
              <div className="text-center space-y-4">
                <div className="inline-block px-4 py-1 bg-primary/20 border border-primary/40 rounded-full">
                  <span className="text-primary font-black text-[10px] uppercase tracking-[0.3em]">SYNCHRONIZATION_COMPLETE</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight uppercase tracking-tighter">
                  {result.archetype}
                </h2>
              </div>

              <div className="bg-slate-950 border border-white/5 p-6 md:p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary/40"></div>
                <div className="absolute top-0 left-6 -translate-y-1/2 bg-slate-900 px-3 py-1 text-[8px] font-black text-primary border border-primary/20 rounded uppercase tracking-widest">
                  ALGORITHM_IDENT_BIO
                </div>
                <p className="text-slate-300 text-base md:text-lg leading-relaxed font-mono">
                  "{result.bio}"
                </p>
              </div>

              {/* Protocol Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'UPLINK_STATUS', value: 'OPTIMIZED', icon: 'Activity' },
                  { label: 'ENCRYPTION', value: 'AES_256_EXT', icon: 'Lock' },
                  { label: 'MESH_PRIORITY', value: 'HIGH_LATENCY_L1', icon: 'Cpu' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-slate-950/50 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                    <div className="text-primary/40">{getIcon(stat.icon as any, 16)}</div>
                    <div>
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</div>
                      <div className="text-[10px] font-bold text-white font-mono">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleFinalize}
                disabled={completing}
                className="w-full py-5 bg-primary hover:bg-emerald-400 disabled:bg-slate-900 disabled:text-slate-700 text-black font-black rounded-xl transition-all active:scale-95 shadow-[0_0_30px_rgba(0,255,65,0.2)] relative overflow-hidden group text-xs uppercase tracking-[0.4em]"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                {completing ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>ESTABLISHING_LINK...</span>
                  </div>
                ) : 'Enter the Mesh'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Onboarding;