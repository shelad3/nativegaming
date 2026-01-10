
import React, { useState } from 'react';
import { getIcon } from '../constants';
import { User, MarketplaceItem } from '../types';
import { api } from '../services/api';

interface MarketplaceProps {
  user: User;
  onUpdateBalances: (user: User) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ user, onUpdateBalances }) => {
  const [filter, setFilter] = useState('All');
  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  React.useEffect(() => {
    fetchMarketItems();
  }, []);

  const fetchMarketItems = async () => {
    try {
      const { data } = await api.get('/marketplace/items');
      setMarketItems(data.map((item: any) => ({ ...item, id: item._id })));
    } catch (err) {
      console.error('[MARKET] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: MarketplaceItem) => {
    if (user.codeBits < item.price) {
      alert("Insufficient CodeBits. Access more through tiers or interactions.");
      return;
    }
    setPurchasing(item.id);
    try {
      const { data: updatedUser } = await api.post('/marketplace/purchase', {
        userId: user.id, // Ideally, backend extracts this from token, but current impl uses body
        itemId: item.id
      });

      onUpdateBalances(updatedUser);
      alert(`Asset ${item.name} acquired. Syncing with inventory...`);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Purchase failed';
      alert(msg);
    } finally {
      setPurchasing(null);
    }
  };

  const filteredItems = filter === 'All'
    ? marketItems
    : marketItems.filter(item => item.category === filter);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary': return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
      case 'Epic': return 'text-purple-400 border-purple-500/50 bg-purple-500/10';
      case 'Rare': return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
      default: return 'text-slate-400 border-slate-700 bg-slate-800/50';
    }
  };

  if (loading) return <div className="text-white font-mono p-8">Loading Market Index...</div>;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Digital Blackmarket</h2>
          <p className="text-slate-500 font-mono text-sm uppercase tracking-tighter">Marketplace Indexing: MongoDB product_catalog_v2</p>
        </div>
        <div className="flex gap-2">
          {['All', 'Cosmetic', 'Functional'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded font-mono text-xs transition-all border ${filter === cat
                ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'
                }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all flex flex-col">
            <div className="aspect-square bg-slate-950 relative overflow-hidden group">
              <img
                src={item.imageUrl || `https://picsum.photos/seed/${item.id}/300/300`}
                alt={item.name}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute top-2 right-2 px-2 py-1 rounded border text-[10px] font-mono font-bold uppercase backdrop-blur-md shadow-lg" style={{ borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                {item.type}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
              <div className="absolute bottom-4 left-4">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${getRarityColor(item.rarity)}`}>
                  {item.rarity}
                </span>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-sm mb-1 line-clamp-1">{item.name}</h3>
                <p className="text-xs text-slate-500 font-mono mb-4">{item.description || item.category}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-amber-500">{getIcon('DollarSign', 14)}</span>
                  <span className="font-mono font-bold text-amber-500">{item.price} Ȼ</span>
                </div>
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={purchasing === item.id || user.inventory?.includes(item.id)}
                  className={`px-4 py-1.5 rounded text-[10px] font-mono transition-all uppercase ${user.inventory?.includes(item.id)
                    ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-default'
                    : user.codeBits >= item.price
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400 cursor-not-allowed opacity-50'
                    }`}
                >
                  {purchasing === item.id ? 'ACQUIRING...' : user.inventory?.includes(item.id) ? 'OWNED' : 'ACQUIRE'}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Placeholder for Add New Item */}
        <button className="bg-slate-900/30 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center p-6 gap-3 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group">
          <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 group-hover:border-emerald-500">
            {getIcon('Settings', 20)}
          </div>
          <p className="text-xs font-mono text-slate-500 group-hover:text-emerald-500">ADD_NEW_ITEM_V2</p>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h3 className="text-sm font-mono text-emerald-500 mb-6 uppercase tracking-widest">Marketplace Volume Stats (24H)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <p className="text-[10px] text-slate-500 font-mono mb-1">TOTAL_VOLUME</p>
            <p className="text-xl font-bold text-white">45.2M Ȼ</p>
          </div>
          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <p className="text-[10px] text-slate-500 font-mono mb-1">AVG_TICKET_SIZE</p>
            <p className="text-xl font-bold text-white">842 Ȼ</p>
          </div>
          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <p className="text-[10px] text-slate-500 font-mono mb-1">PLATFORM_FEES (30%)</p>
            <p className="text-xl font-bold text-emerald-500">13.5M Ȼ</p>
          </div>
          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <p className="text-[10px] text-slate-500 font-mono mb-1">CREATOR_PAYOUTS (70%)</p>
            <p className="text-xl font-bold text-blue-500">31.7M Ȼ</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
