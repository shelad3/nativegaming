
import React from 'react';
import { SUBSCRIPTION_PLANS, getIcon } from '../constants';
import { User, SubscriptionTier } from '../types';
import { backendService } from '../services/backendService';

interface SubscriptionsProps {
  user: User;
  onUpdate: (user: User) => void;
}

const Subscriptions: React.FC<SubscriptionsProps> = ({ user, onUpdate }) => {
  const [tiers, setTiers] = React.useState<any[]>([]);
  const [loadingTiers, setLoadingTiers] = React.useState(true);
  const [loading, setLoading] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/subscriptions/tiers');
      const data = await response.json();
      setTiers(data);
    } catch (err) {
      console.error('[SUBS] Tier sync error:', err);
    } finally {
      setLoadingTiers(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    setLoading(tier);
    // ... logic remains similar but could be move to backend later if full Stripe integration is needed
    // For now, keeping the simulation but allowing tier data to come from DB
    try {
      const updates: any = { tier };
      const updatedUser = await backendService.updateUserProfile(user.id, updates);
      onUpdate(updatedUser);
      alert(`Access level elevated to ${tier}. Sync complete.`);
    } catch (err) {
      alert('Upgrade synchronization failure');
    } finally {
      setLoading(null);
    }
  };
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Access Control Tiers</h2>
          <p className="text-slate-500 font-mono text-sm max-w-2xl">Defining entitlement structures and feature gating via MongoDB nested attributes arrays.</p>
        </div>
        <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-mono text-xs transition-colors">PUSH_UPDATES_TO_CLOUD</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {loadingTiers ? (
          <div className="col-span-full py-12 flex justify-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : tiers.map((plan) => (
          <div key={plan._id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-all flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-tighter">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-emerald-500">${plan.price}</span>
                <span className="text-slate-500 font-mono text-xs">/month</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="text-emerald-500">{getIcon('Zap', 14)}</div>
                  {feature}
                </div>
              ))}
            </div>

            <button
              onClick={() => handleUpgrade(plan.name)}
              disabled={user.tier === plan.name || loading !== null}
              className={`w-full py-3 font-mono text-xs rounded-xl transition-all uppercase tracking-widest border ${user.tier === plan.name
                ? 'bg-slate-900 border-slate-700 text-slate-500 cursor-default'
                : 'bg-slate-800 hover:bg-emerald-600 text-white border-slate-700'
                }`}
            >
              {loading === plan.name ? 'SYNCING...' : user.tier === plan.name ? 'ACTIVE_TIER' : 'UPGRADE_NODE'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          {getIcon('Database', 120)}
        </div>
        <div className="relative z-10 max-w-xl">
          <h3 className="text-xl font-bold text-white mb-4">A/B Testing Engine</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            NativeCodeX leverages MongoDB flexible schema to experiment with pricing models. Current active experiment: <span className="text-emerald-500 font-mono">EXP_SUBS_Q4_2025</span>. Testing 15% discount for annual commitments vs. monthly tier benefits.
          </p>
          <div className="flex gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex-1">
              <p className="text-[10px] text-emerald-500 font-mono uppercase mb-1">Variant A (Control)</p>
              <p className="text-xl font-bold">12.2% Conv</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex-1">
              <p className="text-[10px] text-blue-500 font-mono uppercase mb-1">Variant B (Active)</p>
              <p className="text-xl font-bold">14.8% Conv</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
