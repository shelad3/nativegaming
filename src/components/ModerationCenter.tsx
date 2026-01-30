import React, { useState, useEffect } from 'react';
import { getIcon } from '../constants';
import { backendService } from '../services/backendService';

interface Report {
    _id: string;
    reporterId: {
        _id: string;
        username: string;
        email: string;
    };
    targetType: 'USER' | 'POST' | 'MEDIA' | 'THREAD' | 'COMMENT';
    targetId: string;
    reason: string;
    description: string;
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
    adminNotes?: string;
    createdAt: string;
}

const ModerationCenter: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [resolveData, setResolveData] = useState({
        adminNotes: '',
        banReason: ''
    });
    const [processing, setProcessing] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Updated to use secure backendService
            const data = await backendService.getReports();
            setReports(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Audit sync failure', err);
            setReports([]); // Safe fallback to prevent crashes
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleResolve = async (action: 'BAN' | 'DISMISS') => {
        if (!selectedReport || processing) return;
        setProcessing(true);
        try {
            await backendService.resolveReport(
                selectedReport._id,
                action,
                resolveData.adminNotes,
                action === 'BAN' ? (resolveData.banReason || selectedReport.reason) : undefined
            );

            fetchReports();
            setSelectedReport(null);
            setResolveData({ adminNotes: '', banReason: '' });
        } catch (err) {
            console.error('Action execution failure', err);
        } finally {
            setProcessing(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
            case 'RESOLVED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
            case 'DISMISSED': return 'bg-slate-500/10 text-slate-500 border-slate-500/30';
            default: return 'bg-slate-500/10 text-slate-500 border-white/10';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <div className="text-primary font-mono text-[10px] tracking-[0.4em] uppercase mb-1">High_Command_Audit_Terminal</div>
                    <h2 className="text-4xl font-orbitron font-black text-white uppercase italic">Moderation_Nexus</h2>
                </div>
                <button
                    onClick={fetchReports}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-slate-400 hover:text-white"
                    title="Refresh Signals"
                >
                    {getIcon('RotateCcw', 20)}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Signals Feed */}
                <div className="lg:col-span-2 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-4">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-24 glass rounded-3xl animate-pulse"></div>)
                    ) : reports.length === 0 ? (
                        <div className="py-20 text-center glass rounded-3xl border-dashed border-white/5">
                            <p className="font-mono text-slate-600 uppercase tracking-widest italic">NO_ACTIVE_VIOLATIONS_DETECTED</p>
                        </div>
                    ) : (
                        reports.map(report => (
                            <div
                                key={report._id}
                                onClick={() => setSelectedReport(report)}
                                className={`p-6 glass rounded-3xl border transition-all cursor-pointer group ${selectedReport?._id === report._id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-white/5 hover:border-white/20 hover:bg-white/5'}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest border ${getStatusStyle(report.status)}`}>
                                            {report.status}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">SIGNAL_ID: {report._id.slice(-8)}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-600">
                                        {new Date(report.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-orbitron font-black text-white group-hover:text-primary transition-colors mb-1">{report.reason}</h3>
                                        <p className="text-xs font-mono text-slate-400 italic">Target: [{report.targetType}] {report.targetId}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-mono text-slate-500 uppercase">Reporter</p>
                                        <p className="text-xs font-bold text-white">@{report.reporterId.username}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Tactical Enforcement Terminal */}
                <div className="space-y-6">
                    {selectedReport ? (
                        <div className="glass p-8 rounded-[2.5rem] border border-primary/20 space-y-8 animate-in slide-in-from-right-4 duration-500 sticky top-8">
                            <div>
                                <h3 className="text-xs font-orbitron font-bold text-primary uppercase mb-4 flex items-center gap-2">
                                    {getIcon('ShieldAlert', 16)} Signal_Briefing
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">Description_Logs</p>
                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-sm text-slate-300 font-mono leading-relaxed">
                                            "{selectedReport.description}"
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[8px] font-mono text-slate-500 uppercase mb-1">Target_Type</p>
                                            <p className="text-xs font-bold text-white">{selectedReport.targetType}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[8px] font-mono text-slate-500 uppercase mb-1">Category</p>
                                            <p className="text-xs font-bold text-white text-primary">{selectedReport.reason}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 border-t border-white/5 pt-8">
                                <h3 className="text-xs font-orbitron font-bold text-white uppercase mb-4 flex items-center gap-2">
                                    {getIcon('Terminal', 16)} Command_Input
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-2 block">Admin_Field_Notes</label>
                                        <textarea
                                            value={resolveData.adminNotes}
                                            onChange={(e) => setResolveData({ ...resolveData, adminNotes: e.target.value })}
                                            placeholder="Record your observation logic..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-white outline-none focus:border-primary resize-none"
                                            rows={2}
                                        />
                                    </div>
                                    {selectedReport.status === 'PENDING' && (
                                        <div>
                                            <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-2 block">Revocation_Reason (For BAN)</label>
                                            <input
                                                type="text"
                                                value={resolveData.banReason}
                                                onChange={(e) => setResolveData({ ...resolveData, banReason: e.target.value })}
                                                placeholder="Protocol violation details..."
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-white outline-none focus:border-primary"
                                            />
                                        </div>
                                    )}
                                </div>

                                {selectedReport.status === 'PENDING' ? (
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleResolve('BAN')}
                                            disabled={processing}
                                            className="flex-1 py-4 bg-red-600 text-white font-orbitron font-black text-[10px] rounded-xl uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                                        >
                                            Execute_Ban
                                        </button>
                                        <button
                                            onClick={() => handleResolve('DISMISS')}
                                            disabled={processing}
                                            className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-400 font-orbitron font-black text-[10px] rounded-xl uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                                        >
                                            Dismiss_Signal
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                        <p className="text-[10px] font-mono text-slate-500 uppercase">SIGNAL_RESOLVED</p>
                                        <p className="text-xs font-bold text-slate-400 mt-2 italic">"{selectedReport.adminNotes || 'No notes recorded.'}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="glass p-12 rounded-[2.5rem] border border-white/5 text-center space-y-4 opacity-50 italic">
                            <div className="mx-auto text-slate-600">
                                {getIcon('Crosshair', 48)}
                            </div>
                            <p className="font-mono text-xs text-slate-500 uppercase tracking-widest leading-relaxed">Select_Signal_To_Initialize_Audit_Protocol</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModerationCenter;
