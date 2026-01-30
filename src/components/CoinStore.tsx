import React, { useState } from 'react';
import { getIcon } from '../constants';
import { User } from '../types';

interface CoinStoreProps {
    user: User;
}

const CoinStore: React.FC<CoinStoreProps> = ({ user }) => {
    const [loading, setLoading] = useState<string | null>(null);

    const packages = [
        {
            id: 'starter',
            name: 'Starter Pack',
            codeBits: 500,
            price: 4.99,
            popular: false,
            bonus: null,
            icon: 'Zap',
            color: 'from-cyan-500 to-blue-500'
        },
        {
            id: 'popular',
            name: 'Popular Pack',
            codeBits: 1200,
            price: 9.99,
            popular: true,
            bonus: '20% BONUS',
            icon: 'Crown',
            color: 'from-primary to-emerald-400'
        },
        {
            id: 'elite',
            name: 'Elite Pack',
            codeBits: 5000,
            price: 39.99,
            popular: false,
            bonus: '25% BONUS',
            icon: 'Flame',
            color: 'from-amber-500 to-orange-500'
        }
    ];

    const handlePurchase = async (packageId: string) => {
        setLoading(packageId);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/create-checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, packageId })
            });

            const data = await response.json();

            if (data.url) {
                // Redirect to Pesapal Checkout
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (err) {
            console.error('[COIN_STORE] Purchase failed:', err);
            alert('Failed to initiate purchase. Please try again.');
            setLoading(null);
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-orbitron font-black text-white uppercase tracking-tight">Coin_Store</h2>
                    <p className="text-sm font-mono text-slate-500 mt-2">Acquire CodeBits to unlock premium features and marketplace items</p>
                </div>
                <div className="glass px-6 py-4 rounded-2xl border border-primary/20">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Current Balance</p>
                    <p className="text-3xl font-mono font-black text-primary mt-1">{user.codeBits?.toLocaleString() || 0} Ȼ</p>
                </div>
            </div>

            {/* Security Badge */}
            <div className="glass p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    {getIcon('Shield', 24)}
                </div>
                <div>
                    <p className="text-sm font-bold text-white">Secure Payment Processing</p>
                    <p className="text-[10px] font-mono text-slate-500">All transactions are encrypted and processed securely. Your payment information is never stored on our servers.</p>
                </div>
            </div>

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packages.map(pkg => (
                    <div
                        key={pkg.id}
                        className={`relative glass rounded-[2rem] border overflow-hidden group transition-all hover:scale-105 ${pkg.popular
                            ? 'border-primary shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                            : 'border-white/10 hover:border-primary/50'
                            }`}
                    >
                        {/* Popular Badge */}
                        {pkg.popular && (
                            <div className="absolute top-4 right-4 z-10">
                                <div className="bg-primary text-black px-3 py-1 rounded-full text-[8px] font-orbitron font-black uppercase tracking-wider shadow-lg">
                                    Most Popular
                                </div>
                            </div>
                        )}

                        {/* Gradient Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>

                        {/* Content */}
                        <div className="relative p-8 flex flex-col items-center text-center">
                            {/* Icon */}
                            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${pkg.color} p-0.5 mb-6`}>
                                <div className="w-full h-full bg-surface rounded-2xl flex items-center justify-center text-white">
                                    {getIcon(pkg.icon, 36)}
                                </div>
                            </div>

                            {/* Package Name */}
                            <h3 className="text-xl font-orbitron font-black text-white uppercase mb-2">{pkg.name}</h3>

                            {/* CodeBits Amount */}
                            <div className="mb-4">
                                <p className="text-4xl font-mono font-black text-primary">{pkg.codeBits.toLocaleString()}</p>
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">CodeBits</p>
                            </div>

                            {/* Bonus Badge */}
                            {pkg.bonus && (
                                <div className="mb-4">
                                    <span className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[10px] font-orbitron font-bold uppercase border border-amber-500/30">
                                        {pkg.bonus}
                                    </span>
                                </div>
                            )}

                            {/* Price */}
                            <div className="mb-6">
                                <p className="text-3xl font-orbitron font-black text-white">${pkg.price}</p>
                                <p className="text-[10px] font-mono text-slate-500 uppercase">USD</p>
                            </div>

                            {/* Purchase Button */}
                            <button
                                onClick={() => handlePurchase(pkg.id)}
                                disabled={loading !== null}
                                className={`w-full py-4 rounded-xl font-orbitron font-black text-sm uppercase transition-all ${loading === pkg.id
                                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                                    : pkg.popular
                                        ? 'bg-primary text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                                    }`}
                            >
                                {loading === pkg.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                        Processing...
                                    </span>
                                ) : (
                                    'Purchase Now'
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass p-6 rounded-2xl border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                        {getIcon('Lock', 20)}
                    </div>
                    <h4 className="text-sm font-orbitron font-bold text-white mb-2 uppercase">Secure Checkout</h4>
                    <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                        Industry-standard encryption protects your payment data
                    </p>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                        {getIcon('Zap', 20)}
                    </div>
                    <h4 className="text-sm font-orbitron font-bold text-white mb-2 uppercase">Instant Delivery</h4>
                    <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                        CodeBits are credited to your account immediately after payment
                    </p>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                        {getIcon('RefreshCw', 20)}
                    </div>
                    <h4 className="text-sm font-orbitron font-bold text-white mb-2 uppercase">Refund Policy</h4>
                    <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                        Contact support within 48 hours for eligible refund requests
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CoinStore;
