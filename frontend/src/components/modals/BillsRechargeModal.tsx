import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Smartphone,
  Zap,
  Wifi,
  Tv,
  Flame,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Download,
  ReceiptText,
  X,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { transactionApi } from '../../api/endpoints';
import { formatCurrency } from '../../utils/helpers';
import { downloadReceiptJpg } from '../../utils/receiptGenerator';
import type { Transaction } from '../../types';

export type BillCategory = 'MOBILE' | 'ELECTRICITY' | 'BROADBAND' | 'DTH' | 'WATER_GAS';

interface BillsRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentBalance: number;
  initialCategory?: BillCategory;
}

const OPERATORS = [
  { id: 'jio', name: 'Reliance Jio', icon: '📶' },
  { id: 'airtel', name: 'Bharti Airtel', icon: '🔴' },
  { id: 'vi', name: 'Vodafone Idea (Vi)', icon: '🟡' },
  { id: 'bsnl', name: 'BSNL Mobile', icon: '🟢' },
];

const POPULAR_MOBILE_PLANS = [
  { amount: 199, validity: '28 Days', data: '1.5 GB/day', desc: 'Unlimited Calls + 100 SMS/day' },
  { amount: 299, validity: '28 Days', data: '2.0 GB/day', desc: 'Hero Unlimited + Disney+ Hotstar Mobile' },
  { amount: 479, validity: '56 Days', data: '1.5 GB/day', desc: 'Unlimited Calls + High Speed Data' },
  { amount: 719, validity: '84 Days', data: '1.5 GB/day', desc: 'Best Value Quarter Pack + Free Roaming' },
  { amount: 2999, validity: '365 Days', data: '2.5 GB/day', desc: 'Annual Super Saver Pack' },
];

const ELECTRICITY_BOARDS = [
  { id: 'bses_rajdhani', name: 'BSES Rajdhani Power Limited (Delhi)' },
  { id: 'bses_yamuna', name: 'BSES Yamuna Power Limited (Delhi)' },
  { id: 'tata_mumbai', name: 'Tata Power (Mumbai)' },
  { id: 'adani_mumbai', name: 'Adani Electricity (Mumbai)' },
  { id: 'bescom', name: 'BESCOM (Bangalore)' },
  { id: 'mseb', name: 'MSEDCL (Maharashtra)' },
  { id: 'tneb', name: 'TANGEDCO (Tamil Nadu)' },
  { id: 'uppcl', name: 'UPPCL (Uttar Pradesh)' },
];

const BROADBAND_PROVIDERS = [
  { id: 'jiofiber', name: 'JioFiber Broadband' },
  { id: 'airtel_xstream', name: 'Airtel Xstream Fiber' },
  { id: 'act_fibernet', name: 'ACT Fibernet' },
  { id: 'tata_play_fiber', name: 'Tata Play Fiber' },
  { id: 'hathway', name: 'Hathway Broadband' },
];

const DTH_OPERATORS = [
  { id: 'tata_play', name: 'Tata Play (formerly Tata Sky)' },
  { id: 'airtel_dth', name: 'Airtel Digital TV' },
  { id: 'dish_tv', name: 'Dish TV India' },
  { id: 'sun_direct', name: 'Sun Direct' },
  { id: 'd2h', name: 'Videocon d2h' },
];

const UTILITY_PROVIDERS = [
  { id: 'igl', name: 'Indraprastha Gas Limited (IGL)' },
  { id: 'mgl', name: 'Mahanagar Gas Limited (MGL)' },
  { id: 'delhi_jal', name: 'Delhi Jal Board (Water)' },
  { id: 'bwssb', name: 'Bangalore Water Supply (BWSSB)' },
  { id: 'hp_gas', name: 'HP Gas (LPG Cylinder)' },
  { id: 'indane', name: 'Indane Gas (Indian Oil)' },
];

