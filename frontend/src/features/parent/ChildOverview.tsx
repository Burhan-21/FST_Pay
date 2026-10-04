import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { parentalApi } from '../../api/endpoints';
import { formatCurrency, getCategoryEmoji } from '../../utils/helpers';
import { ArrowLeft, Trash2, Loader2, AlertCircle, Palette, Sparkles, Wifi, Upload, Check } from 'lucide-react';
import type { ChildDetail, VirtualCard } from '../../types';
import PageTransition from '../../components/ui/PageTransition';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

const CARD_DESIGNS = [
  { id: 'titanium', gradient: 'from-slate-900 via-slate-800 to-zinc-950', border: 'border-slate-700/50', label: 'Titanium Black' },
  { id: 'nebula', gradient: 'from-indigo-950 via-purple-900 to-slate-950', border: 'border-purple-600/40', label: 'Deep Nebula' },
  { id: 'emerald', gradient: 'from-emerald-950 via-teal-900 to-slate-950', border: 'border-emerald-600/40', label: 'Emerald Luxe' },
  { id: 'gold', gradient: 'from-amber-950 via-yellow-900 to-stone-950', border: 'border-amber-600/40', label: 'Royal Gold' },
  { id: 'ocean', gradient: 'from-blue-950 via-cyan-900 to-slate-950', border: 'border-cyan-600/40', label: 'Pacific Blue' },
  { id: 'rose', gradient: 'from-rose-950 via-pink-900 to-zinc-950', border: 'border-rose-600/40', label: 'Rose Gold' },
];

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

