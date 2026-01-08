import React, { useState } from 'react';
import { getIcon } from '../constants';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: 'USER' | 'POST' | 'MEDIA' | 'THREAD' | 'COMMENT';
    targetId: string;
    targetName: string;
    reporterId: string;
}

const REASONS = [
    'TOXIC_BEHAVIOR',
    'CHEAT_PROTOCOL_VIOLATION',
    'INAPPROPRIATE_CONTENT',
    'SPAM_SIGNAL',
    'DETERMINISTIC_GRIEFING',
    'OTHER_ANOMALY'
];

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, targetType, targetId, targetName, reporterId }) => {
    const [reason, setReason] = useState(REASONS[0]);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch('http://localhost:5000/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reporterId,
                    targetType,
                    targetId,
                    reason,
                    description
                })
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    onClose();
                }, 2000);
            }
        } catch (err) {
            console.error('Report submission failure', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="max-w-md w-full glass rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-primary font-mono text-[10px] tracking-widest uppercase mb-1">Enforcement_Protocol</p>
                            <h2 className="text-2xl font-orbitron font-black text-white uppercase italic">File_Report</h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                            {getIcon('X', 20)}
                        </button>
                    </div>

                    {success ? (
                        <div className="py-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
                                {getIcon('Check', 32)}
                            </div>
                            <p className="font-mono text-sm text-emerald-400 uppercase tracking-widest">REPORT_MANIFEST_FILED</p>
                            <p className="text-xs text-slate-500">Security nodes are analyzing the signal.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">Target_Intel</p>
                                <p className="text-sm font-bold text-white uppercase">[{targetType}] {targetName}</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-2 block">Violation_Category</label>
                                    <select
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-white outline-none focus:border-primary appearance-none"
                                    >
                                        {REASONS.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-mono text-slate-500 uppercase ml-2 mb-2 block">Tactical_Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Provide specific evidence of the protocol violation..."
                                        rows={4}
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 font-mono text-xs text-white outline-none focus:border-primary resize-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-red-600 text-white font-orbitron font-black text-xs rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 hover:bg-red-500 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {submitting ? 'TRANSMITTING...' : 'INITIATE_ENFORCEMENT'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
