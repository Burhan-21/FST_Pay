import { useState, useEffect } from 'react';
import { formatCurrency, maskCardNumber, parseMoneyInput } from '../../utils/helpers';
import { CreditCard, Plus, Lock, Unlock, Sliders, Trash2, Shield, Loader2, Palette, Sparkles, Eye, EyeOff } from 'lucide-react';
import { cardApi } from '../../api/endpoints';
import type { VirtualCard } from '../../types';

const CARD_DESIGNS = [
  { id: 'sunset', gradient: 'from-orange-400 via-pink-500 to-indigo-600', label: 'Sunset' },
  { id: 'nebula', gradient: 'from-indigo-900 via-purple-700 to-pink-500', label: 'Nebula' },
  { id: 'cyberpunk', gradient: 'from-emerald-500 via-teal-600 to-blue-800', label: 'Cyberpunk' },
  { id: 'gold', gradient: 'from-yellow-400 via-amber-500 to-amber-800', label: 'Gold' },
  { id: 'rose', gradient: 'from-rose-400 via-red-600 to-amber-900', label: 'Rose' },
  { id: 'ocean', gradient: 'from-cyan-400 via-blue-600 to-indigo-900', label: 'Ocean' },
];

const MASCOTS = [
  { id: 'none', emoji: '💎', label: 'Gem' },
  { id: 'dragon', emoji: '🐲', label: 'Dragon' },
  { id: 'kitty', emoji: '🐱', label: 'Kitty' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'phoenix', emoji: '🦅', label: 'Phoenix' },
];

