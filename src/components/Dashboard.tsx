
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PRIMARY_METRICS, getIcon } from '../constants';

const data = [
  { name: 'Mon', rev: 4000, subs: 2400 },
  { name: 'Tue', rev: 3000, subs: 1398 },
  { name: 'Wed', rev: 2000, subs: 9800 },
  { name: 'Thu', rev: 2780, subs: 3908 },
  { name: 'Fri', rev: 1890, subs: 4800 },
  { name: 'Sat', rev: 2390, subs: 3800 },
  { name: 'Sun', rev: 3490, subs: 4300 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Platform Pulse</h2>
          <p className="text-slate-500 max-w-2xl font-mono text-sm">Aggregating real-time monetization data from MongoDB Atlas clusters globally.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono text-xs transition-colors">GENERATE_REPORT</button>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono text-xs transition-colors">FETCH_LIVE</button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRIMARY_METRICS.map((metric) => (
          <div key={metric.label} className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-emerald-500/30 transition-all hacker-glow group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-800 rounded-lg group-hover:text-emerald-400 transition-colors">
                {getIcon(metric.icon, 20)}
              </div>
              <span className={`text-xs font-mono ${metric.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {metric.trend >= 0 ? '+' : ''}{metric.trend}%
              </span>
            </div>
            <h3 className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">{metric.label}</h3>
            <p className="text-2xl font-bold text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-mono text-emerald-500 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            REVENUE_FLOW_REALTIME (USD)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="rev" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-mono text-blue-500 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            SUB_TIER_PENETRATION
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Bar dataKey="subs" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Battle Pass Section */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-emerald-500/20">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {getIcon('Shield', 20)} HACK_THE_SEASON_PASS (S2: ZERO_NODE)
          </h3>
          <span className="text-xs font-mono text-emerald-500">42 DAYS REMAINING</span>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between text-xs font-mono mb-2">
            <span className="text-slate-400">AVERAGE_PROGRESS</span>
            <span className="text-emerald-400">LVL 48 / 100</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div className="h-full bg-emerald-500 w-[48%] hacker-glow shadow-[0_0_10px_#10b981]"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
             <div className="bg-slate-950 p-3 rounded border border-slate-800">
               <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Pass Revenue</p>
               <p className="text-lg font-bold">$342,010</p>
             </div>
             <div className="bg-slate-950 p-3 rounded border border-slate-800">
               <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Completion Rate</p>
               <p className="text-lg font-bold">12.4%</p>
             </div>
             <div className="bg-slate-950 p-3 rounded border border-slate-800">
               <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">XP Distributed</p>
               <p className="text-lg font-bold">8.2B</p>
             </div>
             <div className="bg-slate-950 p-3 rounded border border-slate-800">
               <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Active Trackers</p>
               <p className="text-lg font-bold">1.2M</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
