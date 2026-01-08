
import React, { useState, useRef, useEffect } from 'react';
import { analyzeMonetization } from '../services/geminiService';
import { PRIMARY_METRICS, getIcon } from '../constants';

interface TerminalMessage {
  type: 'user' | 'bot';
  content: string;
  sources?: any[];
}

const Terminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<TerminalMessage[]>([
    { type: 'bot', content: 'SYSTEM INITIALIZED. NATIVCODEX MONETIZATION AI ONLINE.' },
    { type: 'bot', content: 'READY FOR STRATEGY OPTIMIZATION QUERIES. GOOGLE_SEARCH_GROUNDING ACTIVE.' }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setHistory(prev => [...prev, { type: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    const result = await analyzeMonetization(userMsg, PRIMARY_METRICS);
    setHistory(prev => [...prev, {
      type: 'bot',
      content: result.text || 'ERROR: NO RESPONSE DATA',
      sources: result.sources
    }]);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 border border-emerald-500/20 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
      <div className="bg-slate-900 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 ml-4">root@nativecodex:~$/ai_consultant</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-emerald-500/50">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            WEB_BRIDGE_SYNC
          </span>
          <span>GEMINI_V3_FLASH</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-sm terminal-bg"
      >
        {history.map((msg, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex gap-3">
              <span className={msg.type === 'user' ? 'text-blue-500 shrink-0' : 'text-emerald-500 shrink-0'}>
                {msg.type === 'user' ? 'ADMIN>' : 'SYS_AI>'}
              </span>
              <div className={`whitespace-pre-wrap ${msg.type === 'user' ? 'text-slate-300' : 'text-emerald-400'}`}>
                {msg.content}
              </div>
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="ml-14 mt-1 border-l border-emerald-500/10 pl-4 py-2 space-y-2">
                <p className="text-[9px] text-slate-600 uppercase tracking-widest">Grounding_Sources_Index</p>
                {msg.sources.map((chunk: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-[10px] text-emerald-600/60 hover:text-emerald-500 transition-colors">
                    {getIcon('Radio', 10)}
                    <span className="truncate max-w-xs">{chunk.web?.title || 'External Intelligence Node'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 items-center text-emerald-500/50 italic animate-pulse">
            <span>SYS_AI&gt;</span>
            <span>UPLOADING_VECTORS_TO_GOOGLE_SEARCH_NODES...</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-emerald-500/20 bg-slate-900/50">
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-emerald-500/20">
          <span className="text-emerald-500 font-mono font-bold">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="ENTER_STRATEGY_QUERY..."
            className="flex-1 bg-transparent border-none outline-none text-emerald-400 font-mono text-sm placeholder:text-emerald-900"
          />
          <button onClick={handleSend} disabled={loading} className="text-emerald-500 hover:text-emerald-400 disabled:opacity-50">
            {getIcon('Zap', 18)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
