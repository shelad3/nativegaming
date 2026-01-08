
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getIcon } from '../constants';
import { User } from '../types';
import { backendService } from '../services/backendService';
import { useSocket } from '../context/SocketContext';
import ExplorerDropdown from './ExplorerDropdown';
import ParticleBackground from './ParticleBackground';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNavigateProfile: (userId: string) => void;
  onWatchStream: (id: string) => void;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onNavigateProfile, onWatchStream, user, onLogout }) => {
  const { socket } = useSocket();
  const [liveUsers, setLiveUsers] = useState<User[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Initial sync
    const fetchData = async () => {
      const [live, notify, msgs] = await Promise.all([
        backendService.getLiveUsers(),
        backendService.getNotifications(user.id),
        backendService.getMessages(user.id)
      ]);
      setLiveUsers(live);
      setNotifications(notify);
      setMessages(msgs);
    };
    fetchData();

    if (!socket) return;

    // Join private frequency
    socket.emit('join_user', user.id);

    // Listen for real-time bursts
    socket.on('new_notification', (notif: any) => {
      setNotifications(prev => [notif, ...prev].slice(0, 10)); // Keep top 10
      setUnreadNotifications(true);
    });

    socket.on('new_message', (msg: any) => {
      setMessages(prev => [msg, ...prev].slice(0, 20));
      setUnreadMessages(true);
    });

    socket.on('live_users_update', (live: User[]) => {
      setLiveUsers(live);
    });

    return () => {
      socket.off('new_notification');
      socket.off('new_message');
      socket.off('live_users_update');
    };
  }, [user, socket]);

  const navItems = [
    { id: 'home', label: 'Nexus', icon: 'Gamepad2' },
    { id: 'clans', label: 'Clans', icon: 'Users' },
    { id: 'forums', label: 'Forums', icon: 'MessageSquare' },
    { id: 'tournaments', label: 'Arena', icon: 'Trophy' },
    { id: 'studio', label: 'Studio', icon: 'Cpu' },
    { id: 'coinstore', label: 'Coins', icon: 'DollarSign' },
  ];

  const secondaryNavItems = [
    { id: 'leaderboard', label: 'Fame', icon: 'BarChart3' },
    { id: 'assistant', label: 'AI Shell', icon: 'Terminal' },
  ];

  return (
    <div className="flex h-screen bg-secondary overflow-hidden text-slate-200">
      <ParticleBackground />
      {/* Sidebar Rail: Live Content */}
      <aside className="w-16 hover:w-64 group border-r border-primary/10 bg-surface/50 transition-all duration-300 z-50 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-6 border-b border-white/5 w-full flex justify-center"
        >
          <div className="w-10 h-10 bg-primary/20 text-primary border border-primary/50 rounded flex items-center justify-center font-logo text-xl cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all" onClick={() => setActiveTab('home')}>N</div>
        </motion.div>

        <div className="flex-1 w-full overflow-hidden">
          <p className="text-[10px] text-center mt-4 text-primary font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Live_Nodes</p>
          <div className="mt-4 px-3 space-y-4">
            {liveUsers.map((liveUser, i) => (
              <motion.div
                key={liveUser.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 cursor-pointer group/item"
                onClick={() => onWatchStream(liveUser.id)}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full border-2 border-primary/50 overflow-hidden group-hover/item:border-primary transition-colors">
                    <img src={liveUser.avatar} alt={liveUser.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-secondary animate-pulse"></div>
                </div>
                <div className="hidden group-hover:block overflow-hidden whitespace-nowrap">
                  <p className="text-sm font-bold truncate text-white">{liveUser.username}</p>
                  <p className="text-[10px] text-slate-500 truncate">{liveUser.streamTitle || 'Tactical Broadcaster'}</p>
                </div>
              </motion.div>
            ))}
            {liveUsers.length === 0 && (
              <p className="text-[8px] font-mono text-slate-600 text-center uppercase group-hover:block hidden">Silence_In_Mesh</p>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-col gap-2"
        >
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-3 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
            title="Account Configuration"
          >
            {getIcon('Settings', 20)}
          </button>
          {(user.isAdmin || user.email === 'sheldonramu8@gmail.com') && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`p-3 transition-colors ${activeTab === 'admin' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
              title="Admin Access"
            >
              {getIcon('Shield', 20)}
            </button>
          )}
          <button
            onClick={onLogout}
            className="p-3 text-slate-500 hover:text-red-500 transition-colors"
            title="Terminate Session"
          >
            {getIcon('LogOut', 20)}
          </button>
        </motion.div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        {/* Top Navbar */}
        {/* Top Navbar */}
        <header className="h-24 sticky top-0 z-40 flex items-center px-8 pointer-events-none w-full">
          {/* Left: Logo Area */}
          <div className="flex-1 flex items-center justify-start gap-4 pointer-events-auto min-w-0">
            <h1 className="font-logo text-3xl text-primary drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] tracking-tighter shrink-0">Native</h1>
            <div className="hidden xl:block w-px h-8 bg-white/10 mx-2 shrink-0"></div>
            <div className="hidden xl:flex flex-col shrink-0">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">System_Status</span>
              <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest leading-none mt-1">Online • Stable</span>
            </div>
          </div>

          {/* Center: Navigation Island */}
          <div className="flex-none pointer-events-auto z-50 mx-4">
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-full glass border border-white/10 bg-black/60 shadow-2xl backdrop-blur-2xl">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-5 py-2.5 rounded-full text-xs font-orbitron font-bold transition-all flex items-center gap-2 overflow-hidden group ${activeTab === item.id
                    ? 'text-black bg-primary shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {getIcon(item.icon, 14)}
                  <span className="relative z-10">{item.label}</span>
                  {activeTab === item.id && (
                    <motion.span
                      layoutId="navIndicator"
                      className="absolute inset-0 bg-primary/20 border border-primary/50 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {activeTab !== item.id && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: User Actions (Profile Only) */}
          <div className="flex-1 flex items-center justify-end gap-6 pointer-events-auto min-w-0">
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Balance</span>
                <span className="text-sm font-mono text-amber-500 font-bold border-b border-amber-500/20">{user?.codeBits?.toLocaleString() || '0'} Ȼ</span>
              </div>

              {user ? (
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`relative flex items-center justify-center p-0.5 rounded-full transition-transform hover:scale-105 active:scale-95 ${activeTab === 'profile' ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : ''}`}
                >
                  <div className="w-11 h-11 rounded-full relative z-10 overflow-hidden border-2 border-white/10 hover:border-primary/50 transition-colors">
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-primary/20 blur-md rounded-full"></div>
                </button>
              ) : (
                <button className="bg-white text-black px-6 py-2.5 rounded-full font-orbitron text-xs font-black hover:bg-primary transition-colors shadow-lg shadow-white/10 hover:shadow-primary/20">
                  CONNECT
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Right-Side Floating Action Dock */}
        <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50 pointer-events-auto">
          <button
            onClick={() => setActiveTab('studio')}
            className="w-14 h-14 bg-primary text-black rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-110 active:scale-95 transition-all group"
            title="Initiate New Signal"
          >
            {getIcon('Plus', 28)}
          </button>
          <div className="flex flex-col gap-2 p-2 rounded-2xl glass border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <button
              onClick={() => { setShowExplorer(!showExplorer); setShowMessages(false); setShowNotifications(false); }}
              className={`p-3 rounded-xl transition-all relative group ${showExplorer ? 'bg-primary text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
              title="Node Explorer"
            >
              {getIcon('Search', 20)}
            </button>
            <button
              onClick={() => { setShowMessages(!showMessages); setShowNotifications(false); setShowExplorer(false); setUnreadMessages(false); }}
              className={`p-3 rounded-xl transition-all relative group ${showMessages ? 'bg-primary text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
              title="Encrypted Messenger"
            >
              {getIcon('MessageSquare', 20)}
              {unreadMessages && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]"></span>}
            </button>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowMessages(false); setUnreadNotifications(false); }}
              className={`p-3 rounded-xl transition-all relative group ${showNotifications ? 'bg-primary text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
              title="System Alerts"
            >
              {getIcon('Bell', 20)}
              {unreadNotifications && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>}
            </button>
          </div>
        </div>

        {/* Floating Windows (Anchored to Dock) */}
        {showExplorer && (
          <ExplorerDropdown
            currentUser={user}
            onNavigateProfile={onNavigateProfile}
            onClose={() => setShowExplorer(false)}
          />
        )}
        {showNotifications && (
          <div className="fixed right-24 top-1/2 -translate-y-1/2 w-80 glass border border-white/10 rounded-[2rem] p-5 shadow-2xl animate-in fade-in slide-in-from-right-8 duration-300 max-h-[60vh] overflow-y-auto z-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-orbitron font-black text-white uppercase tracking-widest">Notification_Grid</h3>
              <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white transition-colors">{getIcon('X', 14)}</button>
            </div>
            <div className="space-y-3">
              {notifications.map((n, i) => (
                <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                    {n.type === 'FOLLOW' ? getIcon('Users', 14) : n.type === 'GIFT' ? getIcon('Zap', 14) : getIcon('AlertCircle', 14)}
                  </div>
                  <div>
                    <p className="text-[10px] text-white font-bold uppercase">{n.type}_PROTOCOL</p>
                    <p className="text-[9px] text-slate-400 font-mono leading-tight">{n.content}</p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-[8px] font-mono text-slate-500 text-center py-6">NO_ACTIVITY_DETECTED</p>}
            </div>
            <button className="w-full mt-4 py-3 text-[9px] font-mono text-slate-500 hover:text-primary transition-colors uppercase border-t border-white/5 tracking-wider">Mark_All_Read</button>
          </div>
        )}

        {showMessages && (
          <div className="fixed right-24 top-1/2 -translate-y-1/2 w-80 glass border border-white/10 rounded-[2rem] p-5 shadow-2xl animate-in fade-in slide-in-from-right-8 duration-300 max-h-[60vh] overflow-y-auto z-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-orbitron font-black text-white uppercase tracking-widest">Mesh_Transmissions</h3>
              <button onClick={() => setShowMessages(false)} className="text-slate-500 hover:text-white transition-colors">{getIcon('X', 14)}</button>
            </div>
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-black transition-colors">
                    {m.isStaff ? getIcon('Shield', 14) : getIcon('User', 14)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] text-white font-bold uppercase">{m.isStaff ? 'STAFF_CORE' : 'PEER_NODE'}</p>
                      <span className="text-[8px] text-primary font-mono opacity-70">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono truncate">{m.content}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-[8px] font-mono text-slate-500 text-center py-6">NO_INCOMING_SIGNALS</p>}
            </div>
            <button
              onClick={() => { setActiveTab('messages'); setShowMessages(false); }}
              className="w-full mt-4 py-3 text-[9px] font-mono text-slate-500 hover:text-primary transition-colors uppercase border-t border-white/5 tracking-wider"
            >
              Open_Messenger_Shell
            </button>
          </div>
        )}

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          {activeTab === 'home' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,0,0.05)_0%,transparent_50%)] pointer-events-none"></div>}
          <div className="p-8 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98, Filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, Filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.02, Filter: 'blur(10px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