export default function CardsPage() {
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(null);
  const [spendingLimitInput, setSpendingLimitInput] = useState('5000');
  const [dailyLimitInput, setDailyLimitInput] = useState('2000');
  const [isOneTime, setIsOneTime] = useState(false);
  const [selectedBg, setSelectedBg] = useState('sunset');
  const [selectedMascot, setSelectedMascot] = useState('none');
  const [customPicUrl, setCustomPicUrl] = useState('');
  const [showCardNumbers, setShowCardNumbers] = useState<Record<string, boolean>>({});

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      const res = await cardApi.getCards();
      setCards(res.data.data || []);
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCards(); }, []);

  const getCardDesign = (designStr: string | undefined) => {
    try {
      if (designStr) {
        const parsed = JSON.parse(designStr);
        return { bg: parsed.bg || 'sunset', mascot: parsed.mascot || 'none', customPic: parsed.customPic || '' };
      }
    } catch { /* ignore */ }
    return { bg: 'sunset', mascot: 'none', customPic: '' };
  };

  const designBg = (design: { bg: string; customPic?: string }) => {
    if (design.customPic) return '';
    const found = CARD_DESIGNS.find(d => d.id === design.bg);
    return found ? `bg-gradient-to-br ${found.gradient}` : `bg-gradient-to-br ${CARD_DESIGNS[0].gradient}`;
  };

  const getMascotEmoji = (mascot: string) => MASCOTS.find(m => m.id === mascot)?.emoji || null;

  const statusBadge = (s: string) => {
    if (s === 'ACTIVE') return 'badge-accent';
    if (s === 'FROZEN') return 'badge-warning';
    return 'badge-danger';
  };

  const handleCreate = async () => {
    setIsActionLoading(true);
    try {
      const spendingLimit = parseMoneyInput(spendingLimitInput);
      const dailyLimit = parseMoneyInput(dailyLimitInput);
      if (spendingLimit === null || dailyLimit === null) return;
      await cardApi.generateCard({
        spendingLimit, dailyLimit, isOneTime, merchantLock: [],
        cardDesign: JSON.stringify({ bg: selectedBg, mascot: selectedMascot, customPic: customPicUrl }),
      });
      await fetchCards();
      setShowCreate(false);
    } catch (err) {
      console.error('Card generation failed:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleFreeze = async (cardId: string, status: string) => {
    setIsActionLoading(true);
    try {
      if (status === 'ACTIVE') await cardApi.freezeCard(cardId);
      else await cardApi.unfreezeCard(cardId);
      await fetchCards();
    } catch (err) {
      console.error('Freeze toggle failed:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleCardNumber = (id: string) => {
    setShowCardNumbers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading && cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-surface-400 text-sm">Loading virtual cards...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between page-section">
        <div>
          <h1 className="text-2xl font-primary font-bold text-white">Virtual Cards</h1>
          <p className="text-surface-400 mt-1">Manage your prepaid virtual cards</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setSelectedBg('sunset'); setSelectedMascot('none'); setCustomPicUrl(''); }}
          className="btn-gradient flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> New Card
        </button>
      </div>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="glass-card p-16 text-center page-section">
          <div className="w-16 h-16 rounded-2xl bg-surface-700/50 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-surface-500" />
          </div>
          <p className="text-surface-300 font-semibold text-lg">No virtual cards yet</p>
          <p className="text-surface-500 text-sm mt-1 max-w-md mx-auto">Generate a secure virtual card to simulate online payments safely.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-6">
            <Plus className="w-4 h-4" /> Generate Your First Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, i) => {
            const design = getCardDesign(card.cardDesign);
            const mascotEmoji = getMascotEmoji(design.mascot);
            const hasCustomPic = !!design.customPic;
            const isVisible = showCardNumbers[card.id];

            return (
              <div
                key={card.id}
                className="card-3d page-section"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className={`card-3d-inner relative overflow-hidden rounded-3xl p-6 border border-white/10 shadow-xl group transition-all duration-500 hover:-translate-y-2 ${designBg(design)}`}
                  style={hasCustomPic ? {
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.9) 100%), url(${design.customPic})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                  } : {}}
                >
                  <div className="vc-card-shine rounded-3xl" />
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-20 translate-x-20 group-hover:scale-150 transition-transform duration-700" />

                  {/* Mascot */}
                  {mascotEmoji && (
                    <div className="absolute right-5 top-5 w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl shadow-lg border border-white/20 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                      {mascotEmoji}
                    </div>
                  )}

                  {/* Top Row */}
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-7 h-7 text-white/70" />
                      <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">Virtual</span>
                    </div>
                    <span className={statusBadge(card.status)}>{card.status}</span>
                  </div>

                  {/* Card Number */}
                  <div className="relative z-10 mb-5">
                    <p className="text-xl font-mono text-white tracking-[0.15em]">
                      {isVisible ? card.cardNumber : maskCardNumber(card.cardNumber)}
                    </p>
                    <button
                      onClick={() => toggleCardNumber(card.id)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80 transition-colors"
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Details */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div>
                      <p className="text-[10px] text-white/50 tracking-widest uppercase font-mono">Card Holder</p>
                      <p className="text-sm font-semibold text-white uppercase">{card.cardHolder}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/50 tracking-widest uppercase font-mono">Expires</p>
                      <p className="text-sm font-semibold text-white font-mono">
                        {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                    <div className="text-xs text-white/70 space-y-0.5">
                      <p className="font-semibold">Limit: {formatCurrency(card.spendingLimit || 0)}</p>
                      <p className="text-[10px] text-white/50">Daily: {formatCurrency(card.dailyLimit || 0)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleFreeze(card.id, card.status)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all haptic-tap"
                        title={card.status === 'ACTIVE' ? 'Freeze' : 'Unfreeze'}>
                        {card.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setSelectedCard(card); setSelectedBg(design.bg); setSelectedMascot(design.mascot); setCustomPicUrl(design.customPic); setShowDesignModal(true); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all haptic-tap" title="Customize">
                        <Palette className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setSelectedCard(card); setSpendingLimitInput(String(card.spendingLimit || 5000)); setDailyLimitInput(String(card.dailyLimit || 2000)); setShowLimitsModal(true); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all haptic-tap" title="Limits">
                        <Sliders className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm('Cancel this virtual card?')) cardApi.deleteCard(card.id).then(fetchCards); }}
                        className="p-2 rounded-lg hover:bg-danger-500/10 text-white/60 hover:text-danger-400 transition-all haptic-tap" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-panel space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-primary font-bold text-white">Generate New Card</h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-xl bg-surface-700/50 flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-600/50 transition-all">✕</button>
            </div>

            <div className="p-4 rounded-xl glass flex items-start gap-3">
              <Shield className="w-5 h-5 text-accent-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-white font-semibold">Secure Virtual Card</p>
                <p className="text-xs text-surface-400 mt-0.5">Generated instantly with custom details and spending limits.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Spending Limit</label>
                  <input type="number" value={spendingLimitInput} onChange={(e) => setSpendingLimitInput(e.target.value)} className="input-field" min="100" />
                </div>
                <div>
                  <label className="input-label">Daily Limit</label>
                  <input type="number" value={dailyLimitInput} onChange={(e) => setDailyLimitInput(e.target.value)} className="input-field" min="100" />
                </div>
              </div>

              <div>
                <label className="input-label">Card Design</label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {CARD_DESIGNS.map((style) => (
                    <button key={style.id} type="button" onClick={() => { setSelectedBg(style.id); setCustomPicUrl(''); }}
                      className={`h-10 rounded-lg border transition-all ${selectedBg === style.id && !customPicUrl ? 'border-primary-400 ring-2 ring-primary-500/20 scale-105' : 'border-white/10 opacity-60 hover:opacity-100'} bg-gradient-to-br ${style.gradient}`}
                      title={style.label} />
                  ))}
                </div>
                <input type="text" placeholder="Or paste custom image URL" value={customPicUrl}
                  onChange={(e) => { setCustomPicUrl(e.target.value); setSelectedBg('custom'); }}
                  className="input-field text-xs" />
              </div>

              <div>
                <label className="input-label">Mascot Character</label>
                <div className="grid grid-cols-6 gap-2">
                  {MASCOTS.map((mascot) => (
                    <button key={mascot.id} type="button" onClick={() => setSelectedMascot(mascot.id)}
                      className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-all bg-surface-800/40 hover:bg-surface-700/40 ${selectedMascot === mascot.id ? 'border-primary-400 bg-primary-500/10 text-white scale-105' : 'border-white/10 text-surface-400'}`}>
                      <span className="text-xl">{mascot.emoji}</span>
                      <span className="text-[9px] mt-0.5 font-medium">{mascot.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${isOneTime ? 'bg-primary-500' : 'bg-surface-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${isOneTime ? 'translate-x-5.5' : 'translate-x-0.5'} mt-0.5`} />
                </div>
                <input type="checkbox" checked={isOneTime} onChange={(e) => setIsOneTime(e.target.checked)} className="hidden" />
                <span className="text-xs text-surface-300 font-medium">One-time use (auto-deletes after first transaction)</span>
              </label>
            </div>

            <button onClick={handleCreate} disabled={isActionLoading}
              className="btn-gradient w-full flex items-center justify-center gap-2 py-3">
              {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Generate Card</>}
            </button>
          </div>
        </div>
      )}

      {/* Limits Modal */}
      {showLimitsModal && selectedCard && (
        <div className="modal-overlay" onClick={() => { setShowLimitsModal(false); setSelectedCard(null); }}>
          <div className="modal-panel space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-primary font-bold text-white">Adjust Card Limits</h3>
              <button onClick={() => { setShowLimitsModal(false); setSelectedCard(null); }} className="w-8 h-8 rounded-xl bg-surface-700/50 flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-600/50 transition-all">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="input-label">Spending Limit</label>
                <input type="number" value={spendingLimitInput} onChange={(e) => setSpendingLimitInput(e.target.value)} className="input-field" min="0" />
              </div>
              <div>
                <label className="input-label">Daily Limit</label>
                <input type="number" value={dailyLimitInput} onChange={(e) => setDailyLimitInput(e.target.value)} className="input-field" min="0" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowLimitsModal(false); setSelectedCard(null); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={async () => {
                if (!selectedCard) return;
                setIsActionLoading(true);
                try {
                  const spendingLimit = parseMoneyInput(spendingLimitInput);
                  const dailyLimit = parseMoneyInput(dailyLimitInput);
                  if (spendingLimit === null || dailyLimit === null) {
                    throw new Error('Invalid limit values');
                  }
                  await cardApi.setLimits(selectedCard.id, { spendingLimit, dailyLimit });
                  await fetchCards();
                  setShowLimitsModal(false); setSelectedCard(null);
                } catch (err) { console.error(err); } finally { setIsActionLoading(false); }
              }} disabled={isActionLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save Limits</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Design Modal */}
      {showDesignModal && selectedCard && (
        <div className="modal-overlay" onClick={() => { setShowDesignModal(false); setSelectedCard(null); }}>
          <div className="modal-panel space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-primary font-bold text-white">Customize Design</h3>
              <button onClick={() => { setShowDesignModal(false); setSelectedCard(null); }} className="w-8 h-8 rounded-xl bg-surface-700/50 flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-600/50 transition-all">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="input-label">Background Style</label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {CARD_DESIGNS.map((style) => (
                    <button key={style.id} type="button" onClick={() => { setSelectedBg(style.id); setCustomPicUrl(''); }}
                      className={`h-10 rounded-lg border transition-all ${selectedBg === style.id && !customPicUrl ? 'border-primary-400 ring-2 ring-primary-500/20 scale-105' : 'border-white/10 opacity-60 hover:opacity-100'} bg-gradient-to-br ${style.gradient}`} />
                  ))}
                </div>
                <input type="text" placeholder="Custom image URL" value={customPicUrl}
                  onChange={(e) => { setCustomPicUrl(e.target.value); setSelectedBg('custom'); }} className="input-field text-xs" />
              </div>
              <div>
                <label className="input-label">Mascot</label>
                <div className="grid grid-cols-6 gap-2">
                  {MASCOTS.map((mascot) => (
                    <button key={mascot.id} type="button" onClick={() => setSelectedMascot(mascot.id)}
                      className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-all bg-surface-800/40 hover:bg-surface-700/40 ${selectedMascot === mascot.id ? 'border-primary-400 bg-primary-500/10 text-white scale-105' : 'border-white/10 text-surface-400'}`}>
                      <span className="text-xl">{mascot.emoji}</span>
                      <span className="text-[9px] mt-0.5">{mascot.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDesignModal(false); setSelectedCard(null); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={async () => {
                if (!selectedCard) return;
                setIsActionLoading(true);
                try {
                  await cardApi.updateDesign(selectedCard.id, { cardDesign: JSON.stringify({ bg: selectedBg, mascot: selectedMascot, customPic: customPicUrl }) });
                  await fetchCards();
                  setShowDesignModal(false); setSelectedCard(null);
                } catch (err) { console.error(err); } finally { setIsActionLoading(false); }
              }} disabled={isActionLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Save Design</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
