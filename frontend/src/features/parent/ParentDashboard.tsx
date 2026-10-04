import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { parentalApi, walletApi, rewardsApi, reportsApi } from '../../api/endpoints';
import { formatCurrency } from '../../utils/helpers';
import { Link } from 'react-router-dom';
import {
  Wallet, Shield, ArrowUpRight, Check, Bell,
  Loader2, Send, ToggleLeft, ToggleRight, Users, Target, Activity, AlertCircle,
  Repeat, Play, Pause, Trash2, Clock, UserPlus, Copy, ShoppingBag, Plus, Eye, EyeOff,
  CreditCard, QrCode, Building2, Trophy, Award, Mail, Image as ImageIcon, Link as LinkIcon, Upload, Gift, Flame
} from 'lucide-react';
import type { ParentDashboardData, ChildSummary, ScheduledAllowance, WalletGoal, ParentNotification, RewardsStatus, RewardItem, RedeemResponse, VirtualCard } from '../../types';
import PageTransition from '../../components/ui/PageTransition';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';
import AddMoneyModal from '../../components/modals/AddMoneyModal';

interface ChildGoalItem extends WalletGoal {
  childName: string;
}

const cardBgPresets = [
  { id: 'obsidian', name: 'Obsidian Black', class: 'bg-gradient-to-br from-slate-900 via-slate-800 to-black border-slate-700' },
  { id: 'sapphire', name: 'Sapphire Blue', class: 'bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 border-blue-500/30' },
  { id: 'emerald', name: 'Emerald Cyber', class: 'bg-gradient-to-br from-emerald-700 via-teal-900 to-slate-950 border-emerald-500/30' },
  { id: 'sunset', name: 'Sunset Glow', class: 'bg-gradient-to-br from-amber-600 via-rose-700 to-purple-950 border-rose-500/30' },
  { id: 'purple', name: 'Cosmic Purple', class: 'bg-gradient-to-br from-purple-700 via-indigo-900 to-slate-950 border-purple-500/30' },
  { id: 'titanium', name: 'Titanium Sleek', class: 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900 border-slate-500' },
];

const parseCardDesign = (designStr: string | undefined): { bg: string; customImage?: string } => {
  if (!designStr) return { bg: 'obsidian' };
  try {
    const parsed = JSON.parse(designStr);
    return {
      bg: parsed.bg || 'obsidian',
      customImage: parsed.customImage || undefined,
    };
  } catch {
    return { bg: 'obsidian' };
  }
};

export default function ParentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [selectedChild, setSelectedChild] = useState<ChildSummary | null>(null);
  const [pocketMoneyOpen, setPocketMoneyOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);

  // Card Customization state
  const [customizeCardOpen, setCustomizeCardOpen] = useState(false);
  const [customizeTargetChild, setCustomizeTargetChild] = useState<ChildSummary | null>(null);
  const [customizeTargetCard, setCustomizeTargetCard] = useState<VirtualCard | null>(null);
  const [selectedBg, setSelectedBg] = useState('obsidian');
  const [customImage, setCustomImage] = useState('');
  const [customImageUrlInput, setCustomImageUrlInput] = useState('');
  const [designTab, setDesignTab] = useState<'preset' | 'upload' | 'url'>('preset');
  const [uploadError, setUploadError] = useState('');
  const [isSavingDesign, setIsSavingDesign] = useState(false);
  const [isLoadingCard, setIsLoadingCard] = useState(false);

  // Parent Rewards & Gamification state
  const [parentRewards, setParentRewards] = useState<RewardsStatus | null>(null);
  const [rewardsCatalog, setRewardsCatalog] = useState<RewardItem[]>([]);
  const [isClaimingStreak, setIsClaimingStreak] = useState(false);
  const [isRedeemingReward, setIsRedeemingReward] = useState<string | null>(null);
  const [revealedVoucher, setRevealedVoucher] = useState<RedeemResponse | null>(null);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState(false);

  // Monthly Statement state
  const [isRequestingStatement, setIsRequestingStatement] = useState(false);

  // Add Money & Parent Wallet state
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [parentWallet, setParentWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [showWalletBalance, setShowWalletBalance] = useState(true);

  // Pocket Money multi-payment method state
  const [transferPaymentMethod, setTransferPaymentMethod] = useState<'WALLET' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('WALLET');
  const [transferUpiId, setTransferUpiId] = useState('');
  const [transferCardNumber, setTransferCardNumber] = useState('');
  const [transferCardExpiry, setTransferCardExpiry] = useState('');
  const [transferCardCvv, setTransferCardCvv] = useState('');
  const [transferBank, setTransferBank] = useState('sbi');
  const [pocketMoneyError, setPocketMoneyError] = useState('');

  // Link Child Account state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkIdentifier, setLinkIdentifier] = useState('');
  const [linkRelationship, setLinkRelationship] = useState('CHILD');
  const [isLinking, setIsLinking] = useState(false);
  const [copiedParentEmail, setCopiedParentEmail] = useState(false);

  // Scheduled Allowance state
  const [allowances, setAllowances] = useState<ScheduledAllowance[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [allowanceChildId, setAllowanceChildId] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState('250');
  const [allowanceFrequency, setAllowanceFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [allowanceDayOfWeek, setAllowanceDayOfWeek] = useState('MONDAY');
  const [allowanceDayOfMonth, setAllowanceDayOfMonth] = useState('1');
  const [allowanceGoalId, setAllowanceGoalId] = useState('');
  const [allowanceNote, setAllowanceNote] = useState('Weekly pocket money');
  const [modalChildGoals, setModalChildGoals] = useState<WalletGoal[]>([]);
  const [childGoalsList, setChildGoalsList] = useState<ChildGoalItem[]>([]);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  // Custom alert & confirm states
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<ParentNotification | null>(null);

  // Form values
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('Monthly pocket money');
  const [maxTxnLimit, setMaxTxnLimit] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [restrictedCats, setRestrictedCats] = useState('');
  const [blockedMerchants, setBlockedMerchants] = useState('');
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchDashboardData = async () => {
    try {
      let safeRewardsApi: any = null;
      try {
        safeRewardsApi = rewardsApi;
      } catch {
        safeRewardsApi = null;
      }

      const [dashRes, allowRes, walletRes, rewardsRes, catalogRes] = await Promise.all([
        parentalApi.getDashboard(),
        Promise.resolve(parentalApi?.getAllowances ? parentalApi.getAllowances() : null).catch(() => ({ data: { data: [] as ScheduledAllowance[] } })),
        Promise.resolve(walletApi?.getWallet ? walletApi.getWallet() : null).catch(() => ({ data: { data: null } })),
        Promise.resolve(safeRewardsApi?.getStatus ? safeRewardsApi.getStatus() : null).catch(() => ({ data: null })),
        Promise.resolve(safeRewardsApi?.getCatalog ? safeRewardsApi.getCatalog() : null).catch(() => ({ data: [] })),
      ]);
      if (walletRes?.data?.data) {
        setParentWallet(walletRes.data.data);
      }
      if (rewardsRes?.data) {
        setParentRewards(rewardsRes.data.data || rewardsRes.data);
      }
      if (catalogRes?.data) {
        setRewardsCatalog(catalogRes.data.data || catalogRes.data || []);
      }
      if (dashRes.data?.data) {
        const dashData = dashRes.data.data;
        setData(dashData);

        // Fetch real active goals for linked children
        if (dashData.children && dashData.children.length > 0) {
          const goalsAcc: ChildGoalItem[] = [];
          await Promise.allSettled(
            dashData.children.map(async (c: ChildSummary) => {
              try {
                const detailsRes = await parentalApi.getChildDetails(c.id);
                if (detailsRes.data?.data?.activeGoals) {
                  detailsRes.data.data.activeGoals.forEach((g: WalletGoal) => {
                    goalsAcc.push({ ...g, childName: c.fullName });
                  });
                }
              } catch {
                // Ignore individual child error
              }
            })
          );
          setChildGoalsList(goalsAcc);
        } else {
          setChildGoalsList([]);
        }
      }
      if (allowRes?.data?.data) {
        setAllowances(allowRes.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to load parent dashboard:', err);
      setError('Could not retrieve dashboard information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkIdentifier.trim()) return;
    setIsLinking(true);
    try {
      await parentalApi.linkChild({
        identifier: linkIdentifier.trim(),
        relationship: linkRelationship
      });
      setLinkModalOpen(false);
      setLinkIdentifier('');
      setAlertConfig({
        title: 'Child Account Linked',
        message: 'Successfully linked teen account! You can now monitor balances, enforce spending caps, and schedule automated pocket money.'
      });
      fetchDashboardData();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Linking Failed',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Could not link child account. Ensure email or phone is correct and registered.'
          : 'Could not link child account. Ensure email or phone is correct and registered.'
      });
    } finally {
      setIsLinking(false);
    }
  };

  const parentBalance = parentWallet?.balance ?? data?.parentWalletBalance ?? 0;

  const handleSendPocketMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setPocketMoneyError('');
    if (!selectedChild || !transferAmount) return;

    const numAmount = parseFloat(transferAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPocketMoneyError('Please enter a valid amount greater than 0.');
      return;
    }

    if (transferPaymentMethod === 'WALLET' && parentBalance < numAmount) {
      setPocketMoneyError(`Insufficient wallet balance (${formatCurrency(parentBalance)} available). Please add money or choose UPI, Card, or Bank Transfer below.`);
      return;
    }

    if (transferPaymentMethod === 'UPI') {
      if (transferUpiId.trim() && !transferUpiId.includes('@')) {
        setPocketMoneyError('Please enter a valid UPI ID (e.g. yourname@upi).');
        return;
      }
    } else if (transferPaymentMethod === 'CARD') {
      const cleanCard = transferCardNumber.replace(/\s+/g, '');
      if (cleanCard.length < 15) {
        setPocketMoneyError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!transferCardExpiry || transferCardExpiry.length < 5) {
        setPocketMoneyError('Please enter card expiry date (MM/YY).');
        return;
      }
      if (!transferCardCvv || transferCardCvv.length < 3) {
        setPocketMoneyError('Please enter a valid 3-digit CVV.');
        return;
      }
    }

    setSubmittingAction(true);
    try {
      await parentalApi.sendPocketMoney({
        childId: selectedChild.id,
        amount: numAmount,
        description: transferDesc,
        paymentMethod: transferPaymentMethod,
      });
      setPocketMoneyOpen(false);
      setTransferAmount('');
      setPocketMoneyError('');
      fetchDashboardData();
      const methodLabel = transferPaymentMethod === 'WALLET'
        ? 'FST Pay Wallet'
        : transferPaymentMethod === 'UPI'
        ? 'UPI'
        : transferPaymentMethod === 'CARD'
        ? 'Debit/Credit Card'
        : 'Bank Transfer';
      setAlertConfig({
        title: 'Pocket Money Transferred',
        message: `Transferred ${formatCurrency(numAmount)} to ${selectedChild.fullName}'s wallet via ${methodLabel}.`
      });
    } catch (err: unknown) {
      const errMsg = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message || 'Transfer failed. Check your wallet balance.'
        : 'Transfer failed. Check your wallet balance.';
      setPocketMoneyError(errMsg);
    } finally {
      setSubmittingAction(false);
    }
  };

  const openScheduleModal = async (child?: ChildSummary) => {
    const cId = child ? child.id : (data?.children[0]?.id || '');
    setAllowanceChildId(cId);
    setAllowanceAmount('250');
    setAllowanceFrequency('WEEKLY');
    setAllowanceDayOfWeek('MONDAY');
    setAllowanceDayOfMonth('1');
    setAllowanceGoalId('');
    setAllowanceNote('Weekly pocket money');
    setScheduleModalOpen(true);

    if (cId) {
      try {
        const detailsRes = await parentalApi.getChildDetails(cId);
        setModalChildGoals(detailsRes.data?.data?.activeGoals || []);
      } catch {
        setModalChildGoals([]);
      }
    }
  };

  const handleChildSelectForSchedule = async (cId: string) => {
    setAllowanceChildId(cId);
    setAllowanceGoalId('');
    try {
      const detailsRes = await parentalApi.getChildDetails(cId);
      setModalChildGoals(detailsRes.data?.data?.activeGoals || []);
    } catch {
      setModalChildGoals([]);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowanceChildId || !allowanceAmount) return;
    setSubmittingAction(true);
    try {
      await parentalApi.createAllowance({
        childId: allowanceChildId,
        amount: parseFloat(allowanceAmount),
        frequency: allowanceFrequency,
        dayOfWeek: (allowanceFrequency === 'WEEKLY' || allowanceFrequency === 'BIWEEKLY') ? allowanceDayOfWeek : undefined,
        dayOfMonth: allowanceFrequency === 'MONTHLY' ? parseInt(allowanceDayOfMonth, 10) : undefined,
        targetGoalId: allowanceGoalId ? allowanceGoalId : undefined,
        note: allowanceNote
      });
      setScheduleModalOpen(false);
      fetchDashboardData();
      setAlertConfig({
        title: 'Schedule Created',
        message: 'Automated allowance schedule configured successfully! Pocket money sweeps will execute automatically.'
      });
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Schedule Failed',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to create allowance schedule.'
          : 'Failed to create allowance schedule.'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleToggleSchedule = async (id: string, currentActive: boolean) => {
    try {
      await parentalApi.updateAllowance(id, { active: !currentActive });
      fetchDashboardData();
    } catch {
      setAlertConfig({
        title: 'Update Failed',
        message: 'Could not update allowance schedule status.'
      });
    }
  };

  const handleTriggerSchedule = async (id: string) => {
    setTriggeringId(id);
    try {
      await parentalApi.triggerAllowance(id);
      fetchDashboardData();
      setAlertConfig({
        title: 'Sweep Executed',
        message: 'Scheduled allowance sweep executed immediately! Funds transferred successfully.'
      });
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Sweep Failed',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to trigger sweep. Check wallet balance.'
          : 'Failed to trigger sweep. Check wallet balance.'
      });
    } finally {
      setTriggeringId(null);
    }
  };

  const handleDeleteSchedule = (id: string) => {
    setConfirmConfig({
      title: 'Delete Allowance Schedule',
      message: 'Are you sure you want to delete this scheduled allowance? Automated pocket money transfers for this schedule will cease immediately.',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          await parentalApi.deleteAllowance(id);
          fetchDashboardData();
        } catch {
          setAlertConfig({
            title: 'Delete Failed',
            message: 'Could not delete scheduled allowance.'
          });
        }
      }
    });
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;
    setSubmittingAction(true);
    try {
      await parentalApi.setSpendingLimits(selectedChild.id, {
        parentalControlEnabled: controlsEnabled,
        parentalMaxTxnAmount: maxTxnLimit ? parseFloat(maxTxnLimit) : 0,
        parentalDailyLimit: dailyLimit ? parseFloat(dailyLimit) : 0,
        parentalWeeklyLimit: weeklyLimit ? parseFloat(weeklyLimit) : 0,
        parentalMonthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : 0,
        parentalRestrictedCategories: restrictedCats,
        parentalBlockedMerchants: blockedMerchants
      });
      setLimitsOpen(false);
      fetchDashboardData();
      setAlertConfig({
        title: 'Limits Updated',
        message: `Spending limits and merchant restrictions for ${selectedChild.fullName} have been applied successfully.`
      });
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Limit Adjust Failed',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to update spending limits.'
          : 'Failed to update spending limits.'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const openPocketMoneyModal = (child: ChildSummary) => {
    setSelectedChild(child);
    setTransferAmount('');
    setTransferDesc('Monthly pocket money');
    setTransferPaymentMethod('WALLET');
    setTransferUpiId(user?.email ? `${user.email.split('@')[0]}@fstpay` : '');
    setTransferCardNumber('');
    setTransferCardExpiry('');
    setTransferCardCvv('');
    setPocketMoneyError('');
    setPocketMoneyOpen(true);
  };

  const openLimitsModal = (child: ChildSummary) => {
    setSelectedChild(child);
    setControlsEnabled(child.parentalControlEnabled ?? true);
    setMaxTxnLimit(child.parentalMaxTxnAmount ? child.parentalMaxTxnAmount.toString() : '');
    setDailyLimit(child.parentalDailyLimit ? child.parentalDailyLimit.toString() : '');
    setWeeklyLimit(child.parentalWeeklyLimit ? child.parentalWeeklyLimit.toString() : '');
    setMonthlyLimit(child.parentalMonthlyLimit ? child.parentalMonthlyLimit.toString() : '');
    setRestrictedCats(child.parentalRestrictedCategories || '');
    setBlockedMerchants(child.parentalBlockedMerchants || '');
    setLimitsOpen(true);
  };

  const openCardCustomizeModal = async (child: ChildSummary) => {
    setCustomizeTargetChild(child);
    setUploadError('');
    setIsLoadingCard(true);
    setCustomizeCardOpen(true);
    try {
      const detailsRes = await parentalApi.getChildDetails(child.id);
      const childData = detailsRes.data?.data || detailsRes.data;
      const childCards: VirtualCard[] = childData?.cards || [];
      const firstCard = childCards.length > 0 ? childCards[0] : null;
      setCustomizeTargetCard(firstCard);
      if (firstCard) {
        const design = parseCardDesign(firstCard.cardDesign);
        setSelectedBg(design.bg);
        setCustomImage(design.customImage || '');
        setCustomImageUrlInput(design.customImage && design.customImage.startsWith('http') ? design.customImage : '');
        setDesignTab(design.customImage ? (design.customImage.startsWith('http') ? 'url' : 'upload') : 'preset');
      } else {
        setSelectedBg('obsidian');
        setCustomImage('');
        setCustomImageUrlInput('');
        setDesignTab('preset');
      }
    } catch (err) {
      console.error('Failed to fetch child card details:', err);
      setUploadError('Could not load card details for this teen.');
    } finally {
      setIsLoadingCard(false);
    }
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

  const handleSaveCardDesign = async () => {
    if (!customizeTargetChild || !customizeTargetCard) {
      setUploadError('No active virtual card found to customize.');
      return;
    }
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
      await parentalApi.updateChildCardDesign(customizeTargetChild.id, customizeTargetCard.id, {
        cardDesign: JSON.stringify({
          bg: selectedBg,
          customImage: finalImage || undefined,
        }),
      });
      setCustomizeCardOpen(false);
      setAlertConfig({
        title: 'Card Customized!',
        message: `${customizeTargetChild.fullName}'s virtual card design has been updated successfully!`
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to update card design:', err);
      setUploadError('Failed to save card design. Please try again.');
    } finally {
      setIsSavingDesign(false);
    }
  };

  const handleClaimStreak = async () => {
    setIsClaimingStreak(true);
    try {
      const res = await rewardsApi.claimStreak();
      setParentRewards(res.data?.data || res.data);
      setAlertConfig({
        title: 'Daily Streak Claimed! 🔥',
        message: 'You earned +10 XP and bonus points for keeping active supervision today!'
      });
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Streak Notice',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Daily streak already claimed today or unavailable.'
          : 'Daily streak already claimed today or unavailable.'
      });
    } finally {
      setIsClaimingStreak(false);
    }
  };

  const handleRedeemReward = async (item: RewardItem) => {
    setIsRedeemingReward(item.id);
    try {
      const res = await rewardsApi.redeemItem(item.id);
      const claimData = res.data?.data || res.data;
      setRevealedVoucher(claimData);
      const statusRes = await rewardsApi.getStatus();
      setParentRewards(statusRes.data?.data || statusRes.data);
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Redemption Failed',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Insufficient reward points to redeem this item.'
          : 'Insufficient reward points to redeem this item.'
      });
    } finally {
      setIsRedeemingReward(null);
    }
  };

  const handleRequestMonthlyStatement = async () => {
    setIsRequestingStatement(true);
    try {
      await reportsApi.requestMonthlyReport();
      setAlertConfig({
        title: 'Statement Dispatched 📧',
        message: `Your monthly statement has been generated as a PDF and dispatched to ${user?.email || 'your email'}!`
      });
    } catch (err: unknown) {
      console.error('Failed to request statement:', err);
      setAlertConfig({
        title: 'Request Failed',
        message: 'Failed to dispatch monthly statement email. Please try again later.'
      });
    } finally {
      setIsRequestingStatement(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center animate-pulse-glow shadow-glow">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-slate-500 dark:text-surface-400 text-sm animate-pulse">Loading parent workspace...</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-section">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-card flex items-center justify-center shadow-2xl shadow-primary-500/20 text-white font-bold text-2xl">
              {user?.fullName?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                Parental Dashboard
              </h1>
              <p className="text-slate-500 dark:text-surface-400 text-sm mt-0.5">Protecting and empowering your family's future</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLinkModalOpen(true)}
              variant="primary"
              size="sm"
              className="text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Link Child</span>
            </Button>
            <Link to="/parent/approvals" className="btn-glass text-sm gap-2 flex items-center">
              <Shield className="w-4 h-4" />
              Approvals Queue
              {data && data.pendingApprovalsCount > 0 && (
                <span className="bg-danger-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                  {data.pendingApprovalsCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-slide-down">
            {error}
          </div>
        )}

        {/* ── PARENT WALLET & ADD MONEY SECTION ── */}
        <div className="bg-white dark:bg-surface-900 rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-surface-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 font-bold shrink-0">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-surface-400">
                    Parent FST Wallet
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active • KYC Verified
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                    {showWalletBalance ? formatCurrency(parentBalance) : '••••••••'}
                  </span>
                  <button
                    onClick={() => setShowWalletBalance(!showWalletBalance)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
                    title={showWalletBalance ? 'Hide balance' : 'Show balance'}
                  >
                    {showWalletBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-surface-400">
                  Add funds to your wallet or send pocket money directly via UPI, Card, or Bank Transfer
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                onClick={() => setAddMoneyOpen(true)}
                variant="primary"
                size="md"
                className="text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary-500/25 px-5 py-2.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Money</span>
              </Button>
              {data && data.children.length > 0 && (
                <Button
                  onClick={() => openPocketMoneyModal(data.children[0])}
                  variant="secondary"
                  size="md"
                  className="text-xs font-bold flex items-center gap-1.5 px-4 py-2.5"
                >
                  <Send className="w-3.5 h-3.5 text-accent-500 dark:text-accent-400" />
                  <span>Send Pocket Money</span>
                </Button>
              )}
              <Button
                onClick={handleRequestMonthlyStatement}
                disabled={isRequestingStatement}
                isLoading={isRequestingStatement}
                variant="ghost"
                size="md"
                className="text-xs font-bold flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 dark:border-surface-700 text-slate-700 dark:text-surface-200"
              >
                <Mail className="w-3.5 h-3.5 text-primary-500" />
                <span>Email Monthly Statement</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards Widget Row */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Linked Children"
              value={`${data.children.length} Teens`}
              icon={Users}
              iconColor="text-blue-500 dark:text-blue-400"
            />
            <StatCard
              label="Kids Net Balance"
              value={formatCurrency(data.totalChildrenBalance)}
              icon={Wallet}
              iconColor="text-primary-500 dark:text-primary-400"
            />
            <StatCard
              label="Allowance Sent (This Month)"
              value={formatCurrency(data.totalPocketMoneySentThisMonth)}
              icon={ArrowUpRight}
              iconColor="text-accent-500 dark:text-accent-400"
            />
            <StatCard
              label="Pending Approvals"
              value={`${data.pendingApprovalsCount} Requests`}
              icon={Shield}
              iconColor="text-amber-500 dark:text-amber-400"
            />
          </div>
        )}

        {/* Kids overview list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard padding="lg" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-700/50 pb-3">
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide">
                  Linked Teen Accounts
                </h3>
                <Button
                  onClick={() => setLinkModalOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="text-xs flex items-center gap-1.5 border border-slate-300 dark:border-surface-700 text-slate-700 dark:text-surface-200"
                >
                  <UserPlus className="w-3.5 h-3.5 text-primary-500" />
                  <span>Link Account</span>
                </Button>
              </div>

              {(!data || data.children.length === 0) ? (
                <div className="text-center py-10 px-4 border border-dashed border-slate-300 dark:border-surface-700 rounded-2xl bg-slate-50/50 dark:bg-surface-900/30 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-500 mx-auto flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white text-base font-bold">No teen accounts linked yet</p>
                    <p className="text-xs text-slate-500 dark:text-surface-400 mt-1 max-w-md mx-auto">
                      Link your teen’s account to start supervising spending, setting custom daily and monthly limits, restricting specific merchants, and scheduling pocket money allowances.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button
                      onClick={() => setLinkModalOpen(true)}
                      variant="primary"
                      size="sm"
                      className="text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/20"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Link Child by Email or Phone
                    </Button>
                    {user?.email && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(user.email);
                          setCopiedParentEmail(true);
                          setTimeout(() => setCopiedParentEmail(false), 2500);
                        }}
                        type="button"
                        className="text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-700 dark:text-surface-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
                        title="Copy parent email for teen to invite you"
                      >
                        {copiedParentEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedParentEmail ? 'Copied Email!' : `Your Email: ${user.email}`}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.children.map((child) => (
                    <div key={child.id} className="p-4 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-surface-800/40 space-y-4 hover:border-primary-500/30 transition-all shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">{child.fullName}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-500/15 text-primary-700 dark:text-primary-300 border border-primary-500/30">
                              Wallet: {formatCurrency(child.walletBalance || 0)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-surface-400 mt-0.5">{child.email}</p>
                        </div>
                        <Link to={`/parent/child/${child.id}`} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-500 font-semibold flex items-center gap-1">
                          View Full Profile & Cards <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 rounded-lg bg-white dark:bg-surface-900/60 border border-slate-200/60 dark:border-surface-800/60">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-surface-400 font-medium block">LIMITS</span>
                          <span className={`text-xs font-bold mt-0.5 inline-block ${child.parentalControlEnabled ? 'text-amber-600 dark:text-warning-400' : 'text-slate-500 dark:text-surface-500'}`}>
                            {child.parentalControlEnabled ? 'Active' : 'Off'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-surface-400 font-medium block">DAILY LIMIT</span>
                          <span className="text-xs text-slate-900 dark:text-white font-semibold mt-0.5 block truncate">
                            {child.parentalDailyLimit && child.parentalDailyLimit > 0 ? `₹${child.parentalDailyLimit}` : 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-surface-400 font-medium block">MONTHLY LIMIT</span>
                          <span className="text-xs text-slate-900 dark:text-white font-semibold mt-0.5 block truncate">
                            {child.parentalMonthlyLimit && child.parentalMonthlyLimit > 0 ? `₹${child.parentalMonthlyLimit}` : 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-surface-400 font-medium block">MAX PER TRANS</span>
                          <span className="text-xs text-slate-900 dark:text-white font-semibold mt-0.5 block truncate">
                            {child.parentalMaxTxnAmount && child.parentalMaxTxnAmount > 0 ? `₹${child.parentalMaxTxnAmount}` : 'None'}
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-slate-500 dark:text-surface-400 font-medium block">BLOCKED MERCHANTS</span>
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5 block truncate" title={child.parentalBlockedMerchants || 'None'}>
                            {child.parentalBlockedMerchants || 'None'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          onClick={() => openPocketMoneyModal(child)}
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-surface-700/60 text-slate-700 dark:text-surface-200"
                        >
                          <Send className="w-3.5 h-3.5 text-accent-500 dark:text-accent-400" />
                          Send Pocket Money
                        </Button>
                        <Button
                          onClick={() => openScheduleModal(child)}
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-surface-700/60 hover:border-purple-500/40 text-slate-700 dark:text-surface-200"
                        >
                          <Repeat className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                          Schedule Allowance
                        </Button>
                        <Button
                          onClick={() => openLimitsModal(child)}
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-surface-700/60 text-slate-700 dark:text-surface-200"
                        >
                          <Shield className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
                          Adjust Limits
                        </Button>
                        <Button
                          onClick={() => openCardCustomizeModal(child)}
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-surface-700/60 hover:border-indigo-500/40 text-slate-700 dark:text-surface-200"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                          Customize Card
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Scheduled Allowances & Auto-Sweeps */}
            <GlassCard padding="lg" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-surface-700/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide">
                      Scheduled Allowances & Auto-Sweeps
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-surface-400">
                      Automated weekly/monthly pocket money transfers and savings goal auto-allocations
                    </p>
                  </div>
                </div>
                {data && data.children.length > 0 && (
                  <Button
                    onClick={() => openScheduleModal()}
                    variant="primary"
                    size="sm"
                    className="text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    New Schedule
                  </Button>
                )}
              </div>

              {allowances.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-300 dark:border-surface-700 rounded-2xl bg-slate-50/50 dark:bg-surface-900/20">
                  <Clock className="w-8 h-8 text-slate-400 dark:text-surface-500 mx-auto mb-2" />
                  <p className="text-slate-700 dark:text-surface-300 text-sm font-medium">No recurring allowances scheduled.</p>
                  <p className="text-xs text-slate-500 dark:text-surface-500 mt-1 max-w-sm mx-auto">
                    Set up automatic weekly or monthly transfers so your teen always receives their pocket money on time, or sweep it directly into their savings goals!
                  </p>
                  {data && data.children.length > 0 && (
                    <Button
                      onClick={() => openScheduleModal()}
                      variant="secondary"
                      size="sm"
                      className="mt-3 text-xs"
                    >
                      Schedule Allowance
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {allowances.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-surface-800/40 hover:border-purple-500/20 transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-sm">
                            {s.childName?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{s.childName}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.active
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-200 dark:bg-surface-700/50 text-slate-600 dark:text-surface-400'
                              }`}>
                                {s.active ? 'Active' : 'Paused'}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-surface-400">
                              {s.frequency} {s.frequency === 'MONTHLY' ? `(Day ${s.dayOfMonth})` : `(${s.dayOfWeek})`}
                              {s.note ? ` • ${s.note}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-base font-bold text-slate-900 dark:text-white">
                            ₹{s.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-surface-400 block">
                            Next: {s.nextRunDate}
                          </span>
                        </div>
                      </div>

                      {/* Destination / Auto-Sweep Target */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-surface-800/60 text-xs">
                        <div className="flex items-center gap-1.5">
                          {s.targetGoalName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[11px] font-medium border border-purple-500/20">
                              <Target className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                              Auto-Sweep to: {s.targetGoalName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-surface-400 text-[11px]">
                              <Wallet className="w-3 h-3 text-slate-400" />
                              Direct to teen wallet
                            </span>
                          )}
                          {s.lastRunDate && (
                            <span className="text-[10px] text-slate-400 dark:text-surface-500 ml-1">
                              (Last run: {s.lastRunDate})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            onClick={() => handleTriggerSchedule(s.id)}
                            disabled={triggeringId === s.id}
                            variant="ghost"
                            size="sm"
                            className="text-[11px] h-7 px-2.5 gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="Run sweep transfer now"
                          >
                            {triggeringId === s.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            Run Now
                          </Button>
                          <Button
                            onClick={() => handleToggleSchedule(s.id, s.active)}
                            variant="ghost"
                            size="sm"
                            className="text-[11px] h-7 px-2.5 gap-1 text-slate-700 dark:text-surface-300 hover:text-slate-900 dark:hover:text-white"
                          >
                            {s.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            {s.active ? 'Pause' : 'Resume'}
                          </Button>
                          <Button
                            onClick={() => handleDeleteSchedule(s.id)}
                            variant="ghost"
                            size="sm"
                            className="text-[11px] h-7 px-2 text-danger-500 dark:text-danger-400 hover:text-danger-600"
                            title="Delete schedule"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Activity Timeline / Recent Activities */}
            {data && data.activityTimeline.length > 0 && (
              <GlassCard padding="lg">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-surface-700/50 pb-3 mb-4">
                  <Activity className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                  <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide">
                    Recent Activities
                  </h3>
                </div>
                <div className="relative border-l border-slate-200 dark:border-surface-700 ml-3 pl-5 space-y-5">
                  {data.activityTimeline.map((event, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[26px] top-0 bg-white dark:bg-surface-900 border border-slate-300 dark:border-surface-700 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400" />
                      </span>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500 dark:text-surface-400 font-bold uppercase tracking-wider">{event.type}</span>
                          <span className="text-[10px] text-slate-400 dark:text-surface-500 font-medium">
                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-900 dark:text-white font-medium mt-1">{event.title}</p>
                        <p className="text-xs text-slate-500 dark:text-surface-400 mt-0.5">
                          {event.childName} · {event.description}
                        </p>
                        {event.amount && event.amount > 0 && (
                          <p className="text-xs text-accent-600 dark:text-accent-400 font-bold mt-1">₹{event.amount.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          {/* Right Panel: Pending Approvals & Goals Status */}
          <div className="space-y-6">
            {/* Action Required Quick Approvals */}
            <GlassCard padding="lg" className="space-y-4">
              <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide border-b border-slate-200 dark:border-surface-700/50 pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500 dark:text-warning-400" />
                <span>Action Required</span>
              </h3>

              {(!data || data.pendingApprovalsCount === 0) ? (
                <p className="text-slate-500 dark:text-surface-500 text-xs text-center py-6">All clear! No pending approval requests.</p>
              ) : (
                <div className="space-y-3">
                  {data.activityTimeline
                    .filter(e => e.type === 'APPROVAL_REQUEST')
                    .slice(0, 3)
                    .map((req, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-surface-800/40 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-primary-600 dark:text-primary-300 font-bold">{req.childName}</span>
                          <span className="text-slate-600 dark:text-surface-400 font-medium">₹{req.amount}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-surface-400">{req.description}</p>
                        <Link to="/parent/approvals" className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline block text-right font-medium">
                          Go resolve request →
                        </Link>
                      </div>
                    ))}
                </div>
              )}
            </GlassCard>

            {/* Real Dynamic Goals Status Widget */}
            <GlassCard padding="lg" className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-surface-700/50 pb-3">
                <Target className="w-5 h-5 text-accent-500 dark:text-accent-400" />
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide">
                  Teen Goals Status
                </h3>
              </div>
              
              {childGoalsList.length === 0 ? (
                <div className="text-center py-6">
                  <Target className="w-8 h-8 text-slate-400 dark:text-surface-500 mx-auto mb-2 opacity-50" />
                  <p className="text-slate-600 dark:text-surface-400 text-xs font-medium">No active savings goals found.</p>
                  <p className="text-[11px] text-slate-400 dark:text-surface-500 mt-1 max-w-xs mx-auto">
                    When your linked teens create savings goals, their real progress will be displayed here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {childGoalsList.map((goal) => {
                    const percentage = Math.min(100, Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100));
                    return (
                      <div key={goal.id} className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-surface-900/40 border border-slate-200/60 dark:border-surface-800/60">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{goal.icon || '🎯'}</span>
                            <span className="truncate max-w-[150px]">{goal.name}</span>
                          </span>
                          <span className="text-accent-600 dark:text-accent-400 font-mono font-bold">
                            ₹{goal.currentAmount?.toLocaleString()} / ₹{goal.targetAmount?.toLocaleString()} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-surface-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-accent-500 to-teal-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-surface-500">Owner: {goal.childName}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* ── PARENT REWARDS & LEVEL UP ── */}
            <GlassCard padding="lg" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-700/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
                      Guardian Rewards & Perks
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-surface-400">
                      Earn bonus points for active financial parenting
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleClaimStreak}
                  disabled={isClaimingStreak}
                  isLoading={isClaimingStreak}
                  variant="primary"
                  size="sm"
                  className="text-xs px-2.5 py-1 flex items-center gap-1 shadow-sm shadow-amber-500/20"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-200" />
                  <span>Claim Streak</span>
                </Button>
              </div>

              {/* Points & Level Bar */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-primary-500/10 border border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Level {parentRewards?.level ?? 1} Guardian Club
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-400">
                    {parentRewards?.points ?? 0} Points
                  </span>
                </div>

                {/* Progress bar to next boundary */}
                {(() => {
                  const xp = parentRewards?.xp ?? 0;
                  const cur = parentRewards?.currentLevelXpBoundary ?? 0;
                  const nxt = parentRewards?.nextLevelXpBoundary ?? 100;
                  const pct = Math.max(0, Math.min(100, Math.round(((xp - cur) / (nxt - cur || 1)) * 100)));
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-surface-400">
                        <span>{xp} XP</span>
                        <span>{nxt} XP for Level {(parentRewards?.level ?? 1) + 1}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-surface-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-primary-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-surface-400 pt-0.5">
                  <span>Daily Streak: <strong className="text-amber-600 dark:text-amber-400 font-bold">{parentRewards?.streakDays ?? 0} Days 🔥</strong></span>
                  <span>Keep streak active!</span>
                </div>
              </div>

              {/* Eligible Rewards Catalog */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Eligible Parent Vouchers & Perks
                </span>

                {rewardsCatalog.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3">No perks currently listed in catalog.</p>
                ) : (
                  <div className="space-y-2">
                    {rewardsCatalog.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-800/40 border border-slate-200/60 dark:border-surface-700/50 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-surface-400 truncate">
                            {item.description} • <strong className="text-primary-600 dark:text-primary-400 font-mono">{item.costPoints} pts</strong>
                          </p>
                        </div>
                        <Button
                          onClick={() => handleRedeemReward(item)}
                          disabled={isRedeemingReward === item.id || (parentRewards?.points ?? 0) < item.costPoints}
                          isLoading={isRedeemingReward === item.id}
                          variant="secondary"
                          size="sm"
                          className="text-[11px] px-2.5 py-1 shrink-0"
                        >
                          Redeem
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Notifications feed */}
            {data && (data.recentNotifications?.length ?? 0) > 0 && (
              <GlassCard padding="lg">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-surface-700/50 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                    <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-wide">
                      Alerts History
                    </h3>
                  </div>
                  <button
                    onClick={async () => {
                      await parentalApi.markNotificationsAsRead();
                      fetchDashboardData();
                    }}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2.5">
                  {data.recentNotifications.slice(0, 6).map((noti) => (
                    <div
                      key={noti.id}
                      onClick={() => setSelectedAlert(noti)}
                      role="button"
                      tabIndex={0}
                      className={`p-3 rounded-xl flex gap-3 text-xs border cursor-pointer transition-all hover:border-primary-500/50 hover:shadow-sm ${
                        noti.isRead
                          ? 'border-slate-200/80 dark:border-white/5 bg-slate-50/60 dark:bg-surface-900/30'
                          : 'border-primary-500/30 bg-primary-50/50 dark:bg-primary-500/10'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        <div className="w-6 h-6 rounded-lg bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-400">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{noti.title}</p>
                          <span className="text-[10px] text-slate-500 dark:text-surface-400 shrink-0 font-medium">
                            {new Date(noti.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-surface-300 mt-0.5 line-clamp-2 leading-relaxed">{noti.message}</p>
                        <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-200/60 dark:border-surface-800/60 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-surface-800 text-slate-700 dark:text-surface-300 font-medium truncate max-w-[120px]">
                            {noti.childName || 'Family'}
                          </span>
                          <span className="text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-0.5">
                            Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Link Child Account Modal */}
        <Modal
          isOpen={linkModalOpen}
          onClose={() => setLinkModalOpen(false)}
          title="Link Teen Account"
        >
          <form onSubmit={handleLinkChild} className="space-y-4">
            <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-start gap-3">
              <Users className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-surface-300 leading-relaxed">
                Enter your teenager's registered email address or phone number to establish parental supervision, approve card purchases, and manage allowances.
              </p>
            </div>

            <div>
              <label htmlFor="childIdentifier" className="input-label">Teen's Email or Phone Number</label>
              <input
                id="childIdentifier"
                type="text"
                required
                value={linkIdentifier}
                onChange={(e) => setLinkIdentifier(e.target.value)}
                placeholder="e.g. teen@example.com or +919876543210"
                className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="childRelationship" className="input-label">Relationship</label>
              <select
                id="childRelationship"
                value={linkRelationship}
                onChange={(e) => setLinkRelationship(e.target.value)}
                className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-slate-900 dark:text-white"
              >
                <option value="CHILD">Child</option>
                <option value="SON">Son</option>
                <option value="DAUGHTER">Daughter</option>
                <option value="WARD">Ward</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={isLinking || !linkIdentifier.trim()}
              variant="primary"
              className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-primary-500/20"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Linking Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Link Teen Account</span>
                </>
              )}
            </Button>
          </form>
        </Modal>

        {/* ADD MONEY MODAL FOR PARENT */}
        <AddMoneyModal
          isOpen={addMoneyOpen}
          onClose={() => setAddMoneyOpen(false)}
          onSuccess={() => {
            fetchDashboardData();
            setAlertConfig({
              title: 'Money Added',
              message: 'Funds successfully credited to your parent FST Pay wallet!'
            });
          }}
          currentBalance={parentBalance}
        />

        {/* Send Pocket Money Modal with Multi-Payment Options */}
        <Modal
          isOpen={pocketMoneyOpen && selectedChild !== null}
          onClose={() => {
            setPocketMoneyOpen(false);
            setPocketMoneyError('');
          }}
          title="Send Pocket Money to Teen"
        >
          {selectedChild && (
            <form onSubmit={handleSendPocketMoney} className="space-y-4">
              {pocketMoneyError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-danger-500/10 dark:border-danger-500/20 text-xs text-rose-600 dark:text-danger-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pocketMoneyError}</span>
                </div>
              )}

              {/* Recipient info */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-800/50 border border-slate-200/80 dark:border-surface-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-surface-400 block">Recipient Teen</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{selectedChild.fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-surface-400">{selectedChild.email}</p>
                </div>
                {data && data.children.length > 1 && (
                  <select
                    value={selectedChild.id}
                    onChange={(e) => {
                      const found = data.children.find(c => c.id === e.target.value);
                      if (found) setSelectedChild(found);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                  >
                    {data.children.map(c => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount input */}
              <div>
                <label htmlFor="pocketMoneyAmt" className="input-label">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-500 dark:text-surface-400">₹</span>
                  <input
                    id="pocketMoneyAmt"
                    type="number"
                    step="any"
                    value={transferAmount}
                    onChange={(e) => {
                      setTransferAmount(e.target.value);
                      setPocketMoneyError('');
                    }}
                    placeholder="250.00"
                    required
                    min={1}
                    max={100000}
                    className="input-field pl-9 text-xl font-bold py-2.5 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[100, 250, 500, 1000, 2000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setTransferAmount(val.toString());
                        setPocketMoneyError('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        transferAmount === val.toString()
                          ? 'bg-primary-500 text-white font-bold shadow-xs'
                          : 'bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-surface-300 hover:bg-slate-200 dark:hover:bg-surface-700 border border-slate-200 dark:border-surface-700'
                      }`}
                    >
                      +₹{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="input-label mb-0">Payment Method</label>
                  {transferPaymentMethod === 'WALLET' && (
                    <span className="text-[11px] text-slate-500 dark:text-surface-400">
                      Balance: <strong className="text-primary-600 dark:text-primary-400">{formatCurrency(parentBalance)}</strong>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'WALLET', label: 'FST Wallet', icon: Wallet },
                    { id: 'UPI', label: 'UPI Fast', icon: QrCode },
                    { id: 'CARD', label: 'Debit/Credit', icon: CreditCard },
                    { id: 'BANK_TRANSFER', label: 'Net Banking', icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = transferPaymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setTransferPaymentMethod(m.id as any);
                          setPocketMoneyError('');
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-950/30 dark:border-primary-500 dark:text-primary-400 font-bold shadow-xs'
                            : 'border-slate-200 dark:border-surface-700/60 bg-white dark:bg-surface-800 hover:bg-slate-50 dark:hover:bg-surface-750 text-slate-700 dark:text-surface-400 font-medium'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] truncate w-full">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Method Details */}
              {transferPaymentMethod === 'WALLET' && (
                <div className="p-3 rounded-xl bg-primary-50/60 dark:bg-primary-950/20 border border-primary-200/60 dark:border-primary-800/40 text-xs text-slate-700 dark:text-surface-300 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Pay using Parent FST Balance</p>
                    <p className="text-[11px] text-slate-500 dark:text-surface-400">Available: {formatCurrency(parentBalance)}</p>
                  </div>
                  {parentBalance < (parseFloat(transferAmount) || 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPocketMoneyOpen(false);
                        setAddMoneyOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-primary-500 text-white font-bold text-xs hover:bg-primary-600 shadow-xs"
                    >
                      + Add Money
                    </button>
                  )}
                </div>
              )}

              {transferPaymentMethod === 'UPI' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-surface-700/60 space-y-2 animate-fade-in">
                  <label htmlFor="pocketMoneyUpi" className="block text-xs font-semibold text-slate-700 dark:text-surface-300">
                    Your UPI ID / VPA
                  </label>
                  <input
                    id="pocketMoneyUpi"
                    type="text"
                    value={transferUpiId}
                    onChange={(e) => setTransferUpiId(e.target.value)}
                    placeholder="parent@okhdfcbank or 9876543210@upi"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-surface-400">
                    Funds will be authorized via your UPI provider and transferred straight to {selectedChild.fullName}.
                  </p>
                </div>
              )}

              {transferPaymentMethod === 'CARD' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-surface-700/60 space-y-2.5 animate-fade-in">
                  <div>
                    <label htmlFor="pocketMoneyCardNo" className="block text-xs font-semibold text-slate-700 dark:text-surface-300 mb-1">
                      Card Number
                    </label>
                    <input
                      id="pocketMoneyCardNo"
                      type="text"
                      value={transferCardNumber}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 16);
                        const parts = clean.match(/.{1,4}/g);
                        setTransferCardNumber(parts ? parts.join(' ') : clean);
                      }}
                      placeholder="4111 2222 3333 4444"
                      maxLength={19}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 text-xs font-mono font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-500 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="pocketMoneyExpiry" className="block text-xs font-semibold text-slate-700 dark:text-surface-300 mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        id="pocketMoneyExpiry"
                        type="text"
                        value={transferCardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^0-9/]/g, '').slice(0, 5);
                          if (val.length === 2 && !val.includes('/')) val += '/';
                          setTransferCardExpiry(val);
                        }}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 text-xs font-mono text-center font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-500 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="pocketMoneyCvv" className="block text-xs font-semibold text-slate-700 dark:text-surface-300 mb-1">
                        CVV
                      </label>
                      <input
                        id="pocketMoneyCvv"
                        type="password"
                        value={transferCardCvv}
                        onChange={(e) => setTransferCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="•••"
                        maxLength={3}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 text-xs font-mono text-center font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-500 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {transferPaymentMethod === 'BANK_TRANSFER' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-800/40 border border-slate-200 dark:border-surface-700/60 space-y-2 animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-surface-300">
                    Select Bank
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'sbi', name: 'SBI' },
                      { id: 'hdfc', name: 'HDFC Bank' },
                      { id: 'icici', name: 'ICICI Bank' },
                      { id: 'axis', name: 'Axis Bank' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setTransferBank(b.id)}
                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          transferBank === b.id
                            ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-500 text-primary-700 dark:text-primary-400 shadow-xs'
                            : 'bg-white dark:bg-surface-900 border-slate-200 dark:border-surface-700 text-slate-700 dark:text-surface-300'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 text-primary-500" />
                        <span className="truncate">{b.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Note input */}
              <div>
                <label htmlFor="pocketMoneyDesc" className="input-label">Transfer Note</label>
                <input
                  id="pocketMoneyDesc"
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Weekly pocket money, snacks, books..."
                  required
                  className="input-field py-2 text-xs focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <Button
                type="submit"
                disabled={submittingAction || !transferAmount || parseFloat(transferAmount) <= 0}
                variant="primary"
                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-primary-500/25"
              >
                {submittingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Transfer...</span>
                  </>
                ) : (
                  <>
                    <span>
                      Send {transferAmount && parseFloat(transferAmount) > 0 ? formatCurrency(parseFloat(transferAmount)) : 'Pocket Money'}
                    </span>
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </Modal>

        {/* Spending Limits Modal */}
        <Modal
          isOpen={limitsOpen && selectedChild !== null}
          onClose={() => setLimitsOpen(false)}
          title="Adjust Spending Limits & Merchant Rules"
        >
          {selectedChild && (
            <form onSubmit={handleSaveLimits} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-surface-900/60 border border-slate-200/80 dark:border-white/5">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Parental Controls</p>
                  <p className="text-xs text-slate-500 dark:text-surface-400">Enable spending limit and merchant restriction rules</p>
                </div>
                <button
                  type="button"
                  onClick={() => setControlsEnabled(!controlsEnabled)}
                  className="text-primary-500 dark:text-primary-400"
                >
                  {controlsEnabled ? <ToggleRight className="w-12 h-8" /> : <ToggleLeft className="w-12 h-8 text-slate-400 dark:text-surface-600" />}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxTxLimit" className="input-label">Per-Transaction Limit (₹)</label>
                  <input
                    id="maxTxLimit"
                    type="number"
                    value={maxTxnLimit}
                    onChange={(e) => setMaxTxnLimit(e.target.value)}
                    placeholder="Enter limit amount"
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="dayLimit" className="input-label">Daily Limit (₹)</label>
                  <input
                    id="dayLimit"
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="Enter daily limit"
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="weekLimit" className="input-label">Weekly Limit (₹)</label>
                  <input
                    id="weekLimit"
                    type="number"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(e.target.value)}
                    placeholder="Enter weekly limit"
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="monthLimit" className="input-label">Monthly Limit (₹)</label>
                  <input
                    id="monthLimit"
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="Enter monthly limit"
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="restrictedCats" className="input-label">Restricted Categories (Comma Separated)</label>
                <input
                  id="restrictedCats"
                  type="text"
                  value={restrictedCats}
                  onChange={(e) => setRestrictedCats(e.target.value)}
                  placeholder="GAMING, ENTERTAINMENT, LIQUOR"
                  className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="blockedMerchantsInput" className="input-label flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-rose-500" />
                  <span>Merchant Blocklist (Keywords, Comma Separated)</span>
                </label>
                <input
                  id="blockedMerchantsInput"
                  type="text"
                  value={blockedMerchants}
                  onChange={(e) => setBlockedMerchants(e.target.value)}
                  placeholder="STEAM, ROBLOX, CASINO, DREAM11, POKER"
                  className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-surface-400 mt-1">
                  Card transactions matching any of these keywords will be rejected or held for parental approval.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submittingAction}
                variant="primary"
                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold"
              >
                {submittingAction ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Save Spending Limits & Blocklist
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </Modal>

        {/* Schedule Allowance Modal */}
        <Modal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          title="Schedule Recurring Allowance"
        >
          <form onSubmit={handleCreateSchedule} className="space-y-4">
            {data && data.children.length > 1 && (
              <div>
                <label className="input-label">Select Teen</label>
                <select
                  value={allowanceChildId}
                  onChange={(e) => handleChildSelectForSchedule(e.target.value)}
                  className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-slate-900 dark:text-white"
                >
                  {data.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.fullName} ({child.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="allowAmount" className="input-label">Allowance Amount (₹)</label>
              <input
                id="allowAmount"
                type="number"
                step="0.01"
                min="1"
                required
                value={allowanceAmount}
                onChange={(e) => setAllowanceAmount(e.target.value)}
                placeholder="250.00"
                className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Frequency</label>
                <select
                  value={allowanceFrequency}
                  onChange={(e) => setAllowanceFrequency(e.target.value as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY')}
                  className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-slate-900 dark:text-white"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-Weekly (Every 2 Weeks)</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              {allowanceFrequency === 'MONTHLY' ? (
                <div>
                  <label className="input-label">Day of Month</label>
                  <select
                    value={allowanceDayOfMonth}
                    onChange={(e) => setAllowanceDayOfMonth(e.target.value)}
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-slate-900 dark:text-white"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="input-label">Day of Week</label>
                  <select
                    value={allowanceDayOfWeek}
                    onChange={(e) => setAllowanceDayOfWeek(e.target.value)}
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-slate-900 dark:text-white"
                  >
                    <option value="MONDAY">Monday</option>
                    <option value="TUESDAY">Tuesday</option>
                    <option value="WEDNESDAY">Wednesday</option>
                    <option value="THURSDAY">Thursday</option>
                    <option value="FRIDAY">Friday</option>
                    <option value="SATURDAY">Saturday</option>
                    <option value="SUNDAY">Sunday</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="input-label flex items-center justify-between">
                <span>Direct Auto-Sweep to Goal (Optional)</span>
                {modalChildGoals.length > 0 && (
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                    {modalChildGoals.length} Active Goals
                  </span>
                )}
              </label>
              <select
                value={allowanceGoalId}
                onChange={(e) => setAllowanceGoalId(e.target.value)}
                className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-surface-900 text-slate-900 dark:text-white"
              >
                <option value="">Direct to Teen's Wallet (Default)</option>
                {modalChildGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    🎯 Auto-Sweep into: {g.name} (₹{g.currentAmount} / ₹{g.targetAmount})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-surface-400 mt-1">
                When selected, the allowance will automatically be swept from the teen's wallet directly into this savings goal!
              </p>
            </div>

            <div>
              <label htmlFor="allowNote" className="input-label">Note / Description</label>
              <input
                id="allowNote"
                type="text"
                value={allowanceNote}
                onChange={(e) => setAllowanceNote(e.target.value)}
                placeholder="e.g., Weekly pocket money, Book allowance"
                className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <Button
              type="submit"
              disabled={submittingAction}
              variant="primary"
              className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-purple-500/25"
            >
              {submittingAction ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Repeat className="w-4 h-4" />
                  Confirm Allowance Schedule
                </>
              )}
            </Button>
          </form>
        </Modal>

        {/* ALERT DETAILS MODAL */}
        <Modal
          isOpen={selectedAlert !== null}
          onClose={() => setSelectedAlert(null)}
          title="Alert Details"
        >
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-surface-700">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedAlert.type?.includes('SECURITY')
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                      : selectedAlert.type?.includes('APPROVAL')
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-primary-500/15 text-primary-700 dark:text-primary-400 border border-primary-500/30'
                  }`}>
                    {selectedAlert.type || 'NOTIFICATION'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    selectedAlert.isRead
                      ? 'bg-slate-200 dark:bg-surface-800 text-slate-600 dark:text-surface-400'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {selectedAlert.isRead ? 'Read' : 'New'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-surface-400">
                  {new Date(selectedAlert.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">{selectedAlert.title}</h4>
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-surface-900/60 border border-slate-200/80 dark:border-surface-800 text-sm text-slate-700 dark:text-surface-200 leading-relaxed whitespace-pre-wrap">
                  {selectedAlert.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-surface-800 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-surface-800/50">
                  <span className="text-[10px] text-slate-500 dark:text-surface-400 uppercase font-semibold block">Child / Account</span>
                  <span className="text-slate-900 dark:text-white font-medium mt-0.5 block truncate">
                    {selectedAlert.childName || 'Family Account'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-surface-800/50">
                  <span className="text-[10px] text-slate-500 dark:text-surface-400 uppercase font-semibold block">Status</span>
                  <span className="text-slate-900 dark:text-white font-medium mt-0.5 block">
                    {selectedAlert.status || (selectedAlert.isRead ? 'Acknowledged' : 'Pending Review')}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setSelectedAlert(null)}
                  variant="primary"
                  size="sm"
                  className="px-5 text-xs font-semibold"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
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
          <div className="space-y-4" aria-live="polite">
            <div className="flex items-start gap-3 p-1">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 dark:text-surface-200">{confirmConfig?.message}</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setConfirmConfig(null)} variant="ghost" size="sm" className="border border-slate-200 dark:border-surface-700 text-slate-700 dark:text-white">
                Cancel
              </Button>
              <Button onClick={confirmConfig?.onConfirm || (() => {})} variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-500 font-bold">
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        {/* CARD CUSTOMIZATION MODAL */}
        <Modal
          isOpen={customizeCardOpen}
          onClose={() => {
            setCustomizeCardOpen(false);
            setUploadError('');
          }}
          title={`Customize ${customizeTargetChild?.fullName || 'Teen'}'s Card`}
        >
          <div className="space-y-4">
            {uploadError && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-600 dark:text-danger-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Live Virtual Card Preview with Legibility Overlay */}
            <div className="relative w-full aspect-[1.586/1] rounded-2xl p-5 text-white shadow-xl overflow-hidden flex flex-col justify-between select-none">
              {/* Card Background */}
              {customImage ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${customImage})` }}
                >
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]" />
                </div>
              ) : (
                <div className={`absolute inset-0 ${cardBgPresets.find(b => b.id === selectedBg)?.class || 'bg-slate-900'}`} />
              )}

              {/* Decorative Glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />

              {/* Card Header: Chip & Brand */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-400 to-amber-200 shadow-inner flex items-center justify-center opacity-90">
                  <div className="w-7 h-5 border border-amber-600/40 rounded-sm grid grid-cols-2 gap-0.5 p-0.5">
                    <div className="border border-amber-600/40 rounded-[1px]" />
                    <div className="border border-amber-600/40 rounded-[1px]" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black tracking-wider uppercase drop-shadow-md">FST Pay</span>
                  <span className="block text-[8px] tracking-widest text-slate-300 uppercase">Teen Smart Card</span>
                </div>
              </div>

              {/* Card Number & Expiry */}
              <div className="relative z-10 space-y-1">
                <p className="font-mono text-base tracking-[0.2em] font-semibold text-shadow drop-shadow-md">
                  {customizeTargetCard?.cardNumber || '•••• •••• •••• 4242'}
                </p>
                <div className="flex items-center gap-4 text-[10px] text-slate-300">
                  <span>VALID THRU: <strong className="text-white font-mono">{customizeTargetCard ? `${customizeTargetCard.expiryMonth}/${String(customizeTargetCard.expiryYear).slice(-2)}` : '12/28'}</strong></span>
                </div>
              </div>

              {/* Cardholder Name & Brand Badge */}
              <div className="relative z-10 flex items-center justify-between pt-1">
                <span className="text-xs font-bold tracking-wider uppercase truncate max-w-[180px] drop-shadow-md">
                  {customizeTargetChild?.fullName || 'TEEN MEMBER'}
                </span>
                <div className="flex -space-x-2 opacity-80">
                  <div className="w-5 h-5 rounded-full bg-rose-500" />
                  <div className="w-5 h-5 rounded-full bg-amber-400" />
                </div>
              </div>
            </div>

            {/* Customization Tabs: Presets / Device Upload / URL Link */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-surface-800 rounded-xl">
              <button
                type="button"
                onClick={() => setDesignTab('preset')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  designTab === 'preset'
                    ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-surface-400 hover:text-slate-900'
                }`}
              >
                Color Presets
              </button>
              <button
                type="button"
                onClick={() => setDesignTab('upload')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  designTab === 'upload'
                    ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-surface-400 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3 h-3" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setDesignTab('url')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  designTab === 'url'
                    ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-surface-400 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-3 h-3" />
                Image URL
              </button>
            </div>

            {/* Preset Color Choices */}
            {designTab === 'preset' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-surface-300">
                  Select Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {cardBgPresets.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedBg(opt.id);
                        setCustomImage('');
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        selectedBg === opt.id && !customImage
                          ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/40 dark:bg-surface-800'
                          : 'border-slate-200 dark:border-surface-700 hover:border-slate-300'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full ${opt.class} shrink-0 border border-white/20`} />
                      <span className="text-xs font-medium text-slate-800 dark:text-surface-200 truncate">
                        {opt.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Image From Device */}
            {designTab === 'upload' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-surface-300">
                  Upload Card Artwork (Max 2MB)
                </label>
                <label className="border-2 border-dashed border-slate-300 dark:border-surface-700 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary-500 hover:bg-slate-50/50 dark:hover:bg-surface-800/50 transition-all text-center">
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                  <div>
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">Click to choose image file</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP, or SVG under 2MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </label>
                {customImage && (
                  <button
                    type="button"
                    onClick={() => setCustomImage('')}
                    className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                  >
                    <span>Remove uploaded image & revert to preset</span>
                  </button>
                )}
              </div>
            )}

            {/* Add Image using URL/Link */}
            {designTab === 'url' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-surface-300">
                  Image Web Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customImageUrlInput}
                    onChange={(e) => setCustomImageUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="input-field py-2 text-xs flex-1 focus:ring-2 focus:ring-primary-500"
                  />
                  <Button
                    type="button"
                    onClick={handleApplyImageUrl}
                    variant="secondary"
                    size="sm"
                    className="text-xs shrink-0 px-3"
                  >
                    Load
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Provide a direct HTTP/HTTPS link to an image (Unsplash, Imgur, CDN, etc.).
                </p>
                {customImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomImage('');
                      setCustomImageUrlInput('');
                    }}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Clear URL image & revert to preset
                  </button>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-200 dark:border-surface-800">
              <Button
                type="button"
                onClick={() => setCustomizeCardOpen(false)}
                variant="secondary"
                size="md"
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveCardDesign}
                disabled={isSavingDesign || isLoadingCard}
                isLoading={isSavingDesign}
                variant="primary"
                size="md"
                className="flex-1 text-xs"
              >
                Save & Apply Design
              </Button>
            </div>
          </div>
        </Modal>

        {/* REVEALED VOUCHER MODAL */}
        <Modal
          isOpen={revealedVoucher !== null}
          onClose={() => {
            setRevealedVoucher(null);
            setCopiedVoucherCode(false);
          }}
          title="Reward Claimed!"
        >
          {revealedVoucher && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center">
                <Gift className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {revealedVoucher.title || 'Guardian Perk Voucher'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-surface-400 mt-1">
                  Your reward code is ready to use! Copy the code below to redeem.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-surface-800 border border-dashed border-slate-300 dark:border-surface-700 flex items-center justify-between gap-3">
                <span className="font-mono text-base font-black tracking-widest text-primary-600 dark:text-primary-400 truncate">
                  {revealedVoucher.codeClaimed}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(revealedVoucher.codeClaimed);
                    setCopiedVoucherCode(true);
                    setTimeout(() => setCopiedVoucherCode(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-colors flex items-center gap-1 shrink-0"
                >
                  {copiedVoucherCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedVoucherCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => {
                    setRevealedVoucher(null);
                    setCopiedVoucherCode(false);
                  }}
                  variant="primary"
                  className="w-full text-xs font-bold"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
}
