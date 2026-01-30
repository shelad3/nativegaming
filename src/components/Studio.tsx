
import React, { useState, useEffect, useRef } from 'react';
import { getIcon, GAMELIST } from '../constants';
import { moderateContent } from '../services/geminiService';
import { backendService } from '../services/backendService';
import { User, Post } from '../types';
import { useStreaming } from '../hooks/useStreaming';
import { useSocket } from '../context/SocketContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface StudioProps {
  user: User;
  onUpdate?: (user: User) => void;
}

const Studio: React.FC<StudioProps> = ({ user, onUpdate }) => {
  const [activeWing, setActiveWing] = useState<'forge' | 'broadcast'>('forge');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Broadcast State ---
  const [isLive, setIsLive] = useState(user.isLive || false);
  const [streamTime, setStreamTime] = useState(0);
  const [obsKeyRevealed, setObsKeyRevealed] = useState(false);
  const [streamMetrics, setStreamMetrics] = useState<{ time: string, bitrate: number, viewers: number }[]>([]);

  // --- Forge (Upload) State ---
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    game: GAMELIST[0],
    type: 'VOD' as 'VOD' | 'CLIP' | 'SHORT'
  });

  const { peerId, stream, startCapture } = useStreaming(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const forgeVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [selectedFile]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setStreamMetrics(prev => {
        const newMetric = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          bitrate: 5500 + Math.random() * 1500,
          viewers: Math.floor(100 + Math.random() * 50)
        };
        const updated = [...prev, newMetric];
        return updated.length > 15 ? updated.slice(1) : updated;
      });
      setStreamTime(prev => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    if (activeWing === 'broadcast' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [activeWing, stream]);

  // --- Handlers ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleForgeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const moderation = await moderateContent(uploadForm.title, uploadForm.description);
      if (!moderation.allowed) throw new Error(`CONTENT_REJECTED: ${moderation.reason}`);

      const assetUrl = await backendService.uploadAsset(selectedFile, (p) => setUploadProgress(p));

      const mediaResp = await fetch('http://localhost:5000/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId: user.id,
          type: uploadForm.type,
          title: uploadForm.title,
          url: assetUrl,
          thumbnail: assetUrl,
          game: uploadForm.game,
          description: uploadForm.description
        })
      });

      if (!mediaResp.ok) throw new Error("Sync Failure");

      setSuccess('FORGE_COMPLETE: Data merged into the mesh.');
      setSelectedFile(null);
      setUploadForm({ title: '', description: '', game: GAMELIST[0], type: 'VOD' });
    } catch (err: any) {
      setError(err.message || 'FORGE_FAILURE: Link severed.');
    } finally {
      setUploading(false);
    }
  };

  const handleGoLive = async () => {
    setLoading(true);
    try {
      if (!stream) await startCapture('camera', { video: true, audio: true });
      const updatedUser = await backendService.startStream(user.id, {
        title: uploadForm.title || "Elite Broadcast",
        game: uploadForm.game,
        description: uploadForm.description,
        peerId: peerId
      });
      setIsLive(true);
      if (onUpdate) onUpdate(updatedUser);
    } catch (err) {
      setError("UPLINK_ERROR: Handshake failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleStopStream = async () => {
    setLoading(true);
    try {
      const updatedUser = await backendService.stopStream(user.id);
      setIsLive(false);
      if (onUpdate) onUpdate(updatedUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">

      {/* Operating Mode Switcher */}
      <div className="flex justify-center">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex relative shadow-2xl">
          <button
            onClick={() => setActiveWing('forge')}
            className={`relative z-10 px-8 py-3 rounded-xl font-orbitron text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 ${activeWing === 'forge' ? 'text-black' : 'text-slate-500 hover:text-white'}`}
          >
            {getIcon('Tool', 16)} Content_Studio
          </button>
          <button
            onClick={() => setActiveWing('broadcast')}
            className={`relative z-10 px-8 py-3 rounded-xl font-orbitron text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 ${activeWing === 'broadcast' ? 'text-black' : 'text-slate-500 hover:text-white'}`}
          >
            {getIcon('Radio', 16)} Live_Streamer
          </button>

          {/* Animated Slider Backdrop */}
          <div
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-primary rounded-xl transition-all duration-500 ease-out shadow-[0_0_20px_rgba(16,185,129,0.4)] ${activeWing === 'broadcast' ? 'left-[calc(50%+1.5px)]' : 'left-1.5'}`}
          ></div>
        </div>
      </div>

      <div className="min-h-[600px]">
        {/* CONTENT STUDIO WING (UPLOADING) */}
        {activeWing === 'forge' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-left-8 duration-700">
            {/* Upload Zone */}
            <div className="lg:col-span-12 xl:col-span-7">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`group relative aspect-video rounded-[3rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center ${selectedFile ? 'border-primary bg-primary/5' : 'border-white/10 bg-black/20 hover:border-white/30 hover:bg-white/5'}`}
              >
                {previewUrl ? (
                  <video
                    ref={forgeVideoRef}
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover rounded-[2.5rem] p-4"
                  />
                ) : (
                  <div className="text-center space-y-6 scale-110">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto text-primary border border-primary/20 shadow-[0_0_30px_rgba(16,185,129,0.1)] group-hover:scale-110 group-hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all">
                      {getIcon('UploadCloud', 40)}
                    </div>
                    <div>
                      <p className="font-orbitron font-black text-white text-xl uppercase tracking-tighter">Upload_New_Post</p>
                      <p className="font-mono text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Supports .mp4 .mov .mkv // Max capacity 2.0GB</p>
                    </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileSelect} />
              </div>
            </div>

            {/* Post Details Form */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-6">
              <div className="bg-surface/30 backdrop-blur-xl border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                {/* Glassy Background Icon */}
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  {getIcon('Cpu', 160)}
                </div>

                <h3 className="text-lg font-orbitron font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                  {getIcon('Edit3', 20)} Post_Details
                </h3>

                <form onSubmit={handleForgeUpload} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-2">Post_Title</label>
                    <input
                      required
                      value={uploadForm.title}
                      onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="My New Gameplay"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-xs text-white outline-none focus:border-primary transition-all shadow-inner"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-2">Description</label>
                    <textarea
                      required
                      rows={4}
                      value={uploadForm.description}
                      onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Write something about your post..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-xs text-white outline-none focus:border-primary transition-all resize-none shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-2">Category</label>
                      <select
                        value={uploadForm.game}
                        onChange={e => setUploadForm({ ...uploadForm, game: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 font-mono text-[10px] text-white outline-none focus:border-primary appearance-none"
                      >
                        {GAMELIST.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-2">Format</label>
                      <select
                        value={uploadForm.type}
                        onChange={e => setUploadForm({ ...uploadForm, type: e.target.value as any })}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 font-mono text-[10px] text-white outline-none focus:border-primary appearance-none"
                      >
                        <option value="VOD">STANDARD_VOD</option>
                        <option value="CLIP">HIGHLIGHT_CLIP</option>
                        <option value="SHORT">SOCIAL_SHORT</option>
                      </select>
                    </div>
                  </div>

                  {uploading && (
                    <div className="space-y-2 bg-black/20 p-4 rounded-xl border border-white/5">
                      <div className="flex justify-between text-[9px] font-mono text-primary font-black">
                        <span className="animate-pulse">UPLOADING_FILE...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  {error && <p className="text-[9px] font-mono text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}
                  {success && <p className="text-[9px] font-mono text-primary bg-primary/10 p-3 rounded-xl border border-primary/20">{success}</p>}

                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="w-full py-5 bg-primary text-black font-orbitron font-black text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50 disabled:grayscale"
                  >
                    {uploading ? 'PROCESSING...' : 'UPLOAD_POST'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* LIVE STREAMER WING (STREAMING) */}
        {activeWing === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-8 duration-700">
            {/* Main Stream Feed */}
            <div className="lg:col-span-8 space-y-6">
              <div className="group relative aspect-video bg-black rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
                <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isLive ? 'opacity-100' : 'opacity-40 grayscale'}`} />

                {!isLive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center pointer-events-none">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-700 animate-pulse">
                      {getIcon('Radio', 40)}
                    </div>
                    <h4 className="text-xl font-orbitron font-black text-white uppercase tracking-tighter">Stream_Offline</h4>
                    <p className="text-xs font-mono text-slate-500 mt-2 uppercase tracking-widest">Connect your camera and click "Start Streaming" to go live.</p>
                  </div>
                )}

                {/* Status Overlays */}
                <div className="absolute top-8 left-8 flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-2 ${isLive ? 'bg-red-600/20 text-red-500' : 'bg-black/60 text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-orbitron font-black uppercase">{isLive ? 'LIVE' : 'OFFLINE'}</span>
                  </div>
                  {isLive && (
                    <div className="px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 bg-black/60 text-white flex items-center gap-2">
                      <span className="text-[10px] font-mono flex items-center gap-1">{getIcon('Users', 12)} {streamMetrics.length > 0 ? streamMetrics[streamMetrics.length - 1].viewers : 0}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Operational Metrics */}
              <div className="grid grid-cols-2 gap-6 h-48">
                <div className="bg-surface/30 backdrop-blur-xl border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[9px] font-orbitron font-bold text-slate-400 uppercase flex items-center gap-2">{getIcon('Zap', 12)} Stream_Quality</h3>
                    <span className="font-mono text-[10px] text-primary">{streamMetrics.length > 0 ? Math.round(streamMetrics[streamMetrics.length - 1].bitrate) : 0} kbps</span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={streamMetrics}>
                        <Area type="monotone" dataKey="bitrate" stroke="#10b981" fill="#10b98120" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-surface/30 backdrop-blur-xl border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[9px] font-orbitron font-bold text-slate-400 uppercase flex items-center gap-2">{getIcon('Users', 12)} Current_Viewers</h3>
                    <span className="font-mono text-[10px] text-white">{streamMetrics.length > 0 ? streamMetrics[streamMetrics.length - 1].viewers : 0}</span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={streamMetrics}>
                        <Line type="stepAfter" dataKey="viewers" stroke="#fff" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Management */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface/30 backdrop-blur-xl border border-white/5 p-8 rounded-[3rem] space-y-6">
                <h3 className="text-[10px] font-orbitron font-bold text-white uppercase tracking-widest flex items-center gap-2">{getIcon('Settings', 14)} Stream_Controls</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-[8px] font-mono text-slate-500 uppercase ml-2 mb-1 block">Private_Stream_Key</label>
                    <div className="relative">
                      <input
                        readOnly
                        type={obsKeyRevealed ? "text" : "password"}
                        value={user.streamKey || "live_sk_test_12345"}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-[10px] text-white outline-none"
                      />
                      <button onClick={() => setObsKeyRevealed(!obsKeyRevealed)} className="absolute right-3 top-2.5 text-slate-500">
                        {getIcon(obsKeyRevealed ? 'EyeOff' : 'Eye', 16)}
                      </button>
                    </div>
                  </div>

                  {!isLive ? (
                    <button
                      onClick={handleGoLive}
                      disabled={loading}
                      className="w-full py-4 bg-primary text-black font-orbitron font-black text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all uppercase"
                    >
                      {loading ? 'Starting...' : 'Start_Streaming'}
                    </button>
                  ) : (
                    <button
                      onClick={handleStopStream}
                      disabled={loading}
                      className="w-full py-4 bg-red-600 text-white font-orbitron font-black text-xs rounded-2xl shadow-xl shadow-red-600/20 hover:scale-105 active:scale-95 transition-all uppercase"
                    >
                      End_Stream
                    </button>
                  )}
                </div>
              </div>

              {/* Live Chat Mockup */}
              <div className="flex-1 bg-black/40 border border-white/5 rounded-[3rem] p-6 h-[250px] flex flex-col relative overflow-hidden group">
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black pointer-events-none z-10"></div>

                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 relative z-20">
                  <h3 className="text-[10px] font-orbitron font-bold text-white uppercase tracking-widest">Live_Chat</h3>
                  <span className="flex items-center gap-1.5 text-[9px] font-mono text-primary font-black animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_primary]"></span>
                    CONNECTED
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-2 relative z-20 custom-scrollbar">
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold text-primary font-mono">ModNode:</span>
                    <span className="text-[10px] text-white/70 font-mono">Stream is operational. Looking good!</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold text-slate-500 font-mono">User_77:</span>
                    <span className="text-[10px] text-white/70 font-mono">That ELO rank is insane.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold text-blue-400 font-mono">MVP_Prime:</span>
                    <span className="text-[10px] text-white/70 font-mono">Ready for the tournament!</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 relative z-20">
                  <input
                    disabled
                    placeholder="Chat disabled in preview..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-mono text-[10px] text-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Studio;