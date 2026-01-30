import React, { useState } from 'react';
import { getIcon } from '../constants';
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
  const [needsAdminAuth, setNeedsAdminAuth] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '' // Kept for UI compatibility but ignored by Dev Auth
  });
  const [verificationCode, setVerificationCode] = useState('');

  const clearError = () => setError(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) clearError();
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    clearError();
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../services/firebase');
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        throw new Error("Failed to retrieve Google Access Token");
      }

      const authResult = await backendService.loginWithGoogle(accessToken);

      if (authResult.requireAdminAuth) {
        setCurrentEmail(authResult.email);
        setNeedsAdminAuth(true);
      } else if (authResult.require2FA) {
        setCurrentEmail(authResult.email);
        setNeedsVerification(true);
      } else {
        onAuthSuccess(authResult);
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("AUTHENTICATION_CANCELLED");
      } else {
        setError(`OAUTH_FAILURE: ${err.message || 'Unknown Error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    try {
      // Dev/Test Login
      const authResult = await backendService.login(
        formData.email,
        "PASSWORD",
        mode === 'REGISTER' ? formData.username : undefined
      );

      if (authResult.requireAdminAuth) {
        setCurrentEmail(authResult.email);
        setNeedsAdminAuth(true);
      } else if (authResult.require2FA) {
        setCurrentEmail(authResult.email);
        setNeedsVerification(true);
      } else {
        onAuthSuccess(authResult);
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      setError(`SYSTEM_FAILURE: ${err.message || 'Unknown Error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      const authResult = await backendService.verify2FA(currentEmail, verificationCode);

      if (authResult.requireAdminAuth) {
        setNeedsVerification(false);
        setNeedsAdminAuth(true);
      } else {
        onAuthSuccess(authResult);
      }
    } catch (err: any) {
      setError(`VERIFICATION_FAILED: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      const user = await backendService.verifyAdmin(currentEmail, formData.password);
      onAuthSuccess(user);
    } catch (err: any) {
      setError(`ADMIN_ACCESS_DENIED: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden font-sans text-[var(--text-primary)] selection:bg-[var(--primary-faded)]">
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
        <div className="glass rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
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
                  {getIcon('Unlock', 24)}
                </div>
                <h3 className="text-lg font-bold font-orbitron uppercase tracking-tighter text-white">Identity Handshake</h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-loose">
                  Access restricted. Verification required to prove <br />
                  ownership of <span className="text-primary">{currentEmail}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black font-mono text-slate-600 uppercase tracking-[0.3em] ml-1">TRANSMISSION_CODE</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl px-4 py-5 font-mono text-center text-3xl tracking-[0.5em] text-[var(--primary)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all shadow-inner"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl">
                <p className="text-[9px] text-slate-400 font-mono italic leading-relaxed">
                  <strong>Verification Logic:</strong> A unique 6-digit hash has been routed to your inbox. This proves the email node is live and under your control.
                </p>
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-black font-orbitron font-black rounded-2xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(0,255,0,0.2)] active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-2 text-xs">
                {loading ? <span className="animate-spin text-xl">⟳</span> : 'VERIFY_IDENTITY'}
              </button>

              <button type="button" onClick={() => setNeedsVerification(false)} className="w-full text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase tracking-[0.2em] pt-2">
                ← ABORT_HANDSHAKE
              </button>
            </form>
          ) : needsAdminAuth ? (
            <form onSubmit={handleAdminVerify} className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20 mb-4">
                  {getIcon('Lock', 24)}
                </div>
                <h3 className="text-lg font-bold font-orbitron text-red-500">SYSTEM LEVEL 5 ACCESS</h3>
                <p className="text-xs text-slate-400 font-mono">ADMINISTRATOR: <span className="text-white">{currentEmail}</span></p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider ml-1">System Passphrase</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-black/50 border border-red-500/30 rounded-2xl px-4 py-4 font-mono text-center text-lg tracking-widest text-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 outline-none transition-all placeholder:text-red-900/50"
                  placeholder="••••••••••••"
                />
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-red-600 text-black font-orbitron font-black rounded-2xl hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(255,0,0,0.2)] hover:shadow-[0_0_30px_rgba(255,0,0,0.4)] active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-2">
                {loading ? <span className="animate-spin text-xl">⟳</span> : 'Authorize Command'}
              </button>

              <button type="button" onClick={() => setNeedsAdminAuth(false)} className="w-full text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase tracking-widest pt-2">
                ← Cancel Override
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Google Button */}
              <div className="space-y-2">
                <button
                  onClick={() => loginWithGoogle()}
                  disabled={loading}
                  className="w-full py-4 bg-black border border-white/10 text-white font-orbitron font-bold rounded-2xl hover:bg-white/5 hover:border-white/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                  <div className="bg-white p-1 rounded-full w-6 h-6 flex items-center justify-center">
                    <img src="https://www.gstatic.com/firebase/static/bin/urls/google.svg" className="w-4 h-4" alt="Google" />
                  </div>

                  <span className="tracking-widest text-xs">UPLINK_WITH_GOOGLE</span>
                </button>
                <div className="px-2 flex items-center gap-2 text-[8px] font-mono text-slate-600 uppercase tracking-widest">
                  <span className="text-primary">{getIcon('Info', 10)}</span>
                  Cryptographic Handshake: Google guarantees email ownership via signed JWT.
                </div>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] font-mono text-slate-600 uppercase tracking-widest">LOCAL PROTOCOL ENTRY</span>
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