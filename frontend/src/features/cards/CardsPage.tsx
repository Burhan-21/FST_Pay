import { useState, useEffect } from 'react';
import { formatCurrency, maskCardNumber, parseMoneyInput } from '../../utils/helpers';
import { CreditCard, Plus, Lock, Unlock, Sliders, Trash2, Shield, Palette, Sparkles, Eye, EyeOff, RefreshCw, Wifi, Upload } from 'lucide-react';
import { cardApi } from '../../api/endpoints';
import type { VirtualCard } from '../../types';
import { PageTransition, EmptyState, Modal, Button, Badge } from '../../components/ui';
import { CardSkeleton } from '../../components/skeletons/PageSkeletons';

const CARD_DESIGNS = [
  { id: 'titanium', gradient: 'from-slate-900 via-slate-800 to-zinc-950', border: 'border-slate-700/50', label: 'Titanium Black' },
  { id: 'nebula', gradient: 'from-indigo-950 via-purple-900 to-slate-950', border: 'border-purple-600/40', label: 'Deep Nebula' },
  { id: 'emerald', gradient: 'from-emerald-950 via-teal-900 to-slate-950', border: 'border-emerald-600/40', label: 'Emerald Luxe' },
  { id: 'gold', gradient: 'from-amber-950 via-yellow-900 to-stone-950', border: 'border-amber-600/40', label: 'Royal Gold' },
  { id: 'ocean', gradient: 'from-blue-950 via-cyan-900 to-slate-950', border: 'border-cyan-600/40', label: 'Pacific Blue' },
  { id: 'rose', gradient: 'from-rose-950 via-pink-900 to-zinc-950', border: 'border-rose-600/40', label: 'Rose Gold' },
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
  const [selectedBg, setSelectedBg] = useState('titanium');
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [showCardNumbers, setShowCardNumbers] = useState<Record<string, boolean>>({});

  const [customImage, setCustomImage] = useState<string>('');
  const [customImageUrlInput, setCustomImageUrlInput] = useState<string>('');
  const [designTab, setDesignTab] = useState<'preset' | 'url' | 'upload'>('preset');
  const [uploadError, setUploadError] = useState<string>('');

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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching effect: async setState after await is architecturally correct
  useEffect(() => { fetchCards(); }, []);

  const getCardDesign = (designStr: string | undefined): { bg: string; customImage?: string } => {
    try {
      if (designStr) {
        const parsed = JSON.parse(designStr);
        return { bg: parsed.bg || 'titanium', customImage: parsed.customImage || undefined };
      }
    } catch {
      /* ignore */
    }
    return { bg: 'titanium' };
  };

  const designBg = (design: { bg: string; customImage?: string }) => {
    const found = CARD_DESIGNS.find((d) => d.id === design.bg);
    return found ? `bg-gradient-to-br ${found.gradient}` : `bg-gradient-to-br ${CARD_DESIGNS[0].gradient}`;
  };

  const statusBadge = (s: string) => {
    if (s === 'ACTIVE') return 'accent' as const;
    if (s === 'FROZEN') return 'warning' as const;
    return 'danger' as const;
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Unsupported format. Please upload PNG, JPG, WEBP, or SVG.');
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setUploadError('File exceeds 2MB limit. Please upload an image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyImageUrl = () => {
    setUploadError('');
    const url = customImageUrlInput.trim();
    if (!url) {
      setUploadError('Please enter an image URL');
      return;
    }
    if (!/^https?:\/\/.+/i.test(url)) {
      setUploadError('Please enter a valid HTTP/HTTPS image URL');
      return;
    }
    const testImg = new Image();
    testImg.onload = () => {
      setCustomImage(url);
      setUploadError('');
    };
    testImg.onerror = () => {
      setUploadError('Failed to load image from this URL. Please verify the link or try another.');
    };
    testImg.src = url;
  };

  const openDesignModal = (card: VirtualCard) => {
    const design = getCardDesign(card.cardDesign);
    setSelectedCard(card);
    setSelectedBg(design.bg);
    setCustomImage(design.customImage || '');
    setCustomImageUrlInput(design.customImage && design.customImage.startsWith('http') ? design.customImage : '');
    setDesignTab(design.customImage ? (design.customImage.startsWith('http') ? 'url' : 'upload') : 'preset');
    setUploadError('');
    setShowDesignModal(true);
  };

  const handleCreate = async () => {
    setIsActionLoading(true);
    try {
      const spendingLimit = parseMoneyInput(spendingLimitInput);
      const dailyLimit = parseMoneyInput(dailyLimitInput);
      if (spendingLimit === null || dailyLimit === null) return;
      await cardApi.generateCard({
        spendingLimit,
        dailyLimit,
        isOneTime,
        merchantLock: [],
        cardDesign: JSON.stringify({ bg: selectedBg }),
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

  const handleRegenerateCard = (cardId: string) => {
    setConfirmConfig({
      title: 'Regenerate Card Details',
      message: 'This will generate a new 16-digit card number, CVV, and updated 3-year expiration date. Your balance and limits remain unchanged. Are you sure?',
      onConfirm: async () => {
        setConfirmConfig(null);
        setIsActionLoading(true);
        try {
          await cardApi.regenerateCard(cardId);
          await fetchCards();
        } catch (err) {
          console.error('Failed to regenerate card:', err);
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  const toggleCardNumber = (id: string) => {
    setShowCardNumbers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading && cards.length === 0) {
    return <CardSkeleton />;
  }

  return (
    <PageTransition className="space-y-6">
      <div className="flex items-center justify-between page-section">
        <div>
          <h1 className="text-2xl font-primary font-bold text-slate-900 dark:text-white">Virtual Cards</h1>
          <p className="text-slate-500 dark:text-surface-400 mt-1">Manage your prepaid virtual cards</p>
        </div>
        <Button
          onClick={() => {
            setShowCreate(true);
            setSelectedBg('titanium');
          }}
          variant="gradient"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Card
        </Button>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No virtual cards yet"
          description="Generate a secure virtual card to simulate online payments safely."
          action={{
            label: 'Generate Your First Card',
            onClick: () => setShowCreate(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, i) => {
            const design = getCardDesign(card.cardDesign);
            const isVisible = showCardNumbers[card.id];

            return (
              <div
                key={card.id}
                className="card-3d page-section"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className={`card-3d-inner relative overflow-hidden rounded-3xl p-6 border border-white/10 shadow-2xl group transition-all duration-500 hover:-translate-y-1.5 ${designBg(design)}`}
                  style={design.customImage ? {
                    backgroundImage: `url(${design.customImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {design.customImage && (
                    <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[0.5px] pointer-events-none" />
                  )}
                  <div className="vc-card-shine rounded-3xl" />
                  <div className="absolute top-0 right-0 w-56 h-56 bg-white/[0.03] rounded-full -translate-y-24 translate-x-24 group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

                  {/* Top Row: FST Pay Branding & Status Badge */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md">
                        <Sparkles className="w-4 h-4 text-primary-300" />
                      </div>
                      <div>
                        <span className="text-sm font-accent tracking-widest text-white uppercase font-bold">FST PAY</span>
                        <span className="text-[10px] block text-white/50 font-mono -mt-0.5">PREPAID PLATINUM</span>
                      </div>
                    </div>
                    <Badge variant={statusBadge(card.status)}>{card.status}</Badge>
                  </div>

                  {/* EMV Chip & Contactless */}
                  <div className="flex items-center gap-3 relative z-10 mb-5 mt-2">
                    <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 border border-amber-400/60 shadow-xs relative overflow-hidden flex items-center justify-center">
                      <div className="w-full h-0.5 bg-amber-600/30 absolute top-2" />
                      <div className="w-full h-0.5 bg-amber-600/30 absolute bottom-2" />
                      <div className="h-full w-0.5 bg-amber-600/30 absolute left-3" />
                      <div className="h-full w-0.5 bg-amber-600/30 absolute right-3" />
                    </div>
                    <Wifi className="w-5 h-5 text-white/50 rotate-90" />
                  </div>

                  {/* Card Number */}
                  <div className="relative z-10 mb-5">
                    <p className="text-xl font-mono text-white tracking-[0.18em] drop-shadow-sm">
                      {isVisible ? card.cardNumber : maskCardNumber(card.cardNumber)}
                    </p>
                    <button
                      onClick={() => toggleCardNumber(card.id)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80 transition-colors"
                      title={isVisible ? 'Hide Number' : 'Show Number'}
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Details */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div>
                      <p className="text-[10px] text-white/50 tracking-widest uppercase font-mono">Card Holder</p>
                      <p className="text-sm font-semibold text-white uppercase tracking-wider">{card.cardHolder}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/50 tracking-widest uppercase font-mono">Expires</p>
                      <p className="text-sm font-semibold text-white font-mono">
                        {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Limits Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                    <div className="text-xs text-white/70 space-y-0.5">
                      <p className="font-semibold">Limit: {formatCurrency(card.spendingLimit || 0)}</p>
                      <p className="text-[10px] text-white/50">Daily: {formatCurrency(card.dailyLimit || 0)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Freeze / Unfreeze */}
                      <button
                        onClick={() => handleToggleFreeze(card.id, card.status)}
                        className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all haptic-tap"
                        title={card.status === 'ACTIVE' ? 'Freeze Card' : 'Unfreeze Card'}
                      >
                        {card.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                      </button>

                      {/* Regenerate Details */}
                      <button
                        onClick={() => handleRegenerateCard(card.id)}
                        className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all haptic-tap"
                        title="Regenerate Card Details"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      {/* Customize Card Design */}
                      <button
                        onClick={() => openDesignModal(card)}
                        className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all haptic-tap"
                        title="Customize Design"
                      >
                        <Palette className="w-4 h-4" />
                      </button>

                      {/* Limits */}
                      <button
                        onClick={() => {
                          setSelectedCard(card);
                          setSpendingLimitInput(String(card.spendingLimit || 5000));
                          setDailyLimitInput(String(card.dailyLimit || 2000));
                          setShowLimitsModal(true);
                        }}
                        className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all haptic-tap"
                        title="Card Limits"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          setConfirmConfig({
                            title: 'Cancel Virtual Card',
                            message: 'Are you sure you want to cancel this virtual card? This action is permanent and cannot be undone.',
                            onConfirm: () => {
                              setConfirmConfig(null);
                              cardApi.deleteCard(card.id).then(fetchCards);
                            },
                          });
                        }}
                        className="p-2 rounded-xl hover:bg-danger-500/20 text-white/70 hover:text-danger-400 transition-all haptic-tap"
                        title="Delete Card"
                      >
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
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Generate Virtual Card">
        <div className="space-y-5">
          <div className="p-4 rounded-2xl glass flex items-start gap-3 border border-slate-200/60 dark:border-surface-700">
            <Shield className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-slate-900 dark:text-white font-semibold">Instant Secure Issuance</p>
              <p className="text-xs text-slate-500 dark:text-surface-400 mt-0.5">
                Generates a dynamic 16-digit card number with CVV protection and customizable limits.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Spending Limit (₹)</label>
                <input
                  type="number"
                  value={spendingLimitInput}
                  onChange={(e) => setSpendingLimitInput(e.target.value)}
                  className="input-field"
                  min="100"
                />
              </div>
              <div>
                <label className="input-label">Daily Limit (₹)</label>
                <input
                  type="number"
                  value={dailyLimitInput}
                  onChange={(e) => setDailyLimitInput(e.target.value)}
                  className="input-field"
                  min="100"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Card Theme</label>
              <div className="grid grid-cols-3 gap-2.5">
                {CARD_DESIGNS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedBg(style.id)}
                    className={`h-12 rounded-xl border p-2 text-left transition-all relative overflow-hidden ${
                      selectedBg === style.id
                        ? 'border-primary-500 ring-2 ring-primary-500/30 scale-[1.02]'
                        : 'border-slate-200 dark:border-surface-700 opacity-70 hover:opacity-100'
                    } bg-gradient-to-br ${style.gradient}`}
                  >
                    <span className="text-[11px] font-bold text-white block truncate">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200/60 dark:border-surface-700">
              <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${isOneTime ? 'bg-primary-500' : 'bg-slate-300 dark:bg-surface-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${isOneTime ? 'translate-x-5.5' : 'translate-x-0.5'} mt-0.5`} />
              </div>
              <input
                type="checkbox"
                checked={isOneTime}
                onChange={(e) => setIsOneTime(e.target.checked)}
                className="hidden"
              />
              <div>
                <span className="text-xs text-slate-800 dark:text-surface-200 font-semibold block">One-time virtual card</span>
                <span className="text-[11px] text-slate-500 dark:text-surface-400 block">Automatically expires after the first transaction</span>
              </div>
            </label>
          </div>

          <Button
            onClick={handleCreate}
            disabled={isActionLoading}
            variant="gradient"
            isLoading={isActionLoading}
            fullWidth
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Issue Card Now
          </Button>
        </div>
      </Modal>

      {/* Limits Modal */}
      <Modal
        isOpen={showLimitsModal && !!selectedCard}
        onClose={() => {
          setShowLimitsModal(false);
          setSelectedCard(null);
        }}
        title="Adjust Card Limits"
      >
        <div className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="input-label">Spending Limit (₹)</label>
              <input
                type="number"
                value={spendingLimitInput}
                onChange={(e) => setSpendingLimitInput(e.target.value)}
                className="input-field"
                min="0"
              />
            </div>
            <div>
              <label className="input-label">Daily Limit (₹)</label>
              <input
                type="number"
                value={dailyLimitInput}
                onChange={(e) => setDailyLimitInput(e.target.value)}
                className="input-field"
                min="0"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowLimitsModal(false);
                setSelectedCard(null);
              }}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
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
                  setShowLimitsModal(false);
                  setSelectedCard(null);
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsActionLoading(false);
                }
              }}
              disabled={isActionLoading}
              variant="primary"
              isLoading={isActionLoading}
              fullWidth
            >
              Save Limits
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Design Modal */}
      <Modal
        isOpen={showDesignModal && !!selectedCard}
        onClose={() => {
          setShowDesignModal(false);
          setSelectedCard(null);
        }}
        title="Customize Virtual Card"
      >
        <div className="space-y-5">
          {/* Live Interactive Card Preview */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 border border-white/10 shadow-lg text-white"
            style={{
              backgroundImage: customImage ? `url(${customImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {!customImage && (
              <div className={`absolute inset-0 bg-gradient-to-br ${CARD_DESIGNS.find((d) => d.id === selectedBg)?.gradient || CARD_DESIGNS[0].gradient}`} />
            )}
            {customImage && (
              <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[0.5px]" />
            )}

            <div className="relative z-10 flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-300" />
                <span className="text-xs font-accent tracking-widest uppercase font-bold">FST PAY</span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded-md">PREVIEW</span>
            </div>

            <div className="flex items-center gap-2 relative z-10 mb-4">
              <div className="w-8 h-5 rounded bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 border border-amber-400/60" />
              <Wifi className="w-4 h-4 text-white/50 rotate-90" />
            </div>

            <p className="text-base font-mono tracking-widest mb-3 relative z-10">
              •••• •••• •••• {selectedCard?.cardNumber.slice(-4) || '8888'}
            </p>

            <div className="flex items-center justify-between text-[11px] relative z-10">
              <div>
                <p className="text-[9px] text-white/60 uppercase font-mono">Card Holder</p>
                <p className="font-semibold uppercase">{selectedCard?.cardHolder || 'Cardholder'}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-white/60 uppercase font-mono">Expires</p>
                <p className="font-semibold font-mono">
                  {String(selectedCard?.expiryMonth || 12).padStart(2, '0')}/{selectedCard?.expiryYear || 28}
                </p>
              </div>
            </div>
          </div>

          {/* Customization Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-surface-800 p-1 border border-slate-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setDesignTab('preset')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                designTab === 'preset'
                  ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Finish Themes
            </button>
            <button
              type="button"
              onClick={() => setDesignTab('url')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                designTab === 'url'
                  ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Image URL
            </button>
            <button
              type="button"
              onClick={() => setDesignTab('upload')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                designTab === 'upload'
                  ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Upload Image
            </button>
          </div>

          {uploadError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {uploadError}
            </div>
          )}

          {/* Tab 1: Finish Themes */}
          {designTab === 'preset' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                {CARD_DESIGNS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => {
                      setSelectedBg(style.id);
                      setCustomImage('');
                    }}
                    className={`h-14 rounded-xl border p-2.5 text-left transition-all ${
                      selectedBg === style.id && !customImage
                        ? 'border-primary-500 ring-2 ring-primary-500/30 scale-[1.02]'
                        : 'border-slate-200 dark:border-surface-700 opacity-70 hover:opacity-100'
                    } bg-gradient-to-br ${style.gradient}`}
                  >
                    <span className="text-xs font-bold text-white block">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Image URL */}
          {designTab === 'url' && (
            <div className="space-y-3">
              <label className="input-label text-xs">Image Link (HTTPS)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customImageUrlInput}
                  onChange={(e) => setCustomImageUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="input-field text-xs py-2 flex-1"
                />
                <Button onClick={handleApplyImageUrl} size="sm" variant="primary">
                  Preview
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-surface-400">
                Supports PNG, JPG, or WEBP links. Preview automatically includes a dark tint overlay so card credentials remain clearly legible.
              </p>
            </div>
          )}

          {/* Tab 3: Upload Image */}
          {designTab === 'upload' && (
            <div className="space-y-3">
              <label className="input-label text-xs">Upload from Device (Max 2MB)</label>
              <div className="border-2 border-dashed border-slate-300 dark:border-surface-700 rounded-2xl p-5 text-center hover:border-primary-500 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-primary-500 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-surface-200">
                  Select image file
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP, SVG (Max 2MB)</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleImageFileUpload}
                  className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                />
              </div>
            </div>
          )}

          {customImage && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 text-xs text-slate-600 dark:text-surface-300 border border-slate-200 dark:border-surface-700">
              <span className="truncate max-w-[220px]">Custom Background Active</span>
              <button
                type="button"
                onClick={() => {
                  setCustomImage('');
                  setCustomImageUrlInput('');
                }}
                className="text-rose-500 hover:underline text-[11px] font-semibold"
              >
                Clear Custom Image
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => {
                setShowDesignModal(false);
                setSelectedCard(null);
              }}
              variant="secondary"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedCard) return;
                let finalImage = customImage;
                if (designTab === 'url' && customImageUrlInput.trim()) {
                  const trimmed = customImageUrlInput.trim();
                  if (!/^https?:\/\/.+/i.test(trimmed)) {
                    setUploadError('Please enter a valid HTTP/HTTPS image URL');
                    return;
                  }
                  finalImage = trimmed;
                } else if (designTab === 'preset' && !customImage) {
                  finalImage = '';
                }

                setIsActionLoading(true);
                try {
                  await cardApi.updateDesign(selectedCard.id, {
                    cardDesign: JSON.stringify({ bg: selectedBg, customImage: finalImage || undefined }),
                  });
                  await fetchCards();
                  setShowDesignModal(false);
                  setSelectedCard(null);
                } catch (err) {
                  console.error(err);
                  setUploadError('Failed to save card design. Please try again.');
                } finally {
                  setIsActionLoading(false);
                }
              }}
              disabled={isActionLoading}
              variant="primary"
              isLoading={isActionLoading}
              fullWidth
            >
              Save Custom Card
            </Button>
          </div>
        </div>
      </Modal>

      {/* CUSTOM CONFIRM MODAL */}
      <Modal
        isOpen={confirmConfig !== null}
        onClose={() => setConfirmConfig(null)}
        title={confirmConfig?.title}
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-200">{confirmConfig?.message}</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setConfirmConfig(null)} variant="ghost" size="sm" className="border border-surface-700">
              Cancel
            </Button>
            <Button onClick={confirmConfig?.onConfirm || (() => {})} variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-500">
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}
