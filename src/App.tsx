import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Terminal from './components/Terminal';
import Leaderboard from './components/Leaderboard';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Profile from './components/Profile';
import Studio from './components/Studio';
import Explorer from './components/Explorer';
import Settings from './components/Settings';
import AdminDashboard from './components/AdminDashboard';
import ModerationCenter from './components/ModerationCenter';
import StreamRoom from './components/StreamRoom';
import CoinStore from './components/CoinStore';
import Clans from './components/Clans';
import ClanPage from './components/ClanPage';
import CreateClanModal from './components/CreateClanModal';
import Forums from './components/Forums';
import ForumThreadView from './components/ForumThreadView';
import Messenger from './components/Messenger';
import StreamViewer from './components/StreamViewer';
import Arena from './components/Arena';
import { User } from './types';
import { backendService } from './services/backendService';
import { usePremiumTheme } from './components/PremiumThemeProvider';
import { useSocket } from './context/SocketContext';
import { getAuthToken } from './services/api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isInitializing, setIsInitializing] = useState(true);
  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<{ broadcasterId: string, peerId: string, title: string } | null>(null);

  // Messenger State
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [viewedClanId, setViewedClanId] = useState<string | null>(null);
  const [viewedThreadId, setViewedThreadId] = useState<string | null>(null);
  const [showCreateClan, setShowCreateClan] = useState(false);
  const [messageRecipientId, setMessageRecipientId] = useState<string | null>(null);

  const { applyTheme } = usePremiumTheme();

  // Destructure connectWithToken and disconnect from context
  const { socket, connectWithToken, disconnect } = useSocket();

  useEffect(() => {
    const initBackend = async () => {
      try {
        const currentUser = await backendService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          // Auto-connect socket if user is restored
          connectWithToken(getAuthToken() || '');

          // Load messages on init if user exists
          const msgs = await backendService.getMessages(currentUser.id);
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Cloud Mesh sync failure', err);
      } finally {
        setIsInitializing(false);
      }
    };
    initBackend();
  }, [connectWithToken]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on('new_message', (msg: any) => {
      // Update global message state if it's for/from current user
      if (msg.receiverId === user.id || msg.senderId === user.id) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => {
      socket.off('new_message');
    };
  }, [socket, user]);

  useEffect(() => {
    if (user) {
      applyTheme(user);
    }
  }, [user, applyTheme]);

  const handleAuthSuccess = async (authUser: User) => {
    setUser(authUser);

    // Connect socket with the new token
    connectWithToken(getAuthToken() || '');

    if (authUser.hasCompletedOnboarding) {
      setActiveTab('home');
    }
    const msgs = await backendService.getMessages(authUser.id);
    setMessages(msgs);
  };

  const handleOnboardingComplete = (completedUser: User) => {
    setUser(completedUser);
    setActiveTab('home');
  };

  const handleLogout = async () => {
    await backendService.logout();
    disconnect(); // Disconnect socket
    setUser(null);
    setActiveTab('home');
  };

  const navigateToProfile = (targetId: string) => {
    if (!targetId) {
      console.warn('[NAV] Profile target ID is invalid');
      return;
    }
    setViewedProfileId(targetId);
    setActiveStream(null);
    setActiveTab('profile');
  };

  const watchStream = (streamData: { broadcasterId: string, peerId: string, title: string }) => {
    setActiveStream(streamData);
    setActiveTab('stream');
  };

  const handleTournamentRegister = async (tournamentId: string) => {
    if (!user) return;
    try {
      const updatedUser = await backendService.registerForTournament(user.id, tournamentId);
      setUser(updatedUser);
      alert(`Unit registered for Tournament Node: ${tournamentId}`);
    } catch (err) {
      alert("Registration Failed: " + err);
    }
  };

  const handleMessageUser = (targetId: string) => {
    setMessageRecipientId(targetId);
    setActiveTab('messages');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user) return;
    const content = inputMessage;
    setInputMessage('');

    await backendService.sendMessage({ userId: user.id, content });
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="font-mono text-primary text-[10px] animate-pulse tracking-[0.5em] uppercase">Connecting_To_Decentralized_Mesh...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (!user.hasCompletedOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home user={user} onNavigate={setActiveTab} onNavigateProfile={navigateToProfile} onWatchStream={watchStream} />;
      case 'explorer': return <Explorer currentUser={user} onNavigateProfile={navigateToProfile} />;
      case 'settings': return <Settings user={user} onUpdate={setUser} onLogout={handleLogout} />;
      case 'tournaments':
        return <Arena user={user} />;
      case 'clans':
        return viewedClanId ? (
          <ClanPage
            user={user}
            clanId={viewedClanId}
            onBack={() => setViewedClanId(null)}
          />
        ) : (
          <Clans
            user={user}
            onViewClan={(id) => setViewedClanId(id)}
          />
        );
      case 'forums':
        return viewedThreadId ? (
          <ForumThreadView
            user={user}
            threadId={viewedThreadId}
            onBack={() => setViewedThreadId(null)}
          />
        ) : (
          <Forums
            user={user}
            onViewThread={(id) => setViewedThreadId(id)}
          />
        );
      case 'studio': return <Studio user={user} />;
      case 'leaderboard': return <Leaderboard />;
      case 'coinstore': return <CoinStore user={user} />;
      case 'assistant': return <div className="h-[calc(100vh-12rem)] min-h-[500px]"><Terminal /></div>;
      case 'admin':
        if (user.isAdmin) return (
          <div className="space-y-12">
            <AdminDashboard user={user} />
            <div className="pt-12 border-t border-white/5">
              <ModerationCenter />
            </div>
          </div>
        );
        return <Home />;
      case 'messages':
        return (
          <Messenger
            currentUser={user}
            onNavigateProfile={navigateToProfile}
            initialRecipientId={messageRecipientId}
            onClearRecipient={() => setMessageRecipientId(null)}
          />
        );
      case 'profile':
        return <Profile
          user={user}
          viewedProfileId={viewedProfileId || user.id}
          onBackToOwn={() => setViewedProfileId(null)}
          onNavigateSettings={() => setActiveTab('settings')}
          onWatchStream={watchStream}
          onNavigateProfile={navigateToProfile}
          onMessageUser={handleMessageUser}
        />;
      case 'stream':
        return activeStream ? (
          <StreamRoom
            streamerId={activeStream.broadcasterId}
            currentUser={user}
            onBack={() => {
              setActiveStream(null);
              setActiveTab('home');
            }}
          />
        ) : <Home user={user} onNavigate={setActiveTab} onNavigateProfile={navigateToProfile} onWatchStream={watchStream} />;

      default: return <Home />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={(tab) => { setActiveTab(tab); if (tab !== 'profile') setViewedProfileId(null); }}
      onNavigateProfile={navigateToProfile}
      onWatchStream={watchStream}
      user={user}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
