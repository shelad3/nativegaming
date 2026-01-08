
import React from 'react';
import { MOCK_LEADERBOARD, getIcon } from '../constants';

const Leaderboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-orbitron font-bold text-white mb-2 tracking-tight">HALL_OF_FAME</h2>
          <p className="text-slate-500 font-mono text-sm">Global Operator Ratings. Updated every 300s.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => alert("Region Filter: Global (Default)")} className="px-4 py-2 bg-white/5 border border-white/10 rounded font-mono text-xs hover:bg-white/10 transition-all">FILTER_BY_REGION</button>
          <button onClick={() => alert("Season: current_v2.0")} className="px-4 py-2 bg-white/5 border border-white/10 rounded font-mono text-xs hover:bg-white/10 transition-all">SEASONAL_RANKS</button>
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 font-mono text-[10px] text-slate-400 uppercase tracking-widest border-b border-white/5">
            <tr>
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Operator</th>
              <th className="px-6 py-4">Rating</th>
              <th className="px-6 py-4">Win_Rate</th>
              <th className="px-6 py-4">Region</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {MOCK_LEADERBOARD.map((p) => (
              <tr key={p.rank} className="group hover:bg-primary/5 transition-colors">
                <td className="px-6 py-6">
                  <span className={`text-xl font-black italic ${p.rank === 1 ? 'text-primary' : 'text-slate-700'}`}>
                    {p.rank < 10 ? `0${p.rank}` : p.rank}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-800 border border-white/10 overflow-hidden">
                      <img src={`https://picsum.photos/seed/${p.name}/100/100`} alt={p.name} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tighter">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">STATUS: ONLINE</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6 text-sm font-mono text-primary font-bold">{p.rating}</td>
                <td className="px-6 py-6 text-sm text-slate-400">{p.winRate}</td>
                <td className="px-6 py-6 text-xs font-mono text-slate-500">{p.country}</td>
                <td className="px-6 py-6 text-right">
                  <button onClick={() => alert(`Initiating challenge sequence against ${p.name}...`)} className="p-2 text-slate-500 hover:text-primary transition-colors">
                    {getIcon('PlayCircle', 16)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
