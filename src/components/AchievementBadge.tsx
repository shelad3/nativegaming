import React from 'react';
import { getIcon } from '../constants';

interface AchievementBadgeProps {
    type: string;
    unlockedAt?: string;
    size?: number;
    showLabel?: boolean;
}

const BADGE_DATA: Record<string, { name: string, description: string, icon: string, color: string }> = {
    'TACTICAL_SPEAKER': {
        name: 'Tactical Speaker',
        description: 'Initiated your first sector transmission (Thread Created).',
        icon: 'Mic',
        color: '#10b981'
    },
    'QUICK_RESPONDER': {
        name: 'Quick Responder',
        description: 'Delivered an immediate tactical response (First Post).',
        icon: 'Zap',
        color: '#3b82f6'
    },
    'SQUAD_MEMBER': {
        name: 'Squad Member',
        description: 'Successfully integrated with a combat clan.',
        icon: 'Users',
        color: '#f59e0b'
    },
    'MESH_CONNECTOR': {
        name: 'Mesh Connector',
        description: 'Established a secure link with another operator (First Follow).',
        icon: 'Link',
        color: '#8b5cf6'
    },
    'EARLY_ADOPTER': {
        name: 'Early Adopter',
        description: 'Member of the original NativeCodeX genesis block.',
        icon: 'Cpu',
        color: '#ec4899'
    }
};

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ type, unlockedAt, size = 12, showLabel = false }) => {
    const badge = BADGE_DATA[type] || {
        name: 'Unknown Medal',
        description: 'Unidentified system milestone.',
        icon: 'Award',
        color: '#64748b'
    };

    return (
        <div className="group relative flex flex-col items-center">
            <div
                className="rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-lg border border-white/10"
                style={{
                    width: size * 4,
                    height: size * 4,
                    backgroundColor: `${badge.color}20`,
                    color: badge.color,
                    boxShadow: `0 0 15px ${badge.color}20`
                }}
            >
                {getIcon(badge.icon, size * 2)}

                {/* Tooltip */}
                <div className="absolute bottom-full mb-3 hidden group-hover:block w-48 z-[60]">
                    <div className="glass border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                        <p className="text-xs font-orbitron font-black uppercase mb-1" style={{ color: badge.color }}>{badge.name}</p>
                        <p className="text-[10px] font-mono text-slate-300 leading-tight mb-2">{badge.description}</p>
                        {unlockedAt && (
                            <p className="text-[8px] font-mono text-slate-500 uppercase">Unlocked: {new Date(unlockedAt).toLocaleDateString()}</p>
                        )}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-black/40 border-r border-b border-white/10 rotate-45 -mt-1.5 backdrop-blur-xl"></div>
                    </div>
                </div>
            </div>

            {showLabel && (
                <span className="text-[9px] font-mono text-slate-400 mt-2 uppercase tracking-tighter text-center max-w-[80px] leading-tight">
                    {badge.name}
                </span>
            )}
        </div>
    );
};

export default AchievementBadge;
