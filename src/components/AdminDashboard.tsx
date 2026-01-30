
import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { backendService } from '@/services/backendService';
import { User } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users' | 'moderation' | 'monetization' | 'tournaments'>('overview');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.isAdmin && user.email !== 'sheldonramu8@gmail.com') return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersData, metricsData, reportsData] = await Promise.all([
          backendService.getAllUsers(user.id),
          backendService.getPlatformMetrics(user.id),
          backendService.getReportedContent()
        ]);
        setAllUsers(usersData);
        setMetrics(metricsData);
        setReports(reportsData);
      } catch (err) {
        console.error("Admin data sync failure", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.id, user.email]);

  if (!user.isAdmin && user.email !== 'sheldonramu8@gmail.com') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="text-red-500 animate-pulse">{getIcon('Shield', 64)}</div>
        <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter">ACCESS_DENIED</h2>
        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest text-center max-w-md">
          Your node identity lacks the required clearance for 'SOVEREIGN_ROOT' operations. This attempt has been logged.
        </p>
      </div>
    );
  }

  const handleUpdateUserStatus = async (userId: string, status: 'active' | 'banned') => {
    await backendService.updateUserStatus(user.id, userId, status);
    const updated = await backendService.getAllUsers(user.id);
    setAllUsers(updated);
  };

  const chartData = [
    { name: '00:00', users: 400, revenue: 2400 },
    { name: '04:00', users: 300, revenue: 1398 },
    { name: '08:00', users: 200, revenue: 9800 },
    { name: '12:00', users: 278, revenue: 3908 },
    { name: '16:00', users: 189, revenue: 4800 },
    { name: '20:00', users: 239, revenue: 3800 },
    { name: '23:59', users: 349, revenue: 4300 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-primary/20 pb-6">
        <div>
          <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tighter neon-text">Sovereign_Root</h2>
          <p className="text-primary font-mono text-xs uppercase tracking-[0.3em] mt-1 italic">Administrative_Mainframe_Node // Identity: {user.username}</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/10 border border-primary/30 rounded-full">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            <span className="text-[10px] font-mono text-primary uppercase">Mesh_Status: OPTIMAL</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Admin Nav Sidebar */}
        <div className="w-full lg:w-64 space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: 'BarChart3' },
            { id: 'users', label: 'User Nodes', icon: 'Users' },
            { id: 'moderation', label: 'Content Guard', icon: 'Shield' },
            { id: 'monetization', label: 'Economy', icon: 'DollarSign' },
            { id: 'tournaments', label: 'Arena Control', icon: 'Trophy' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl font-orbitron text-[10px] font-bold uppercase transition-all border ${activeSubTab === tab.id
                ? 'bg-primary border-primary text-black shadow-[0_0_15px_#00ff00]'
                : 'bg-surface border-white/5 text-slate-500 hover:border-white/20'
                }`}
            >
              {getIcon(tab.icon, 16)}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Admin Content Area */}
        <div className="flex-1 glass p-8 rounded-[40px] border border-white/5 min-h-[600px]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="font-mono text-[10px] tracking-widest uppercase text-primary">Synchronizing_Admin_Manifest...</p>
            </div>
          ) : (
            <>
              {activeSubTab === 'overview' && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total_Operators', value: metrics?.totalUsers || '0', icon: 'Users', trend: '+12%' },
                      { label: 'Platform_Revenue', value: `$${metrics?.totalRevenue || '0'}`, icon: 'DollarSign', trend: '+4.5%' },
                      { label: 'Active_Arenas', value: metrics?.activeTournaments || '0', icon: 'Trophy', trend: 'STABLE' },
                      { label: 'System_Stability', value: metrics?.meshStability || '99.9%', icon: 'Cpu', trend: 'OPTIMAL' }
                    ].map((card, i) => (
                      <div key={i} className="bg-black/40 border border-white/10 p-6 rounded-3xl hover:border-primary/40 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="text-primary">{getIcon(card.icon, 20)}</div>
                          <span className="text-[8px] font-mono text-primary/60">{card.trend}</span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">{card.label}</p>
                        <p className="text-2xl font-orbitron font-black text-white">{card.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Activity Chart */}
                  <div className="bg-black/20 p-8 rounded-[30px] border border-white/5">
                    <h3 className="text-xs font-orbitron font-bold text-primary mb-8 uppercase tracking-widest flex items-center gap-2">
                      {getIcon('TrendingUp', 16)} Mesh_Engagement_Pulse
                    </h3>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00ff00" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#00ff00" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" stroke="#334155" fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis stroke="#334155" fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #1e293b', color: '#fff' }} />
                          <Area type="monotone" dataKey="users" stroke="#00ff00" fill="url(#adminGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === 'users' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-orbitron font-bold text-white uppercase">Operator_Directory</h3>
                    <div className="relative">
                      <input type="text" placeholder="SEARCH_NODES..." className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-white focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="text-[10px] font-mono text-slate-500 uppercase border-b border-white/5">
                        <tr>
                          <th className="pb-4 px-2">Alias</th>
                          <th className="pb-4 px-2">Clearance</th>
                          <th className="pb-4 px-2">Wealth</th>
                          <th className="pb-4 px-2">Status</th>
                          <th className="pb-4 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allUsers.map(u => (
                          <tr key={u.id} className="group hover:bg-white/5 transition-colors">
                            <td className="py-4 px-2 text-sm font-bold text-white uppercase">{u.username}</td>
                            <td className="py-4 px-2 text-[10px] font-mono text-primary">{u.tier}</td>
                            <td className="py-4 px-2 text-[10px] font-mono text-amber-500">{u.codeBits}Ȼ</td>
                            <td className="py-4 px-2">
                              <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${(u as any).status === 'banned' ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                                {(u as any).status || 'active'}
                              </span>
                            </td>
                            <td className="py-4 px-2 text-right">
                              {(u as any).status === 'banned' ? (
                                <button onClick={() => handleUpdateUserStatus(u.id, 'active')} className="text-[10px] font-mono text-primary hover:underline">RESTORE</button>
                              ) : (
                                <button onClick={() => handleUpdateUserStatus(u.id, 'banned')} className="text-[10px] font-mono text-red-500 hover:underline">TERMINATE</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSubTab === 'moderation' && (
                <div className="space-y-8 animate-in slide-in-from-left-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-orbitron font-bold text-white uppercase">Content_Guard_Queue</h3>
                    <span className="text-red-500 font-mono text-[10px] uppercase animate-pulse">{reports.length} Critical_Issues_Detected</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {reports.map((report: any) => (
                      <div key={report.id} className="bg-black/40 border border-white/10 p-6 rounded-3xl flex items-center justify-between group hover:border-red-500/40 transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                            {getIcon(report.type === 'POST' ? 'LayoutDashboard' : 'PlayCircle', 24)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase">{report.reason}</p>
                            <p className="text-[10px] font-mono text-slate-500 uppercase">Reporter: {report.reporter} // Target_ID: {report.contentId}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono rounded-lg uppercase">Dismiss</button>
                          <button className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-mono rounded-lg uppercase">Purge_Node</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubTab === 'monetization' && (
                <div className="space-y-10 animate-in zoom-in-95">
                  <h3 className="text-xl font-orbitron font-black text-white uppercase">Sovereign_Wealth_Control</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="p-8 bg-black/40 border border-white/10 rounded-[30px] space-y-6">
                      <h4 className="font-orbitron font-bold text-sm text-primary uppercase">Tier_Distribution</h4>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'FREE', value: metrics?.tierDistribution?.FREE || 0 },
                                { name: 'PREMIUM', value: metrics?.tierDistribution?.PREMIUM || 0 },
                                { name: 'ELITE', value: metrics?.tierDistribution?.ELITE || 0 },
                                { name: 'LEGEND', value: metrics?.tierDistribution?.LEGEND || 0 },
                              ]}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#64748b" />
                              <Cell fill="#3b82f6" />
                              <Cell fill="#10b981" />
                              <Cell fill="#f59e0b" />
                            </Pie>
                            <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #1e293b' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[8px] font-mono uppercase">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-500 rounded-full"></div> Free: {metrics?.tierDistribution?.FREE}</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Premium: {metrics?.tierDistribution?.PREMIUM}</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Elite: {metrics?.tierDistribution?.ELITE}</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full"></div> Legend: {metrics?.tierDistribution?.LEGEND}</div>
                      </div>
                    </div>
                    <div className="p-8 bg-black/40 border border-white/10 rounded-[30px] space-y-6">
                      <h4 className="font-orbitron font-bold text-sm text-primary uppercase">CodeBits_Flow_Control</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-xs font-mono text-slate-400">EXCHANGE_RATE</span>
                          <span className="text-sm font-bold text-white">100Ȼ = $1.00</span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-xs font-mono text-slate-400">PLATFORM_REVENUE</span>
                          <span className="text-sm font-bold text-emerald-500">${metrics?.totalRevenue || 0}</span>
                        </div>
                        <button className="w-full py-4 bg-primary text-black font-orbitron font-black text-xs rounded-xl uppercase tracking-widest hover:bg-accent transition-all">
                          GENERATE_REVENUE_REPORT
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === 'tournaments' && (
                <TournamentsAdmin />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};


const TournamentsAdmin: React.FC = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedT, setSelectedT] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    const data = await backendService.getTournaments();
    setTournaments(data);
    setLoading(false);
  };

  const handleSelectTournament = async (t: any) => {
    setSelectedT(t);
    const mData = await backendService.getMatches(t._id);
    setMatches(mData);
  };

  const handleSetWinner = async (matchId: string, winnerId: string) => {
    await backendService.setMatchResult(matchId, winnerId, 'WIN');
    // Refresh matches
    const mData = await backendService.getMatches(selectedT._id);
    setMatches(mData);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-orbitron font-bold text-white uppercase">Arena_Global_Control</h3>
        <button onClick={fetchTournaments} className="p-2 hover:bg-white/5 rounded-lg text-primary">{getIcon('Activity', 16)}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Active_Tournaments</p>
          <div className="space-y-2">
            {tournaments.map(t => (
              <button
                key={t._id}
                onClick={() => handleSelectTournament(t)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedT?._id === t._id ? 'bg-primary/10 border-primary text-primary' : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase truncate pr-2">{t.name}</span>
                  <span className="text-[8px] font-mono opacity-60">{t.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass bg-black/40 p-6 rounded-[30px] border border-white/10">
          {!selectedT ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
              {getIcon('Trophy', 32)}
              <p className="font-mono text-[10px] uppercase">Select_Arena_to_Intercept_Feed</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h4 className="font-orbitron font-bold text-white text-sm uppercase">{selectedT.name} // MATCH_GRID</h4>
                <span className="text-[10px] font-mono text-primary">{selectedT.participants.length}/{selectedT.maxParticipants} NODES</span>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {matches.length === 0 ? (
                  <p className="text-center py-10 font-mono text-[10px] text-slate-500 uppercase">Registry_Empty // No_Matches_Generated</p>
                ) : (
                  matches.map(m => (
                    <div key={m._id} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-4">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>MATCH_ID: {m._id.slice(-8).toUpperCase()}</span>
                        <span>ROUND_{m.round}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => !m.winnerId && handleSetWinner(m._id, m.player1Id._id)}
                          disabled={!!m.winnerId}
                          className={`p-3 rounded-xl border flex flex-col items-center transition-all ${m.winnerId === m.player1Id._id ? 'border-primary bg-primary/20' : 'border-white/5 bg-black/20 hover:border-primary/40'}`}
                        >
                          <span className="text-[10px] font-bold text-white truncate w-full text-center">{m.player1Id?.username || 'VOID'}</span>
                          {m.winnerId === m.player1Id._id && <span className="text-[8px] text-primary font-black mt-1">WINNER</span>}
                        </button>
                        <button
                          onClick={() => !m.winnerId && handleSetWinner(m._id, m.player2Id._id)}
                          disabled={!!m.winnerId}
                          className={`p-3 rounded-xl border flex flex-col items-center transition-all ${m.winnerId === m.player2Id._id ? 'border-primary bg-primary/20' : 'border-white/5 bg-black/20 hover:border-primary/40'}`}
                        >
                          <span className="text-[10px] font-bold text-white truncate w-full text-center">{m.player2Id?.username || 'VOID'}</span>
                          {m.winnerId === m.player2Id._id && <span className="text-[8px] text-primary font-black mt-1">WINNER</span>}
                        </button>
                      </div>

                      {m.status === 'COMPLETED' && (
                        <div className="text-center">
                          <span className="text-[8px] font-mono text-emerald-500 uppercase">Result_Confirmed // Node_Advanced</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
