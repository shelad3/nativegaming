import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { auth } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { backendService } from '../services/backendService';
import { User } from '../types';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [verificationCode, setVerificationCode] = useState('');

  // Initial Config Check
  useEffect(() => {
    if (!auth.app.options.apiKey) {
      setError("CRITICAL: Firebase Configuration Missing. Check .env.local");
    }
  }, []);

  const clearError = () => setError(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) clearError();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearError();
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email;

      if (!userEmail) throw new Error("IDENTITY_PROVIDER_ERROR: No email returned.");

      // Backend sync - Auto-verified by logic in server
      const user = await backendService.login(userEmail, "OAUTH");
      onAuthSuccess(user);
    } catch (err: any) {
      console.error('OAuth Error:', err);
      setError(err.message || "CONNECTION_REFUSED_BY_PEER");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    try {
      let firebaseUser;
      if (mode === 'LOGIN') {
        const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        firebaseUser = result.user;
      } else {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        firebaseUser = result.user;
      }

      if (firebaseUser.email) {
        setCurrentEmail(firebaseUser.email);
        // Login to backend to check verification status
        const userResp: any = await backendService.login(
          firebaseUser.email,
          "PASSWORD",
          mode === 'REGISTER' ? formData.username : undefined
        );

        if (userResp.verificationRequired) {
          setNeedsVerification(true);
        } else {
          onAuthSuccess(userResp);
        }
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      // Map Firebase errors to "System" errors
      if (err.code === 'auth/invalid-credential') setError("ACCESS_DENIED: INVALID_CREDENTIALS");
      else if (err.code === 'auth/email-already-in-use') setError("IDENTITY_CONFLICT: EMAIL_REGISTERED");
      else if (err.code === 'auth/weak-password') setError("SECURITY_WARNING: WEAK_CIPHER");
      else setError(`SYSTEM_FAILURE: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      const user = await backendService.verifyEmail(currentEmail, verificationCode);
      onAuthSuccess(user);
    } catch (err: any) {
      setError(`VERIFICATION_FAILED: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden font-sans text-white selection:bg-primary/30">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 p-6">

        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="inline-block relative">
            <h1 className="font-logo text-6xl text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-2 tracking-tighter drop-shadow-2xl">
              NATIVE
            </h1>
            <div className="absolute -right-4 top-0 w-2 h-2 bg-primary rounded-full animate-ping"></div>
          </div>
          <p className="font-mono text-[10px] tracking-[0.4em] text-primary/80 uppercase">
            {mode === 'LOGIN' ? 'Secure_Uplink_Establishment' : 'New_Node_Provisioning'}
          </p>
        </div>

        {/* Main Card */}
        <div className="glass rounded-[32px] border border-white/10 p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Gloss Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-mono flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="mt-0.5">{getIcon('Zap', 14)}</div>
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {needsVerification ? (
            <form onSubmit={handleVerify} className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary border border-primary/20 mb-4">
                  {getIcon('Shield', 24)}
                </div>
                <h3 className="text-lg font-bold font-orbitron">VERIFY IDENTITY</h3>
                <p className="text-xs text-slate-400 font-mono">CODE SENT TO: <span className="text-white">{currentEmail}</span></p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider ml-1">Secure Code</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-4 font-mono text-center text-2xl tracking-[0.5em] text-primary focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-black font-orbitron font-black rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(0,255,0,0.2)] hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-2">
                {loading ? <span className="animate-spin text-xl">⟳</span> : 'Authenticate'}
              </button>

              <button type="button" onClick={() => setNeedsVerification(false)} className="w-full text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase tracking-widest pt-2">
                ← Abort Protocol
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Google Button */}
              {/* Google Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-4 bg-black border border-white/10 text-white font-orbitron font-bold rounded-2xl hover:bg-white/5 hover:border-white/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                {/* Custom Google Icon Container for better alignment */}
                <div className="bg-white p-1 rounded-full w-6 h-6 flex items-center justify-center">
                  <img src="https://www.gstatic.com/firebase/static/bin/urls/google.svg" className="w-4 h-4" alt="Google" />
                </div>

                <span className="tracking-widest text-xs">INITIALIZE_WITH_GOOGLE</span>
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest">OR VIA ENCRYPTED LINK</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                {mode === 'REGISTER' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider ml-1">Handle</label>
                    <input
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm font-mono text-white focus:border-primary/50 focus:bg-black/60 outline-none transition-all placeholder:text-slate-700"
                      placeholder="CYBER_NINJA"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider ml-1">Email Coordinates</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm font-mono text-white focus:border-primary/50 focus:bg-black/60 outline-none transition-all placeholder:text-slate-700"
                    placeholder="operator@native.net"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider ml-1">Passphrase</label>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-sm font-mono text-white focus:border-primary/50 focus:bg-black/60 outline-none transition-all placeholder:text-slate-700"
                    placeholder="••••••••••••"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full py-4 bg-white/5 border border-white/10 text-primary font-orbitron font-bold rounded-2xl hover:bg-white/10 hover:border-primary/50 transition-all active:scale-[0.98] mt-4 shadow-lg uppercase tracking-wide flex items-center justify-center gap-2">
                  {loading ? <span className="animate-spin">⟳</span> : (mode === 'LOGIN' ? 'Access Terminal' : 'Initialize Node')}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Switcher */}
        <div className="mt-8 text-center cursor-pointer group" onClick={() => { setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); clearError(); }}>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest group-hover:text-primary transition-colors">
            {mode === 'LOGIN' ? "No Identity? Request Provisioning" : "Already Provisioned? Access Terminal"}
          </p>
        </div>

      </div>
    </div>
  );
};

export default Auth;