export default function BillsRechargeModal({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
  initialCategory = 'MOBILE',
}: BillsRechargeModalProps) {
  const [activeCategory, setActiveCategory] = useState<BillCategory>(initialCategory);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');

  // Input states
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedOperator, setSelectedOperator] = useState(OPERATORS[0].name);
  const [selectedBoard, setSelectedBoard] = useState(ELECTRICITY_BOARDS[0].name);
  const [selectedBroadband, setSelectedBroadband] = useState(BROADBAND_PROVIDERS[0].name);
  const [selectedDth, setSelectedDth] = useState(DTH_OPERATORS[0].name);
  const [selectedUtility, setSelectedUtility] = useState(UTILITY_PROVIDERS[0].name);
  const [consumerNumber, setConsumerNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPlanDesc, setSelectedPlanDesc] = useState('');

  // Execution states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedTxn, setConfirmedTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
      setStep('input');
      setError('');
      setAmount('');
      setConsumerNumber('');
      setMobileNumber('');
      setSelectedPlanDesc('');
      setConfirmedTxn(null);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const getProviderName = () => {
    switch (activeCategory) {
      case 'MOBILE':
        return selectedOperator;
      case 'ELECTRICITY':
        return selectedBoard;
      case 'BROADBAND':
        return selectedBroadband;
      case 'DTH':
        return selectedDth;
      case 'WATER_GAS':
        return selectedUtility;
    }
  };

  const getAccountIdentifier = () => {
    return activeCategory === 'MOBILE' ? mobileNumber : consumerNumber;
  };

  const getCategoryTitle = () => {
    switch (activeCategory) {
      case 'MOBILE':
        return 'Mobile Prepaid & Postpaid Recharge';
      case 'ELECTRICITY':
        return 'Electricity Bill Payment';
      case 'BROADBAND':
        return 'Broadband & Fiber Wi-Fi';
      case 'DTH':
        return 'DTH & Cable TV Recharge';
      case 'WATER_GAS':
        return 'Water, Gas & Utility Bill';
    }
  };

  const handleSelectPlan = (plan: typeof POPULAR_MOBILE_PLANS[0]) => {
    setAmount(plan.amount.toString());
    setSelectedPlanDesc(`${plan.validity} • ${plan.data} (${plan.desc})`);
    setError('');
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (parsedAmount > currentBalance) {
      setError(`Insufficient balance. You have ${formatCurrency(currentBalance)} available in your wallet.`);
      return;
    }

    if (activeCategory === 'MOBILE') {
      const cleanPhone = mobileNumber.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    } else {
      if (!consumerNumber.trim()) {
        setError('Please enter your Consumer ID / Account Number.');
        return;
      }
    }

    setStep('confirm');
  };

  const handleExecutePayment = async () => {
    setIsSubmitting(true);
    setError('');

    const parsedAmount = parseFloat(amount);
    const provider = getProviderName();
    const identifier = getAccountIdentifier();
    const desc = activeCategory === 'MOBILE'
      ? `Mobile Recharge for +91 ${identifier} (${provider})`
      : `${getCategoryTitle()} for Acc #${identifier} (${provider})`;

    try {
      const res = await transactionApi.simulateSpend({
        amount: parsedAmount,
        category: 'BILLS',
        merchant: provider,
        description: desc,
        currency: 'INR',
      });

      const txn: Transaction = res.data?.data || {
        id: `FST-BILL-${Date.now().toString().slice(-6)}`,
        amount: parsedAmount,
        type: 'DEBIT',
        status: 'COMPLETED',
        category: 'BILLS',
        merchant: provider,
        description: desc,
        createdAt: new Date().toISOString(),
      };

      setConfirmedTxn(txn);
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Bill payment failed. Please check wallet balance and try again.');
      } else {
        setError('Bill payment failed. Please check wallet balance and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!confirmedTxn) return;
    downloadReceiptJpg({
      transactionId: confirmedTxn.id,
      amount: confirmedTxn.amount,
      recipientName: getProviderName(),
      recipientDetail: `${activeCategory === 'MOBILE' ? 'Mobile' : 'Account'}: ${getAccountIdentifier()}`,
      paymentMethod: 'FST Pay Wallet',
      note: confirmedTxn.description,
      date: confirmedTxn.createdAt,
      status: 'SUCCESSFUL',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel max-w-lg bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-surface-700/60 shadow-2xl p-6 rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-surface-800">
          <div className="flex items-center gap-2.5">
            {step === 'confirm' && (
              <button
                type="button"
                onClick={() => setStep('input')}
                className="p-1.5 -ml-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-800 text-slate-500"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 flex items-center justify-center font-bold">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {step === 'success' ? 'Payment Completed' : 'Bills & Recharge'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-surface-400">
                {step === 'success' ? 'Instant receipt generated' : 'Fast & verified bill settlement'}
              </p>
            </div>
          </div>
          {step !== 'success' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-600 dark:text-danger-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: INPUT DETAILS */}
        {step === 'input' && (
          <form onSubmit={handleProceedToReview} className="space-y-4 pt-4">
            {/* Category Selector Tabs */}
            <div className="grid grid-cols-5 gap-1.5 bg-slate-50 dark:bg-surface-800/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-surface-700/60">
              {[
                { id: 'MOBILE', label: 'Mobile', icon: Smartphone },
                { id: 'ELECTRICITY', label: 'Power', icon: Zap },
                { id: 'BROADBAND', label: 'Broadband', icon: Wifi },
                { id: 'DTH', label: 'DTH', icon: Tv },
                { id: 'WATER_GAS', label: 'Gas/Water', icon: Flame },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id as BillCategory);
                      setError('');
                      setSelectedPlanDesc('');
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-bold transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-surface-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                    <span className="truncate w-full text-center">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Provider / Operator Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-surface-200 mb-1.5">
                {activeCategory === 'MOBILE' ? 'Mobile Operator' : 'Select Provider / Biller'}
              </label>
              <select
                value={getProviderName()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeCategory === 'MOBILE') setSelectedOperator(val);
                  else if (activeCategory === 'ELECTRICITY') setSelectedBoard(val);
                  else if (activeCategory === 'BROADBAND') setSelectedBroadband(val);
                  else if (activeCategory === 'DTH') setSelectedDth(val);
                  else setSelectedUtility(val);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {activeCategory === 'MOBILE' &&
                  OPERATORS.map((op) => (
                    <option key={op.id} value={op.name}>
                      {op.icon} {op.name}
                    </option>
                  ))}
                {activeCategory === 'ELECTRICITY' &&
                  ELECTRICITY_BOARDS.map((b) => (
                    <option key={b.id} value={b.name}>
                      ⚡ {b.name}
                    </option>
                  ))}
                {activeCategory === 'BROADBAND' &&
                  BROADBAND_PROVIDERS.map((b) => (
                    <option key={b.id} value={b.name}>
                      🌐 {b.name}
                    </option>
                  ))}
                {activeCategory === 'DTH' &&
                  DTH_OPERATORS.map((d) => (
                    <option key={d.id} value={d.name}>
                      📺 {d.name}
                    </option>
                  ))}
                {activeCategory === 'WATER_GAS' &&
                  UTILITY_PROVIDERS.map((u) => (
                    <option key={u.id} value={u.name}>
                      🔥 {u.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Mobile Number or Consumer ID input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-surface-200 mb-1.5">
                {activeCategory === 'MOBILE' ? 'Mobile Number (10 Digits)' : 'Consumer / Account Number'}
              </label>
              {activeCategory === 'MOBILE' ? (
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="98765 43210"
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={consumerNumber}
                  onChange={(e) => setConsumerNumber(e.target.value)}
                  placeholder="e.g. 1002345892"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              )}
            </div>

            {/* Mobile Recharge Plans Carousel / Quick Selector */}
            {activeCategory === 'MOBILE' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700 dark:text-surface-200">
                    Select Popular Recharge Plan
                  </span>
                  <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold">
                    Unlimited Calls Included
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {POPULAR_MOBILE_PLANS.map((p) => {
                    const isSelected = amount === p.amount.toString();
                    return (
                      <div
                        key={p.amount}
                        onClick={() => handleSelectPlan(p)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-900 dark:text-white'
                            : 'bg-slate-50/50 dark:bg-surface-800/50 border-slate-200/80 dark:border-surface-700/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                            ₹{p.amount}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-surface-700 text-slate-600 dark:text-surface-300 font-semibold">
                            {p.validity}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-surface-300">
                            {p.data}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-surface-200">
                  {activeCategory === 'MOBILE' ? 'Or Custom Recharge Amount (₹)' : 'Bill Amount (₹)'}
                </label>
                <span className="text-[11px] text-slate-500 dark:text-surface-400">
                  Wallet Balance: <strong className="text-slate-800 dark:text-white font-mono">{formatCurrency(currentBalance)}</strong>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setSelectedPlanDesc('');
                  }}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex gap-1.5 mt-2">
                {[100, 250, 500, 1000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setAmount(chip.toString());
                      setSelectedPlanDesc('');
                      setError('');
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-100 dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-300 text-[11px] font-semibold transition-colors"
                  >
                    +₹{chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-primary-500/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Continue to Pay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: CONFIRM PAYMENT */}
        {step === 'confirm' && (
          <div className="space-y-4 pt-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-800/70 border border-slate-100 dark:border-surface-700 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-surface-400">Biller / Operator</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{getProviderName()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-surface-400">
                  {activeCategory === 'MOBILE' ? 'Mobile Number' : 'Account ID'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {activeCategory === 'MOBILE' ? `+91 ${mobileNumber}` : consumerNumber}
                </span>
              </div>
              {selectedPlanDesc && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-surface-400">Selected Plan</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-surface-300 text-right max-w-[220px] truncate">
                    {selectedPlanDesc}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-surface-700">
                <span className="text-xs text-slate-500 dark:text-surface-400">Payment Source</span>
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  FST Pay Wallet
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Amount Payable</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {formatCurrency(parseFloat(amount))}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-surface-700 text-slate-700 dark:text-surface-200 hover:bg-slate-50 dark:hover:bg-surface-800 text-xs font-bold transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={isSubmitting}
                className="flex-[2] py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-primary-500/25 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Settlement...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Pay {formatCurrency(parseFloat(amount))}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS & RECEIPT */}
        {step === 'success' && confirmedTxn && (
          <div className="pt-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce-subtle">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Payment Successful!
              </h3>
              <p className="text-xs text-slate-500 dark:text-surface-400 mt-0.5">
                Paid to {getProviderName()} • Ref: #{confirmedTxn.id.slice(-8)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-800/80 border border-slate-100 dark:border-surface-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-surface-400">Total Deducted:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatCurrency(confirmedTxn.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-surface-400">Account / Mobile:</span>
                <span className="font-mono text-slate-700 dark:text-surface-300">
                  {activeCategory === 'MOBILE' ? `+91 ${mobileNumber}` : consumerNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-surface-400">Settlement Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Instant Settled • BBPS Verified
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-surface-700 text-slate-700 dark:text-surface-200 hover:bg-slate-50 dark:hover:bg-surface-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-primary-500" />
                <span>Download Receipt</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-md shadow-primary-500/25 transition-all flex items-center justify-center"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