export default function ChildOverview() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Card Customization state
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(null);
  const [selectedBg, setSelectedBg] = useState('titanium');
  const [customImage, setCustomImage] = useState('');
  const [customImageUrlInput, setCustomImageUrlInput] = useState('');
  const [designTab, setDesignTab] = useState<'preset' | 'url' | 'upload'>('preset');
  const [uploadError, setUploadError] = useState('');
  const [isSavingDesign, setIsSavingDesign] = useState(false);

  // Custom alert/confirm state to replace browser native APIs
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchChildDetails = async () => {
    if (!childId) return;
    try {
      const res = await parentalApi.getChildDetails(childId);
      if (res.data?.data) {
        setChild(res.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to load child details:', err);
      setError('Could not retrieve child profile details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!childId) return;
    let isMounted = true;
    const loadDetails = async () => {
      try {
        const res = await parentalApi.getChildDetails(childId);
        if (isMounted && res.data?.data) {
          setChild(res.data.data);
        }
      } catch (err: unknown) {
        console.error('Failed to load child details:', err);
        if (isMounted) setError('Could not retrieve child profile details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDetails();
    return () => { isMounted = false; };
  }, [childId]);

  const handleToggleFreeze = async (card: VirtualCard) => {
    if (!childId) return;
    setSubmittingAction(true);
    try {
      if (card.status === 'ACTIVE') {
        await parentalApi.freezeChildCard(childId, card.id);
      } else {
        await parentalApi.unfreezeChildCard(childId, card.id);
      }
      fetchChildDetails();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Error',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to toggle card status'
          : 'Failed to toggle card status'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUnlink = async () => {
    if (!childId) return;
    setConfirmConfig({
      title: 'Unlink Account',
      message: `Are you sure you want to unlink from ${child?.fullName}? You will lose access to their spending analytics and limits.`,
      onConfirm: async () => {
        setConfirmConfig(null);
        setSubmittingAction(true);
        try {
          await parentalApi.unlinkChild(childId);
          navigate('/parent/dashboard');
        } catch (err: unknown) {
          setAlertConfig({
            title: 'Error',
            message: axios.isAxiosError<{ message?: string }>(err)
              ? err.response?.data?.message || 'Failed to unlink account.'
              : 'Failed to unlink account.'
          });
        } finally {
          setSubmittingAction(false);
        }
      }
    });
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

  const handleSaveDesign = async () => {
    if (!childId || !selectedCard) return;
    setIsSavingDesign(true);
    setUploadError('');

    let finalImage = customImage;
    if (designTab === 'url' && customImageUrlInput.trim()) {
      const trimmed = customImageUrlInput.trim();
      if (!/^https?:\/\/.+/i.test(trimmed)) {
        setUploadError('Please enter a valid HTTP/HTTPS image URL');
        setIsSavingDesign(false);
        return;
      }
      finalImage = trimmed;
    } else if (designTab === 'preset' && !customImage) {
      finalImage = '';
    }

    try {
      await parentalApi.updateChildCardDesign(childId, selectedCard.id, {
        cardDesign: JSON.stringify({
          bg: selectedBg,
          customImage: finalImage || undefined,
        }),
      });
      await fetchChildDetails();
      setShowDesignModal(false);
      setSelectedCard(null);
      setAlertConfig({
        title: 'Card Customized',
        message: `Successfully customized ${child?.fullName}'s virtual card design!`,
      });
    } catch (err: unknown) {
      setUploadError(
        axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to update card design'
          : 'Failed to update card design'
      );
    } finally {
      setIsSavingDesign(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center animate-pulse-glow shadow-glow">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-surface-400 text-sm">Retrieving profile analytics...</p>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="p-6 glass-card text-center max-w-md mx-auto my-12 space-y-4">
        <p className="text-danger-400 text-sm font-medium">{error || 'Child profile not found'}</p>
        <Link to="/parent/dashboard" className="btn-glass text-xs inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Back Breadcrumb */}
        <div>
          <Link to="/parent/dashboard" className="text-sm text-slate-500 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Parental Dashboard
          </Link>
        </div>

        {/* Child profile banner */}
        <GlassCard padding="lg" className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl gradient-card flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary-500/10 text-white">
              {child.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-slate-900 dark:text-white">{child.fullName}</h2>
              <p className="text-xs text-slate-500 dark:text-surface-400 mt-1">{child.email} · linked as <span className="text-primary-600 dark:text-primary-400 font-semibold">{child.relationship}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="text-left md:text-right">
              <span className="text-[10px] text-slate-500 dark:text-surface-400 font-bold uppercase tracking-wider block">Wallet Balance</span>
              <p className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-500 dark:from-primary-400 dark:to-accent-400 mt-1">
                {formatCurrency(child.walletBalance)}
              </p>
            </div>
            <Button
              onClick={handleUnlink}
              disabled={submittingAction}
              variant="ghost"
              size="sm"
              className="border border-danger-500/20 text-danger-500 dark:text-danger-400 hover:bg-danger-500/15 gap-1.5 px-3 py-2 font-bold"
            >
              <Trash2 className="w-4 h-4" /> Unlink Account
            </Button>
          </div>
        </GlassCard>

        {/* Virtual Cards section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard padding="lg" className="space-y-5">
              <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide border-b border-slate-200 dark:border-surface-700/50 pb-3 flex items-center justify-between">
                <span>Virtual Cards</span>
                <span className="text-xs text-slate-500 dark:text-surface-400 font-normal">Active cards assigned to {child.fullName}</span>
              </h3>

              {child.virtualCards.length === 0 ? (
                <p className="text-slate-500 dark:text-surface-500 text-xs py-6 text-center">No virtual cards generated yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {child.virtualCards.map((card) => {
                    const isFrozen = card.status === 'FROZEN';
                    const parsedDesign = getCardDesign(card.cardDesign);
                    const preset = CARD_DESIGNS.find((d) => d.id === parsedDesign.bg) || CARD_DESIGNS[0];
                    return (
                      <div key={card.id} className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-surface-800/40 flex flex-col justify-between space-y-4 hover:border-primary-500/20 transition-all shadow-sm">
                        {/* Premium card preview */}
                        <div
                          className={`rounded-xl p-4 text-white relative overflow-hidden h-36 flex flex-col justify-between shadow-lg border border-white/10 ${isFrozen ? 'brightness-50 grayscale' : ''}`}
                          style={{
                            backgroundImage: parsedDesign.customImage ? `url(${parsedDesign.customImage})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          {!parsedDesign.customImage && (
                            <div className={`absolute inset-0 bg-gradient-to-br ${preset.gradient}`} />
                          )}
                          {parsedDesign.customImage && (
                            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[0.5px]" />
                          )}

                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-primary-300" />
                              <span className="text-[10px] font-accent tracking-widest uppercase font-bold text-white/90">
                                {card.cardType || 'FST PREPAID'}
                              </span>
                            </div>
                            <Wifi className="w-4 h-4 text-white/60 rotate-90" />
                          </div>

                          <div className="relative z-10">
                            <p className="text-base font-mono tracking-widest">•••• •••• •••• {card.cardNumber.slice(-4)}</p>
                            <div className="flex items-center justify-between mt-2 text-[10px]">
                              <span className="uppercase font-medium text-white/80">{card.cardHolder}</span>
                              <span className="font-semibold text-white/90 font-mono">
                                {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card details and status actions */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-surface-400">Card Status</span>
                            <span className={`font-bold uppercase tracking-wider ${isFrozen ? 'text-rose-500 dark:text-rose-400' : 'text-accent-600 dark:text-accent-400'}`}>
                              {card.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-surface-400">Monthly Limit</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {card.spendingLimit && card.spendingLimit > 0 ? `₹${card.spendingLimit}` : 'No limit'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <Button
                              onClick={() => openDesignModal(card)}
                              variant="secondary"
                              size="sm"
                              className="w-full py-2 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 dark:border-surface-700 text-slate-700 dark:text-surface-200"
                            >
                              <Palette className="w-3.5 h-3.5 text-primary-500" />
                              <span>Customize</span>
                            </Button>
                            <Button
                              onClick={() => handleToggleFreeze(card)}
                              disabled={submittingAction}
                              variant={isFrozen ? 'primary' : 'ghost'}
                              size="sm"
                              className={`w-full py-2 font-bold text-xs ${
                                isFrozen
                                  ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400 border border-accent-500/20 hover:bg-accent-500/25'
                                  : 'bg-danger-500/10 text-danger-500 dark:text-danger-400 border border-danger-500/20 hover:bg-danger-500/25'
                              }`}
                            >
                              {isFrozen ? 'Unfreeze' : 'Freeze'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Child transactions list */}
            <GlassCard padding="lg">
              <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide border-b border-slate-200 dark:border-surface-700/50 pb-3 mb-4">
                Recent Transactions
              </h3>
              {child.recentTransactions.length === 0 ? (
                <p className="text-slate-400 dark:text-surface-500 text-xs py-8 text-center">No transaction logs recorded.</p>
              ) : (
                <div className="space-y-2">
                  {child.recentTransactions.map((txn, idx) => (
                    <div key={txn.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-800/30 transition-all" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${txn.type === 'CREDIT' ? 'bg-accent-500/10' : 'bg-slate-100 dark:bg-surface-700/50'}`}>
                        {getCategoryEmoji(txn.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{txn.merchant || txn.description}</p>
                        <p className="text-xs text-slate-500 dark:text-surface-500">{txn.category} · {new Date(txn.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold font-display ${txn.type === 'CREDIT' ? 'text-accent-600 dark:text-accent-400' : 'text-slate-900 dark:text-white'}`}>
                          {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          <div className="space-y-6">
            {/* Goals list sidebar */}
            <GlassCard padding="lg" className="space-y-4">
              <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide border-b border-slate-200 dark:border-surface-700/50 pb-2">
                Active Budget Goals
              </h3>

              {child.activeGoals.length === 0 ? (
                <p className="text-slate-500 dark:text-surface-500 text-xs text-center py-6">No active goals found for {child.fullName}.</p>
              ) : (
                <div className="space-y-4">
                  {child.activeGoals.map((goal) => {
                    const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                    return (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-900 dark:text-white font-semibold flex items-center gap-1.5">
                            <span className="text-base">{goal.icon || '🎯'}</span>
                            {goal.name}
                          </span>
                          <span className="text-primary-600 dark:text-primary-400 font-bold">{percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-surface-900 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-gradient-to-r from-primary-500 to-purple-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-surface-400">
                          <span>Saved: ₹{goal.currentAmount}</span>
                          <span>Target: ₹{goal.targetAmount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* 30-Day Spending Breakdown */}
            {child.analytics?.spendByCategory && Object.keys(child.analytics.spendByCategory).length > 0 && (
              <GlassCard padding="lg" className="space-y-4">
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide border-b border-slate-200 dark:border-surface-700/50 pb-2">
                  30-Day Spending Breakdown
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(child.analytics.spendByCategory).map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-surface-800/40 border border-slate-200/60 dark:border-surface-700/40">
                      <span className="text-slate-700 dark:text-surface-200 font-medium flex items-center gap-1.5">
                        <span>{getCategoryEmoji(cat)}</span>
                        <span>{cat}</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        {/* CUSTOMIZE VIRTUAL CARD MODAL */}
        <Modal
          isOpen={showDesignModal && !!selectedCard}
          onClose={() => {
            setShowDesignModal(false);
            setSelectedCard(null);
            setUploadError('');
          }}
          title="Customize Teen Virtual Card"
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
                  <p className="font-semibold uppercase">{selectedCard?.cardHolder || child?.fullName || 'Cardholder'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-white/60 uppercase font-mono">Expires</p>
                  <p className="font-semibold font-mono">
                    {String(selectedCard?.expiryMonth || 12).padStart(2, '0')}/{String(selectedCard?.expiryYear || 28).slice(-2)}
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
                      <span className="text-xs font-bold text-white block drop-shadow-sm">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Image URL */}
            {designTab === 'url' && (
              <div className="space-y-3">
                <div>
                  <label className="input-label">Custom Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customImageUrlInput}
                      onChange={(e) => setCustomImageUrlInput(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="input-field flex-1 py-2 text-xs"
                    />
                    <Button onClick={handleApplyImageUrl} variant="secondary" size="sm" className="text-xs font-bold px-3">
                      Apply
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-surface-400 mt-1">
                    Provide a direct, publicly accessible HTTPS image link.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Upload Image */}
            {designTab === 'upload' && (
              <div className="space-y-3">
                <div>
                  <label className="input-label">Upload from Device</label>
                  <label className="border-2 border-dashed border-slate-300 dark:border-surface-700 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 dark:hover:border-primary-500 transition-colors bg-slate-50 dark:bg-surface-800/50">
                    <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-surface-200">
                      Click to choose an image
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-surface-400 mt-0.5">
                      PNG, JPG, WEBP, or SVG (Max 2MB)
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {customImage && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-surface-800 text-xs text-slate-600 dark:text-surface-300 border border-slate-200 dark:border-surface-700">
                <span className="truncate max-w-[220px]">Custom Image Active</span>
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

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-surface-800">
              <Button
                onClick={() => {
                  setShowDesignModal(false);
                  setSelectedCard(null);
                  setUploadError('');
                }}
                variant="ghost"
                size="sm"
                className="flex-1 border border-slate-300 dark:border-surface-700 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDesign}
                disabled={isSavingDesign}
                variant="primary"
                size="sm"
                className="flex-1 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-primary-500/25"
              >
                {isSavingDesign ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Card Design</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* CUSTOM ALERT MODAL */}
        <Modal
          isOpen={alertConfig !== null}
          onClose={() => setAlertConfig(null)}
          title={alertConfig?.title}
        >
          <div className="space-y-4" aria-live="polite">
            <div className="flex items-start gap-3 p-1">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 dark:text-surface-200">{alertConfig?.message}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setAlertConfig(null)} variant="primary" size="sm">
                Dismiss
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
            <p className="text-sm text-slate-700 dark:text-surface-200">{confirmConfig?.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setConfirmConfig(null)} variant="ghost" size="sm" className="border border-slate-300 dark:border-surface-700 text-slate-700 dark:text-surface-200">
                Cancel
              </Button>
              <Button onClick={confirmConfig?.onConfirm || (() => {})} variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-500">
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
