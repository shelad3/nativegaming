
import React from 'react';
import {
  TrendingUp, Users, DollarSign, Zap, Cpu, Shield, Terminal, Database,
  LayoutDashboard, ShoppingCart, Crown, Settings, Gamepad2, PlayCircle,
  Trophy, MessageSquare, Flame, BarChart3, Radio, Bell, AlertCircle, ShieldCheck, User,
  Megaphone, LifeBuoy, Search, Plus, X, AlertTriangle, Send, ChevronLeft, UserX, Lock, Activity,
  BarChart, List, Bookmark, HelpCircle, ArrowLeft, Monitor, Scissors, Heart, Share2, WifiOff, Play, Eye, ArrowRight
} from 'lucide-react';
import { SubscriptionTier, MetricCardData, MarketplaceItem } from './types';

export const PRIMARY_METRICS: MetricCardData[] = [
  { label: 'MRR', value: '$1.24M', trend: 12.5, icon: 'DollarSign' },
  { label: 'ARPU', value: '$8.42', trend: 4.2, icon: 'TrendingUp' },
  { label: 'DAU/MAU', value: '42%', trend: -1.5, icon: 'Users' },
  { label: 'Conversion', value: '8.7%', trend: 2.1, icon: 'Zap' },
];



export const MOCK_TOURNAMENTS = [
  { id: 't1', name: 'Zero-Day Invitational', prize: '$50,000', players: '128/128', status: 'Live', game: 'CyberStrike 2' },
  { id: 't2', name: 'Kernel Cup Season 4', prize: '$25,000', players: '64/128', status: 'Registration Open', game: 'Kernel Runner' },
  { id: 't3', name: 'Mainframe Showdown', prize: '$10,000', players: '32/64', status: 'Starts in 2h', game: 'Tactical Breach' },
];

export const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Vortex_X', rating: 15872, winRate: '68%', country: 'USA' },
  { rank: 2, name: 'Queen_Code', rating: 14921, winRate: '64%', country: 'SGP' },
  { rank: 3, name: 'Neo_Bane', rating: 14568, winRate: '62%', country: 'DEU' },
  { rank: 4, name: 'Null_Pointer', rating: 13742, winRate: '59%', country: 'JPN' },
  { rank: 5, name: 'Root_Access', rating: 13105, winRate: '61%', country: 'BRA' },
];

export const SUBSCRIPTION_PLANS = [
  { tier: SubscriptionTier.FREE, price: 0, features: ['Standard Quality', 'Basic Matchmaking', 'Ad-Supported'], color: 'slate' },
  { tier: SubscriptionTier.PREMIUM, price: 9.99, features: ['No Ads', '1080p/60fps', 'Priority Queue', '1000 CodeBits/mo'], color: 'blue' },
  { tier: SubscriptionTier.ELITE, price: 29.99, features: ['4K Streaming', 'Advanced Analytics', 'Early Access', '5000 CodeBits/mo'], color: 'emerald' },
  { tier: SubscriptionTier.LEGEND, price: 99.99, features: ['Custom Profile Colors', 'Verified Badge', 'Profile Animations', 'Unlimited Storage', 'Direct Admin Access'], color: 'amber' }
];



export const GAMELIST = [
  "CyberStrike 2: Resurgence", "Neon-Tokyo Drift", "Void Runner", "Silicon Shadows", "Mecha Wars: Online",
  "Glitch Protocol", "Data Breach: Sigma", "Neon Knights", "Titan Fall: Retribution", "Kernel Runner",
  "Tactical Breach: Zero", "Shadow Mesh", "Binary Assault", "Packet Sniffer: The Game", "Proxy War",
  "Encryption Key", "Mainframe Defense", "Codex Renegades", "Neural Link", "Cyberia 2077",
  "Bit-Shift Arena", "Quantum Breakout", "Logic Bomb", "Root Access: Unleashed", "System Admin Simulator",
  "Debug Mode", "Infinite Loop", "Memory Leak: Escape", "Stack Overflow", "Compiler Combat",
  "Assembly Line", "Hex Runner", "Byte Force", "Zero-Day Alpha", "Bug Bounty Hunter",
  "API Overload", "JSON Joust", "RESTful Raiders", "Soap Opera: The API", "GraphQL Quest",
  "Docker Destroyer", "K8s Commander", "Cloud Native", "Serverless Siege", "Monolith Meltdown",
  "Microservice Mayhem", "Legacy Code: Horror", "Refactor Rush", "Git Conflict: War", "Merge Master"
];

export const getIcon = (name: string, size = 20, className = '') => {
  const icons: Record<string, any> = {
    TrendingUp, Users, DollarSign, Zap, Cpu, Shield, Terminal, Database,
    LayoutDashboard, ShoppingCart, Crown, Settings, Gamepad2, PlayCircle,
    Trophy, MessageSquare, Flame, BarChart3, Radio, Bell, AlertCircle, ShieldCheck, User,
    Megaphone, LifeBuoy, Search, Plus, X, AlertTriangle, Send, ChevronLeft, UserX, Lock, Activity,
    BarChart, List, Bookmark, HelpCircle, ArrowLeft, Monitor, Scissors, Heart, Share2, WifiOff, Play, Eye, ArrowRight
  };
  const IconComponent = icons[name] || Zap;
  return <IconComponent size={size} className={className} />;
};
