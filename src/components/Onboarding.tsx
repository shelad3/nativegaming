
import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { generateGamerArchetype } from '../services/geminiService';
import { backendService } from '@/services/backendService';
import { User } from '../types';

interface OnboardingProps {
  onComplete: (user: User) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0); // 0: Handle, 1: Avatar, 2: Interests, 3: Currency & Starter Pack, 4: AI Bio
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [starterPack, setStarterPack] = useState<'standard' | 'hacker' | 'influencer'>('standard');
  const [analyzing, setAnalyzing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [result, setResult] = useState<{ archetype: string; bio: string } | null>(null);

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
    { id: 'fps', label: 'FPS' },
    { id: 'rpg', label: 'RPG' },
    { id: 'strategy', label: 'STRATEGY' },
    { id: 'moba', label: 'MOBA' },
    { id: 'speedrun', label: 'SPEEDRUN' },
    { id: 'mmo', label: 'MMO' },
    { id: 'survival', label: 'SURVIVAL' },
    { id: 'puzzle', label: 'PUZZLE' },
  ];

  const handleAnalysis = async () => {
    if (interests.length === 0) return;
    setAnalyzing(true);
    try {
      const data = await generateGamerArchetype(interests);
      setResult(data);
      setStep(4);
    } catch (err) {
      setResult({ archetype: 'RENEGADE_OPS', bio: 'AI interface disrupted. Defaulting to renegade profile.' });
      setStep(4);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFinalize = async () => {
    setCompleting(true);
    try {
      const current = await backendService.getCurrentUser();
      if (current) {
        // Resolve starter pack assets
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
        const updatedUser = await backendService.updateUserProfile(current._id, {
          username: username,
          avatar: avatar,
          bio: result?.bio,
          preferences: interests,
          currency: currency,
          codeBits: initialCodeBits,
          inventory: starterItems,
          hasCompletedOnboarding: true
        });

        await backendService.pushAuditLog(current._id, {
          action: 'IDENTITY_CALIBRATED',
          timestamp: new Date().toISOString(),
          details: `Archetype: ${result?.archetype}`
        });

        onComplete(updatedUser);
      } else {
        console.error("User not found during finalization");
        alert("Session error. Please try refreshing.");
      }
    } catch (err) {
      console.error('Finalization failure', err);
      alert("Failed to finalize onboarding. Please check your connection.");
    } finally {
      setCompleting(false);
    }
  };

  const avatarStyles = ['avataaars', 'bottts', 'pixel-art', 'big-smile', 'adventurer'];

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,#00ff0010_0,transparent_70%)] animate-pulse"></div>
      </div>

      <div className="w-full max-w-2xl glass rounded-[40px] border border-primary/20 p-12 relative shadow-2xl z-10">

        {/* PROGRESS BAR */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden rounded-t-[40px]">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>

        {step === 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter">Identity_Link</h2>
              <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">Confirm_Operator_Handle_In_Nexus</p>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-mono text-primary uppercase tracking-widest pl-1">Handle_Assignment</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 font-mono text-xl text-white focus:border-primary outline-none transition-all placeholder:text-slate-800 shadow-inner"
                placeholder="ENTER_HANDLE"
              />
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full py-5 bg-primary text-black font-orbitron font-black rounded-2xl hover:bg-accent transition-all active:scale-95 shadow-xl"
            >
              PROCEED_TO_AVATAR_SYNC
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 text-center">
              <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter">Avatar_Calibration</h2>
              <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">Select_Visual_Manifest</p>
            </div>

            <div className="flex flex-col items-center gap-8">
              <div className="relative group">
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all animate-pulse"></div>
                <img
                  src={avatar}
                  className="w-48 h-48 rounded-full border-4 border-primary relative z-10 bg-slate-800"
                  alt="Avatar"
                />
                <button
                  onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                  className="absolute bottom-2 right-2 bg-primary p-3 rounded-full text-black hover:rotate-180 transition-all duration-500 z-20 shadow-lg"
                >
                  {getIcon('RefreshCw', 20)}
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 w-full">
                {avatarStyles.map(style => (
                  <button
                    key={style}
                    onClick={() => setAvatar(`https://api.dicebear.com/7.x/${style}/svg?seed=${avatarSeed}`)}
                    className={`py-2 text-[8px] font-mono border rounded-lg transition-all ${avatar.includes(style) ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-500'}`}
                  >
                    {style.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-5 bg-primary text-black font-orbitron font-black rounded-2xl hover:bg-accent transition-all active:scale-95 shadow-xl"
            >
              INITIALIZE_INTEREST_PROBE
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 text-center">
              <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter">Probe_Sequence</h2>
              <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">Calibrate_Gaming_Neural_Nodes</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {genres.map(g => (
                <button
                  key={g.id}
                  onClick={() => setInterests(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id])}
                  className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 active:scale-95 ${interests.includes(g.id) ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,255,0,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                >
                  <span className="text-[10px] font-orbitron font-black uppercase tracking-widest text-white">{g.label}</span>
                </button>
              ))}
            </div>
            <button
              disabled={interests.length === 0 || analyzing}
              onClick={() => setStep(3)}
              className="w-full py-5 bg-primary text-black font-orbitron font-black rounded-2xl hover:bg-accent disabled:opacity-50 transition-all shadow-xl"
            >
              CONFIGURE_OPERATOR_ASSETS
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 text-center">
              <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter">Asset_Allocation</h2>
              <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">Select_Starting_Loadout</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-primary uppercase tracking-widest pl-1">Currency_Protocol</label>
                <div className="grid grid-cols-3 gap-2">
                  {['USD', 'EUR', 'GBP'].map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`py-3 text-xs font-bold font-mono border rounded-xl transition-all ${currency === c ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-500'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-mono text-primary uppercase tracking-widest pl-1">Starter_Kit</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'standard', label: 'STANDARD_ISSUE', bonus: '1000 Ȼ', desc: 'Basic operator clearance.' },
                    { id: 'hacker', label: 'NETRUNNER_PACK', bonus: '1500 Ȼ', desc: 'Enhanced hacking utilities.' },
                    { id: 'influencer', label: 'STREAM_SUITE', bonus: '2000 Ȼ', desc: 'Broadcast optimization tools.' }
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setStarterPack(bg.id as any)}
                      className={`p-4 text-left border rounded-2xl transition-all flex justify-between items-center group ${starterPack === bg.id
                        ? 'bg-primary/10 border-primary shadow-[0_0_15px_#00ff0020]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                    >
                      <div>
                        <div className={`font-orbitron font-bold text-sm ${starterPack === bg.id ? 'text-white' : 'text-slate-400'}`}>{bg.label}</div>
                        <div className="text-[10px] font-mono text-slate-500">{bg.desc}</div>
                      </div>
                      <div className={`text-xs font-black font-mono ${starterPack === bg.id ? 'text-primary' : 'text-slate-600'}`}>{bg.bonus}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleAnalysis}
              className="w-full py-5 bg-primary text-black font-orbitron font-black rounded-2xl hover:bg-accent transition-all active:scale-95 shadow-xl"
            >
              {analyzing ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>RUNNING_GEMINI_ANALYSIS...</span>
                </div>
              ) : 'GENERATE_IDENTITY_MANIFEST'}
            </button>
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-10 text-center animate-in zoom-in-95 duration-700">
            <div className="space-y-4">
              <span className="text-primary font-mono text-[9px] tracking-[0.5em] uppercase border border-primary/30 px-4 py-1 rounded-full bg-primary/5">MANIFEST_RESOLVED</span>
              <h2 className="text-6xl font-orbitron font-black text-white glow-text uppercase leading-none">{result.archetype}</h2>
            </div>

            <div className="bg-primary/5 p-8 rounded-[30px] border border-primary/20 relative group">
              <div className="absolute top-0 left-4 -translate-y-1/2 bg-secondary px-3 py-1 text-[8px] font-mono text-primary border border-primary/20 rounded uppercase">AI_Generated_Bio</div>
              <p className="text-slate-200 font-mono text-sm leading-relaxed italic opacity-80 group-hover:opacity-100 transition-opacity">"{result.bio}"</p>
              <div className="absolute -bottom-2 -right-2 text-primary/20 opacity-20">{getIcon('Quote', 40)}</div>
            </div>

            <button
              onClick={handleFinalize}
              disabled={completing}
              className="w-full py-6 bg-primary text-black font-orbitron font-black rounded-2xl hover:bg-accent transition-all active:scale-95 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              {completing ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>UPLOADING_VECTORS_TO_MESH...</span>
                </div>
              ) : 'ENTER_NATIVE_CODEX'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;