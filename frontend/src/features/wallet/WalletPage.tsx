import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, parseMoneyInput } from '../../utils/helpers';
import {
  Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight, QrCode, CreditCard, Building2,
  Loader2, IndianRupee, Check, AlertCircle, ReceiptText
} from 'lucide-react';
import { walletApi, transactionApi } from '../../api/endpoints';
import type { Transaction } from '../../types';
import { PageTransition, EmptyState } from '../../components/ui';
import { WalletSkeleton } from '../../components/skeletons/PageSkeletons';

const topUpMethods = [
  { id: 'upi', icon: QrCode, label: 'UPI', desc: 'Pay via UPI ID or QR' },
  { id: 'card', icon: CreditCard, label: 'Card', desc: 'Debit or Credit Card' },
  { id: 'bank', icon: Building2, label: 'Bank', desc: 'Net Banking Transfer' },
];

export default function WalletPage() {
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [balanceRevealed, setBalanceRevealed] = useState(false);

  // Top-Up Step Flow States
  const [topUpStep, setTopUpStep] = useState<'input' | 'payment_detail' | 'success'>('input');
  const [selectedBank, setSelectedBank] = useState('sbi');
  const [cardNo, setCardNo] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchWalletAndHistory = async () => {
    try {
      const [walletRes, historyRes] = await Promise.all([
        walletApi.getWallet(),
        transactionApi.getTransactions({ size: 50 })
      ]);
      setWallet(walletRes.data.data);
      setHistory(historyRes.data.data.content || historyRes.data.data || []);
      setTimeout(() => setBalanceRevealed(true), 100);
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadWallet = async () => {
      try {
        const [walletRes, historyRes] = await Promise.all([
          walletApi.getWallet(),
          transactionApi.getTransactions({ size: 50 })
        ]);
        if (isMounted) {
          setWallet(walletRes.data.data);
          setHistory(historyRes.data.data.content || historyRes.data.data || []);
          setTimeout(() => setBalanceRevealed(true), 100);
        }
      } catch (err) {
        console.error('Wallet fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadWallet();
    return () => { isMounted = false; };
  }, []);

  const openTopUpModal = () => {
    setTopUpAmount('');
    setSelectedMethod('upi');
    setTopUpStep('input');
    setErrorMsg('');
    setCardNo('');
    setCardExpiry('');
    setCardCvv('');
    setShowTopUp(true);
  };

  const handleProceedToPayment = () => {
    const amount = parseMoneyInput(topUpAmount, 1);
    if (amount === null || amount <= 0) {
      setErrorMsg('Please enter a valid amount (minimum ₹1)');
      return;
    }
    if (amount > 100000) {
      setErrorMsg('Top-up amount cannot exceed ₹1,00,000');
      return;
    }
    setErrorMsg('');
    setTopUpStep('payment_detail');
  };

  const handleTopUp = async () => {
    const amount = parseMoneyInput(topUpAmount, 1);
    if (amount === null) {
      setErrorMsg('Invalid top-up amount');
      return;
    }

    // Basic Card Validation if Card Method
    if (selectedMethod === 'card') {
      if (!cardNo.replace(/\s/g, '').match(/^\d{16}$/)) {
        setErrorMsg('Please enter a valid 16-digit card number');
        return;
      }
      if (!cardExpiry.match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/)) {
        setErrorMsg('Please enter expiry in MM/YY format');
        return;
      }
      if (!cardCvv.match(/^\d{3}$/)) {
        setErrorMsg('Please enter a 3-digit CVV');
        return;
      }
    }

    try {
      setIsActionLoading(true);
      setErrorMsg('');
      await walletApi.topUp({ amount, method: selectedMethod });
      await fetchWalletAndHistory();
      setTopUpStep('success');
      setTimeout(() => {
        setShowTopUp(false);
        setTopUpStep('input');
        setTopUpAmount('');
        setCardNo('');
        setCardExpiry('');
        setCardCvv('');
      }, 2000);
    } catch (err: unknown) {
      console.error('Top-up failed:', err);
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setErrorMsg(err.response?.data?.message || 'Top-up transaction failed. Please try again.');
      } else {
        setErrorMsg('Top-up transaction failed. Please try again.');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2000, 5000];
  const balance = wallet?.balance ?? 0;

  if (isLoading && !wallet) {
    return <WalletSkeleton />;
  }

  return (
    <PageTransition className="space-y-6">
      {/* Balance Card - Wallet Opening Effect */}
      <div className="wallet-open relative overflow-hidden rounded-3xl p-8 gradient-card shadow-2xl shadow-primary-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-24 translate-x-24 layer-1" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent-500/10 rounded-full translate-y-20 -translate-x-20 layer-2" />
        <div className="vc-card-shine rounded-3xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
                <WalletIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-primary-200 font-medium">Available Balance</p>
                <p className="text-[10px] text-primary-300 uppercase tracking-wider">FST Pay Wallet</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/10">
              <IndianRupee className="w-3.5 h-3.5 text-accent-300" />
              <span className="text-xs text-accent-200 font-medium">INR</span>
            </div>
          </div>

          <div className={`${balanceRevealed ? 'balance-reveal' : 'opacity-0'}`}>
            <p className="text-5xl font-primary font-bold text-white mb-2">
              {formatCurrency(balance)}
            </p>
            <p className="text-sm text-primary-200/80">~${(balance * 0.012).toFixed(2)} USD</p>
          </div>

          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={openTopUpModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl text-white font-semibold transition-all border border-white/10 hover:-translate-y-0.5 haptic-tap"
            >
              <Plus className="w-5 h-5" /> Add Money
            </button>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 backdrop-blur rounded-xl text-white/70 hover:text-white font-medium transition-all border border-white/5 hover:-translate-y-0.5 haptic-tap">
              <ArrowUpRight className="w-5 h-5" /> Send
            </button>
          </div>
        </div>
      </div>

      {/* Top-Up Modal */}
      {showTopUp && (
        <div className="modal-overlay" onClick={() => setShowTopUp(false)}>
          <div className="modal-panel space-y-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-primary font-bold text-slate-900 dark:text-white">
                  {topUpStep === 'input' ? 'Add Money' : topUpStep === 'payment_detail' ? 'Authorize Payment' : 'Payment Success'}
                </h3>
              </div>
              {topUpStep !== 'success' && (
                <button onClick={() => setShowTopUp(false)} className="w-8 h-8 rounded-xl bg-surface-700/50 flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-600/50 transition-all">
                  ✕
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Input Amount & Method */}
            {topUpStep === 'input' && (
              <div className="space-y-4">
                <div>
                  <label className="input-label">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 font-semibold text-lg">₹</span>
                    <input
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="0"
                      min="1"
                      className="input-field text-3xl font-primary font-bold pl-10 py-4"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setTopUpAmount(String(amt))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all haptic-tap ${
                          topUpAmount === String(amt)
                            ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                            : 'bg-surface-800/30 border-surface-600/30 text-surface-300 hover:border-surface-500'
                        }`}
                      >
                        ₹{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="input-label">Payment Method</label>
                  <div className="space-y-2">
                    {topUpMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all haptic-tap ${
                          selectedMethod === method.id
                            ? 'bg-primary-500/10 border-primary-500/30'
                            : 'bg-surface-800/20 border-surface-700/50 hover:border-surface-600'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedMethod === method.id ? 'bg-primary-500/20' : 'bg-surface-700/50'
                        }`}>
                          <method.icon className={`w-5 h-5 ${selectedMethod === method.id ? 'text-primary-400' : 'text-surface-400'}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">{method.label}</p>
                          <p className="text-xs text-surface-500">{method.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={!topUpAmount || parseMoneyInput(topUpAmount) === null}
                  className="btn-gradient w-full flex items-center justify-center gap-2 py-3 mt-2"
                >
                  Proceed to Pay
                </button>
              </div>
            )}

            {/* Step 2: Payment Detail Simulation */}
            {topUpStep === 'payment_detail' && (
              <div className="space-y-4">
                {/* UPI QR Display */}
                {selectedMethod === 'upi' && (
                  <div className="flex flex-col items-center text-center space-y-4 py-2">
                    <p className="text-sm text-surface-300">Scan this QR Code using any UPI App (GPay, PhonePe, Paytm)</p>
                    <div className="p-3 bg-white rounded-2xl shadow-lg border border-surface-200">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          `upi://pay?pa=fstpay@icici&pn=FST%20Pay&am=${topUpAmount}&cu=INR`
                        )}`}
                        alt="UPI Payment QR Code"
                        className="w-44 h-44"
                      />
                    </div>
                    <p className="text-xs text-surface-400 font-mono bg-surface-800 px-3 py-1.5 rounded-lg border border-surface-700">
                      Amount: ₹{parseFloat(topUpAmount).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Card input */}
                {selectedMethod === 'card' && (
                  <div className="space-y-3">
                    <div className="rounded-2xl p-4 bg-gradient-to-br from-primary-600 to-primary-900 border border-primary-500/20 text-white shadow-xl flex flex-col justify-between h-40 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-12 -translate-y-12" />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-primary-200 uppercase tracking-widest">Mock Prepaid Debit</p>
                          <p className="text-lg font-bold font-display mt-0.5">FST Pay Load Card</p>
                        </div>
                        <CreditCard className="w-8 h-8 text-primary-300/80" />
                      </div>
                      <div className="font-mono text-lg tracking-widest py-1">
                        {cardNo || '•••• •••• •••• ••••'}
                      </div>
                      <div className="flex justify-between items-end text-xs font-mono">
                        <div>
                          <p className="text-[8px] text-primary-300 uppercase">Card Holder</p>
                          <p className="font-semibold uppercase tracking-wider">Test User</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-primary-300 uppercase">Expires</p>
                          <p className="font-semibold">{cardExpiry || 'MM/YY'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="input-label">Card Number</label>
                      <input
                        type="text"
                        value={cardNo}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                          const matches = val.match(/\d{4,16}/g);
                          const match = matches && matches[0] || '';
                          const parts = [];
                          for (let i = 0, len = match.length; i < len; i += 4) {
                            parts.push(match.substring(i, i + 4));
                          }
                          setCardNo(parts.length > 0 ? parts.join(' ') : val);
                        }}
                        placeholder="4111 2222 3333 4444"
                        maxLength={19}
                        className="input-field font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value.replace(/[^0-9/]/g, ''))}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="input-field font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="input-label">CVV</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="•••"
                          maxLength={3}
                          className="input-field font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Net Banking Bank List */}
                {selectedMethod === 'bank' && (
                  <div className="space-y-3">
                    <label className="input-label font-medium text-sm">Select Your Netbanking Bank</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'sbi', name: 'State Bank of India' },
                        { id: 'hdfc', name: 'HDFC Bank' },
                        { id: 'icici', name: 'ICICI Bank' },
                        { id: 'axis', name: 'Axis Bank' }
                      ].map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setSelectedBank(bank.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            selectedBank === bank.id
                              ? 'bg-primary-500/10 border-primary-500/40 text-white'
                              : 'bg-surface-800/30 border-surface-700/50 text-surface-400 hover:border-surface-600'
                          }`}
                        >
                          <Building2 className="w-6 h-6 mb-1 text-primary-400" />
                          <span className="text-xs font-semibold">{bank.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setTopUpStep('input')}
                    className="btn-secondary flex-1 py-3"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleTopUp}
                    disabled={isActionLoading}
                    className="btn-gradient flex-1 flex items-center justify-center gap-2 py-3"
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Simulate Payment</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success checkout screen */}
            {topUpStep === 'success' && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-scale-up">
                <div className="w-16 h-16 rounded-full bg-accent-500/20 border border-accent-500/40 flex items-center justify-center shadow-glow shadow-accent-500/20">
                  <Check className="w-8 h-8 text-accent-400 stroke-[3]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-white font-primary">Money Added Successfully!</h4>
                  <p className="text-sm text-surface-400">
                    ₹{parseFloat(topUpAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been credited to your FST Pay Wallet.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Wallet History */}
      <div className="glass-card p-6 page-section">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-primary font-bold text-slate-900 dark:text-white tracking-wide">Wallet History</h3>
          <span className="text-xs text-slate-500 dark:text-surface-500">{history.length} transactions</span>
        </div>
        <div className="space-y-1">
          {history.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No transaction history"
              description="Your wallet activity will appear here once you add money or make purchases."
              action={{ label: 'Add Money', onClick: openTopUpModal }}
            />
          ) : (
            history.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-800/30 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  txn.type === 'CREDIT' ? 'bg-accent-500/10' : 'bg-slate-100 dark:bg-surface-700/50'
                }`}>
                  {txn.type === 'CREDIT'
                    ? <ArrowDownRight className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                    : <ArrowUpRight className="w-5 h-5 text-danger-500 dark:text-danger-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{txn.description || txn.merchant || 'Transaction'}</p>
                  <p className="text-xs text-slate-500 dark:text-surface-500">
                    {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold font-primary ${txn.type === 'CREDIT' ? 'text-accent-600 dark:text-accent-400' : 'text-slate-900 dark:text-white'}`}>
                    {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                  <p className="text-[10px] text-surface-600">Bal: {formatCurrency(txn.balanceAfter)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
