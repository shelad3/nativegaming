
import React, { useState, useEffect, useRef } from 'react';
import { getIcon, GAMELIST } from '../constants';
import { moderateContent } from '../services/geminiService';
import { backendService } from '../services/backendService';
import { User, Post } from '../types';
import MediaGallery from './MediaGallery';

import { useStreaming } from '../hooks/useStreaming';
import { useSocket } from '../context/SocketContext';

interface DeviceInfo {
  id: string;
  label: string;
}

interface AuditEntry {
  id: string;
  title: string;
  timestamp: string;
  status: 'ACCEPTED' | 'REJECTED';
  reason?: string;
}

interface StudioProps {
  user: User;
}

const Studio: React.FC<StudioProps> = ({ user }) => {
  const [isLive, setIsLive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streamTime, setStreamTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [systemLogs, setSystemLogs] = useState<string[]>(['[SYS] Node initialized...', '[SYS] Content Guard active.']);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userMedia, setUserMedia] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const { peerId, stream, startCapture } = useStreaming(true);
  const { socket } = useSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [metrics, setMetrics] = useState({
    bitrate: 6500,
    fps: 60,
    health: 'STABLE'
  });

  useEffect(() => {
    if (!isLive || !socket) return;
    const interval = setInterval(() => {
      const newBitrate = 6000 + Math.floor(Math.random() * 1000);
      socket.emit('broadcast_metrics', {
        streamId: user.id,
        bitrate: newBitrate,
        fps: 60,
        health: 'STABLE'
      });
      setMetrics(prev => ({ ...prev, bitrate: newBitrate }));
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive, socket, user.id]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    game: GAMELIST[0],
    micId: '',
    camId: '',
    speakerId: '',
    camPosition: 'top-right' as 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left',
    streamSource: 'camera' as 'camera' | 'screen'
  });
  const [setupMode, setSetupMode] = useState(true);
  const [devices, setDevices] = useState<{ mics: DeviceInfo[], cams: DeviceInfo[], speakers: DeviceInfo[] }>({ mics: [], cams: [], speakers: [] });
  const [hardwareTested, setHardwareTested] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      setCameraActive(true);
    }
  }, [stream]);

  useEffect(() => {
    const initDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const devs = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          mics: devs.filter(d => d.kind === 'audioinput').map(d => ({ id: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 4)}` })),
          cams: devs.filter(d => d.kind === 'videoinput').map(d => ({ id: d.deviceId, label: d.label || `Cam ${d.deviceId.slice(0, 4)}` })),
          speakers: devs.filter(d => d.kind === 'audiooutput').map(d => ({ id: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 4)}` }))
        });
      } catch (err) {
        console.error("Hardware discovery failure", err);
      }
    };
    initDevices();

    const fetchLogs = async () => {
      try {
        const logs = await backendService.getAuditLogs(user.id);
        setAuditLog(logs);
      } catch (err) {
        console.error('Audit sync failure', err);
      }
    };
    fetchLogs();
  }, [user.id]);

  const fetchUserPosts = async () => {
    setLoadingPosts(true);
    try {
      const posts = await backendService.getUserPosts(user.id);
      setUserPosts(posts);
    } catch (err) {
      console.error('Failed to fetch user posts', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchUserMedia = async () => {
    setLoadingMedia(true);
    try {
      const response = await fetch(`http://localhost:5000/api/users/${user.id}/media`);
      const data = await response.json();
      setUserMedia(data);
    } catch (err) {
      console.error('Media sync failure', err);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    fetchUserPosts();
    fetchUserMedia();
  }, [user.id]);

  const addSystemLog = (msg: string) => {
    setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
  };

  const testHardware = async () => {
    setHardwareTested(true);
    addSystemLog("Hardware diagnostics initiated...");
    try {
      await startCapture(formData.streamSource, {
        video: { deviceId: formData.camId || undefined },
        audio: { deviceId: formData.micId || undefined }
      });
      addSystemLog("Hardware check: SIGNAL_OPTIMAL.");
    } catch (err) {
      addSystemLog("Hardware check: CRITICAL_FAILURE.");
      setHardwareTested(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      const startBroadcast = async () => {
        try {
          if (!stream) {
            await startCapture(formData.streamSource, {
              video: { deviceId: formData.camId ? { exact: formData.camId } : undefined },
              audio: { deviceId: formData.micId ? { exact: formData.micId } : undefined }
            });
          }

          await backendService.startStream(user.id, {
            title: formData.title,
            game: formData.game,
            description: formData.description,
            peerId: peerId
          });
          addSystemLog("Optical sensor link established. Peer signal broadcasting...");

          interval = setInterval(() => setStreamTime(prev => prev + 1), 1000);
        } catch (err) {
          addSystemLog("Optical link failure: Access denied.");
          setIsLive(false);
        }
      };
      startBroadcast();
    } else {
      const stopBroadcast = async () => {
        setCameraActive(false);
        try {
          await backendService.stopStream(user.id);
        } catch (err) {
          console.error("Failed to stop node transmission", err);
        }
      };
      stopBroadcast();
    }
    return () => clearInterval(interval);
  }, [isLive, user.id, peerId]);

  useEffect(() => {
    if (!isLive) return;
    const fetchChat = async () => {
      try {
        const data = await backendService.getStreamMessages(user.id);
        setChatMessages(data);
      } catch (err) {
        console.error("Failed to sync stream comms", err);
      }
    };
    fetchChat();
    const interval = setInterval(fetchChat, 2000);
    return () => clearInterval(interval);
  }, [isLive, user.id]);

  const handleSendStudioChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');
    try {
      await backendService.postStreamMessage(user.id, user.id, user.username, text);
      // Local update
      setChatMessages(prev => [...prev, {
        senderId: user.id,
        senderName: user.username,
        content: text,
        createdAt: new Date().toISOString()
      }]);
    } catch (err) {
      console.error("Studio chat broadcast failure", err);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    addSystemLog("AI Content Guard parsing manifest...");
    const moderation = await moderateContent(formData.title, formData.description);

    const newEntry: AuditEntry = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      timestamp: new Date().toLocaleTimeString(),
      status: moderation.allowed ? 'ACCEPTED' : 'REJECTED',
      reason: moderation.reason
    };

    if (!moderation.allowed) {
      await backendService.pushAuditLog(user.id, newEntry);
      setAuditLog(prev => [newEntry, ...prev]);
      setError(`PROTOCOL_VIOLATION: ${moderation.reason}`);
      setUploading(false);
      return;
    }

    addSystemLog("Pushing asset to cloud storage buckets...");
    const assetUrl = await backendService.uploadAsset(selectedFile, (p) => setUploadProgress(p));

    // Create real Media document
    addSystemLog("Registering content in media mesh...");
    try {
      await fetch('http://localhost:5000/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'VOD',
          title: formData.title,
          url: assetUrl,
          thumbnail: assetUrl, // Using asset URL as thumbnail for now
          game: formData.game
        })
      });
    } catch (err) {
      console.error('Failed to create media node', err);
    }

    await backendService.pushAuditLog(user.id, newEntry);
    setAuditLog(prev => [newEntry, ...prev]);

    setSuccess('DATA_MANIFEST_ACCEPTED: Asset shared with global mesh.');
    setFormData({ ...formData, title: '', description: '' });
    setSelectedFile(null);
    setUploading(false);
    fetchUserPosts();
  };

  const captureClip = async () => {
    addSystemLog("Clipping protocol initiated...");
    setUploading(true);
    try {
      const response = await fetch('http://localhost:5000/api/media/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: `Highlight: ${formData.title}`,
          game: formData.game,
          duration: 30
        })
      });
      const data = await response.json();
      setSuccess("TACTICAL_HIGHLIGHT_STRIKE_SUCCESSFUL.");
      fetchUserMedia();
      addSystemLog("Clip extraction: SUCCESS.");
    } catch (err) {
      setError("Clipping failure. Signal interference.");
      addSystemLog("Clip extraction: FAILED.");
    } finally {
      setUploading(false);
    }
  };

  if (setupMode && !isLive) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="text-primary font-mono text-[10px] tracking-[0.5em] uppercase">Phase_01: Broadcast_Config</div>
          <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter">Pre-Stream_Setup</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Metadata Shell */}
          <div className="glass p-8 rounded-[40px] border border-white/5 space-y-6">
            <h3 className="text-xs font-orbitron font-bold text-primary uppercase flex items-center gap-2">
              {getIcon('Terminal', 16)} Metadata_Ingestion
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-1 block">Stream_Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="E.g. [TACTICAL] High-Stakes Infiltration"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-1 block">Choose_Domain (Game)</label>
                <select
                  value={formData.game}
                  onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary transition-all appearance-none"
                >
                  {GAMELIST.map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-1 block">Tactical_Briefing (Description)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail your mission objectives..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white outline-none focus:border-primary transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Hardware Shell */}
          <div className="glass p-8 rounded-[40px] border border-white/5 space-y-6">
            <h3 className="text-xs font-orbitron font-bold text-primary uppercase flex items-center gap-2">
              {getIcon('Cpu', 16)} Hardware_Handshake
            </h3>
            <div className="space-y-6">
              <div className="aspect-video bg-black rounded-3xl border border-white/10 overflow-hidden relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale" />
                {!hardwareTested && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-4">
                    <button
                      type="button"
                      onClick={testHardware}
                      className="px-6 py-2 bg-primary text-black font-orbitron font-black text-[10px] rounded-lg animate-pulse"
                    >
                      INITIATE_DIAGNOSTIC
                    </button>
                    <p className="text-[8px] font-mono text-slate-400 uppercase">Sensors_Offline</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-mono text-slate-500 uppercase ml-2 block">Stream_Source</label>
                  <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5 mt-1">
                    <button
                      onClick={() => setFormData({ ...formData, streamSource: 'camera' })}
                      className={`flex-1 py-2 rounded-lg font-mono text-[10px] uppercase transition-all ${formData.streamSource === 'camera' ? 'bg-primary text-black font-bold' : 'text-slate-500 hover:text-white'}`}
                    >
                      Camera
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, streamSource: 'screen' })}
                      className={`flex-1 py-2 rounded-lg font-mono text-[10px] uppercase transition-all ${formData.streamSource === 'screen' ? 'bg-primary text-black font-bold' : 'text-slate-500 hover:text-white'}`}
                    >
                      Screen_Share
                    </button>
                  </div>
                </div>

                {formData.streamSource === 'camera' && (
                  <div>
                    <label className="text-[8px] font-mono text-slate-500 uppercase ml-2 block">Visual_Input (Camera)</label>
                    <select
                      value={formData.camId}
                      onChange={(e) => setFormData({ ...formData, camId: e.target.value })}
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 font-mono text-[10px] text-white outline-none focus:border-primary appearance-none"
                    >
                      {devices.cams.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[8px] font-mono text-slate-500 uppercase ml-2 block">Audio_Input (Microphone)</label>
                  <select
                    value={formData.micId}
                    onChange={(e) => setFormData({ ...formData, micId: e.target.value })}
                    className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 font-mono text-[10px] text-white outline-none focus:border-primary appearance-none"
                  >
                    {devices.mics.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <button
            onClick={() => {
              if (!formData.title || !formData.description) return alert("CRITICAL: Metadata incomplete.");
              if (!hardwareTested) return alert("CRITICAL: Hardware diagnostics required.");
              setSetupMode(false);
            }}
            className="px-12 py-5 bg-primary text-black font-orbitron font-black rounded-3xl shadow-[0_0_30px_rgba(0,255,0,0.3)] hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em]"
          >
            Lock_Config_&_Proceed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end gap-4">
        <div>
          <div className="text-primary font-mono text-[10px] tracking-[0.4em] uppercase mb-1">Broadcaster_Command_Center</div>
          <h2 className="text-4xl font-orbitron font-black text-white uppercase">Studio_Terminal</h2>
        </div>
        <div className="flex gap-4">
          {!isLive && (
            <button
              onClick={() => setSetupMode(true)}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-orbitron text-xs font-black text-white hover:bg-white/10 transition-all uppercase"
            >
              Reconfig_Setup
            </button>
          )}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-8 py-3 rounded-xl font-orbitron text-xs font-black border transition-all ${isLive ? 'bg-red-600 border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-primary border-primary text-black shadow-[0_0_20px_rgba(0,255,0,0.3)]'}`}
          >
            {isLive ? `KILL_BROADCAST (${Math.floor(streamTime / 60)}:${(streamTime % 60).toString().padStart(2, '0')})` : 'GO_LIVE_ENCRYPTED'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 bg-black rounded-[40px] border border-white/10 overflow-hidden relative shadow-2xl">
              <div className="aspect-video relative bg-slate-900 flex items-center justify-center">
                {isLive && cameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain grayscale brightness-110" />
                    <div className="absolute top-6 left-6 flex items-center gap-3">
                      <div className="bg-red-600 px-3 py-1 rounded text-[8px] font-orbitron font-black text-white animate-pulse">LIVE</div>
                      <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded text-[8px] font-mono text-white border border-white/10">Game: {formData.game}</div>
                    </div>
                    <div className="absolute bottom-6 right-6 flex gap-3">
                      <button
                        onClick={captureClip}
                        className="px-4 py-2 bg-yellow-500 text-black font-orbitron font-black text-[10px] rounded-lg shadow-lg hover:bg-yellow-400 transition-all flex items-center gap-2"
                      >
                        {getIcon('Scissors', 14)} CAPTURE_CLIP
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4 opacity-30 animate-pulse">
                    {getIcon('Radio', 48)}
                    <p className="font-mono text-[10px] uppercase tracking-[0.5em]">Signal_Idle // Waiting_For_Uplink</p>
                  </div>
                )}
              </div>
            </div>
            <div className="w-full lg:w-80 bg-surface/50 rounded-[40px] border border-white/10 flex flex-col h-[400px] overflow-hidden">
              <div className="p-6 border-b border-white/10 bg-black/20 text-[10px] font-orbitron font-bold flex items-center justify-between">
                <span>NODE_CHAT</span>
                <span className="text-emerald-500 font-mono text-[8px] uppercase tracking-widest animate-pulse">Live_Sync</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto font-mono text-[11px] space-y-4 custom-scrollbar">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="animate-in slide-in-from-right-2">
                    <span className={`${msg.senderId === user.id ? 'text-primary' : 'text-slate-400'} font-bold mr-2 uppercase`}>
                      {msg.senderName || 'Anonymous'}:
                    </span>
                    <span className="text-slate-300">{msg.content}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendStudioChat} className="p-4 border-t border-white/5 bg-black/20">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send_Signal..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 font-mono text-[10px] text-white outline-none focus:border-primary"
                />
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface/50 border border-white/10 rounded-[40px] p-8">
              <h3 className="text-xs font-orbitron font-bold text-white mb-6 uppercase flex items-center gap-2">
                {getIcon('Terminal', 16)} System_Deployment_Logs
              </h3>
              <div className="space-y-3 font-mono text-[10px]">
                {systemLogs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-primary shrink-0">{">>"}</span>
                    <span className="text-slate-400">{log}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass border border-white/10 rounded-[40px] p-8">
              <h3 className="text-xs font-orbitron font-bold text-white mb-6 uppercase flex items-center gap-2">
                {getIcon('TrendingUp', 16)} Session_Metrics
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[8px] font-mono text-slate-500 uppercase">View_Count</p>
                  <p className="text-xl font-orbitron font-black text-white">1,402</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-mono text-slate-500 uppercase">Gift_Yield</p>
                  <p className="text-xl font-orbitron font-black text-primary">12.4K Ȼ</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-mono text-slate-500 uppercase">Bitrate</p>
                  <p className="text-xl font-orbitron font-black text-emerald-500">6500 KBPS</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-mono text-slate-500 uppercase">Health</p>
                  <p className="text-xl font-orbitron font-black text-primary">STABLE</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-[40px] border border-primary/20 h-full flex flex-col shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              {getIcon('Radio', 100)}
            </div>
            <div className="mb-6 relative z-10">
              <h3 className="text-xl font-orbitron font-black text-white mb-4 uppercase tracking-tighter">Node_Sync</h3>
              {uploading && (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-primary"><span>UPLOADING_ASSET</span><span>{Math.round(uploadProgress)}%</span></div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>
                </div>
              )}
            </div>

            {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-[10px] font-mono animate-in shake duration-500">{error}</div>}
            {success && <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-2xl text-primary text-[10px] font-mono animate-in zoom-in-95">{success}</div>}

            <form onSubmit={handleUpload} className="space-y-5 flex-1 relative z-10">
              <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="VIDEO_TITLE" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 font-mono text-xs text-white outline-none focus:border-primary transition-all" />
              <textarea required rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="TACTICAL_DESCRIPTION" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 font-mono text-xs text-white outline-none focus:border-primary resize-none transition-all" />
              <div onClick={() => document.getElementById('studio-file-input')?.click()} className={`p-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-white/5 ${selectedFile ? 'border-primary bg-primary/5' : 'border-primary/20'}`}>
                <input id="studio-file-input" type="file" className="hidden" accept=".mp4,.mov" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                <div className={selectedFile ? 'text-primary' : 'text-slate-700'}>{getIcon('LayoutDashboard', 32)}</div>
                <p className="text-[10px] font-mono text-white font-black uppercase text-center">{selectedFile ? selectedFile.name : 'Link_Node_File (.MP4 / .MOV)'}</p>
              </div>
              <button type="submit" disabled={uploading || !selectedFile} className="w-full py-5 bg-primary text-black font-orbitron font-black rounded-3xl disabled:opacity-50 shadow-[0_4px_20px_-5px_rgba(0,255,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                {uploading ? 'INGESTING...' : 'SUBMIT_TO_DOMAIN'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="pt-12 border-t border-white/5">
        <MediaGallery
          items={userMedia}
          loading={loadingMedia}
          title="NODE_MEDIA_LIBRARY"
          onInteract={async (id, type, amount) => {
            await fetch(`http://localhost:5000/api/media/${id}/interact`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, type, amount })
            });
            fetchUserMedia();
          }}
          currentUser={user}
        />
      </div>
    </div>
  );
};

export default Studio;