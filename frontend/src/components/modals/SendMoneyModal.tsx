import { useState, useMemo } from 'react';
import axios from 'axios';
import {
  X, ArrowLeft, Search, User, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, ShieldCheck, Share2, Download, ReceiptText, Building2, AtSign
} from 'lucide-react';
import { transactionApi } from '../../api/endpoints';
import { formatCurrency } from '../../utils/helpers';
import type { Transaction } from '../../types';

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
  recentTransactions?: Transaction[];
  initialRecipient?: string;
  initialAmount?: string;
}

export default function SendMoneyModal({
  isOpen,
  onClose,
  onSuccess,
  currentBalance,
  recentTransactions = [],
  initialRecipient = '',
  initialAmount = '',
}: SendMoneyModalProps) {
  const [step, setStep] = useState<'recipient' | 'amount' | 'review' | 'success'>('recipient');
  const [tab, setTab] = useState<'contacts' | 'upi' | 'bank'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Recipient details
  const [recipient, setRecipient] = useState(initialRecipient);
  
  // Amount & Note
  const [amount, setAmount] = useState(initialAmount);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('SHOPPING');
  
  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedTxn, setConfirmedTxn] = useState<any>(null);

  // Dynamically derive real unique past recipients from user's actual transactions
  const pastRecipients = useMemo(() => {
    const seen = new Set<string>();
    const list: { name: string; id: string; category: string }[] = [];
    
    for (const txn of recentTransactions) {
      const name = txn.merchant || txn.description || 'Transfer';
      if (!seen.has(name) && name.trim().length > 0) {
        seen.add(name);
        list.push({
          name,
          id: txn.id,
          category: txn.category || 'GENERAL',
        });
      }
    }
    return list;
  }, [recentTransactions]);

  const filteredRecipients = useMemo(() => {
    if (!searchQuery.trim()) return pastRecipients;
    const q = searchQuery.toLowerCase();
    return pastRecipients.filter(r => r.name.toLowerCase().includes(q));
  }, [pastRecipients, searchQuery]);

  if (!isOpen) return null;

  const handleSelectRecipient = (name: string) => {
    setRecipient(name);
    setStep('amount');
    setError('');
  };

  const handleCustomUpiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please enter a valid recipient name or UPI ID.');
      return;
    }
    handleSelectRecipient(searchQuery.trim());
  };

  const handleAmountContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter an amount greater than 0.');
      return;
    }
    if (num > currentBalance) {
      setError(`Insufficient balance. You have ${formatCurrency(currentBalance)} available.`);
      return;
    }
    setError('');
    setStep('review');
  };

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await transactionApi.simulateSpend({
        amount: parseFloat(amount),
        category,
        merchant: recipient,
        description: note.trim() || `Payment to ${recipient}`,
        currency: 'INR',
      });
      setConfirmedTxn(res.data?.data || null);
      setStep('success');
      onSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Transaction failed. Please try again.');
      } else {
        setError('Network error occurred during payment processing.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('recipient');
    setRecipient('');
    setAmount('');
    setNote('');
    setError('');
    setConfirmedTxn(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-surface-800 overflow-hidden">
        
        {/* Step 1: Select Recipient */}
        {step === 'recipient' && (
          <div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Send Money</h3>
              <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Search Bar */}
              <form onSubmit={handleCustomUpiSubmit} className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, UPI ID or mobile"
                  className="w-full pl-11 pr-20 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-400 bg-slate-50 dark:bg-surface-800/80 rounded-2xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 caret-primary-600"
                />
                {searchQuery.trim() && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors"
                  >
                    Pay
                  </button>
                )}
              </form>

              {/* Tabs */}
              <div className="flex p-1 bg-slate-100 dark:bg-surface-800 rounded-2xl">
                {[
                  { id: 'contacts', label: 'Contacts' },
                  { id: 'upi', label: 'UPI ID' },
                  { id: 'bank', label: 'Bank Transfer' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id as any)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                      tab === t.id
                        ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Recipient list or empty state */}
              {tab === 'contacts' && (
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {filteredRecipients.length > 0 ? (
                    filteredRecipients.map((rec) => (
                      <button
                        key={rec.name}
                        onClick={() => handleSelectRecipient(rec.name)}
                        className="w-full p-3 rounded-2xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-800 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/30 flex items-center justify-center font-bold text-sm">
                            {rec.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{rec.name}</p>
                            <p className="text-[11px] text-slate-400 capitalize">{rec.category.toLowerCase()}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </button>
                    ))
                  ) : (
                    <div className="py-8 text-center px-4 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-surface-800 text-slate-400 mx-auto flex items-center justify-center">
                        <User className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-surface-300">No past recipients found</p>
                      <p className="text-[11px] text-slate-400">
                        Type a UPI ID (e.g. name@upi) or mobile number in the search bar above to send money.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'upi' && (
                <div className="py-6 px-2 space-y-3">
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. rahul@oksbi or 9876543210@paytm"
                      className="w-full pl-11 pr-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-400 bg-slate-50 dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 caret-primary-600"
                    />
                  </div>
                  <button
                    onClick={handleCustomUpiSubmit}
                    disabled={!searchQuery.trim()}
                    className="w-full py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs disabled:opacity-50 transition-colors"
                  >
                    Verify & Proceed
                  </button>
                </div>
              )}

              {tab === 'bank' && (
                <div className="py-6 px-2 text-center space-y-2">
                  <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-surface-300">Bank Account Transfer</p>
                  <p className="text-[11px] text-slate-400">Enter recipient Account Number & IFSC code in the search box to route via IMPS.</p>
                </div>
              )}

              {/* Bottom promo tag */}
              <div className="p-3 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 flex items-center justify-between text-xs text-primary-700 dark:text-primary-300">
                <span className="font-semibold">Split Bills, Not Vibes</span>
                <span className="text-[11px] text-primary-500">Zero transfer fees</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Enter Amount */}
        {step === 'amount' && (
          <div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
              <button onClick={() => setStep('recipient')} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Enter Amount</h3>
              <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAmountContinue} className="p-6 space-y-5">
              {/* Recipient Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">
                    {recipient.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Paying to</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{recipient}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('recipient')}
                  className="text-xs font-semibold text-primary-500 hover:underline"
                >
                  Change
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Amount</span>
                  <span>Available: {formatCurrency(currentBalance)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    placeholder="0.00"
                    autoFocus
                    className="w-full pl-12 pr-4 py-3.5 text-3xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['SHOPPING', 'FOOD', 'BILLS', 'ENTERTAINMENT'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition-all ${
                        category === c
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 text-primary-600'
                          : 'border-slate-200 dark:border-surface-700 text-slate-600 dark:text-surface-400'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  className="w-full px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-400 bg-slate-50 dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500 caret-primary-600"
                />
              </div>

              <button
                type="submit"
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > currentBalance}
                className="w-full py-3.5 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                Continue
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 'review' && (
          <div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
              <button onClick={() => setStep('amount')} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Review & Confirm</h3>
              <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Amount Display */}
              <div className="text-center py-4 space-y-1">
                <p className="text-xs text-slate-400">Total Transfer Amount</p>
                <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(parseFloat(amount))}
                </h2>
                <p className="text-xs font-medium text-slate-500">To {recipient}</p>
              </div>

              {/* Breakdown Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Transfer Amount</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Processing Fee</span>
                  <span className="font-semibold text-emerald-500">FREE</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Category</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{category}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-surface-700 flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Total Debit</span>
                  <span>{formatCurrency(parseFloat(amount))}</span>
                </div>
              </div>

              {/* Payment source */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-surface-700 text-xs text-slate-600 dark:text-surface-300">
                <ShieldCheck className="w-4 h-4 text-primary-500" />
                <span>Protected by FST Pay 256-bit instant settlement</span>
              </div>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  `Pay ${formatCurrency(parseFloat(amount))}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payment Successful (Matching Phone 3 Mockup) */}
        {step === 'success' && (
          <div className="p-8 text-center space-y-6">
            {/* Green Checkmark */}
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            {/* Success Message */}
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Payment Successful!</h3>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white pt-2">
                {formatCurrency(parseFloat(amount))}
              </p>
              <p className="text-xs text-slate-500 dark:text-surface-400">
                Paid to <strong className="text-slate-800 dark:text-surface-200">{recipient}</strong>
              </p>
            </div>

            {/* Quote Card */}
            <div className="p-3.5 rounded-2xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 text-xs text-primary-700 dark:text-primary-300 italic font-medium">
              &ldquo;Small payments. Big possibilities.&rdquo;
            </div>

            {/* Action Buttons: Share, Download, Details */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-surface-800">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'FST Pay Transfer', text: `Paid ${formatCurrency(parseFloat(amount))} to ${recipient}` }).catch(() => {});
                  }
                }}
                className="p-2.5 rounded-xl text-slate-600 dark:text-surface-300 hover:bg-slate-50 text-xs flex flex-col items-center gap-1 font-medium"
              >
                <Share2 className="w-4 h-4 text-primary-500" />
                <span>Share</span>
              </button>
              <button
                onClick={() => {
                  const content = `FST PAY TRANSACTION RECEIPT\nReference: ${confirmedTxn?.id || 'TXN-' + Date.now()}\nAmount: ${formatCurrency(parseFloat(amount))}\nRecipient: ${recipient}\nDate: ${new Date().toLocaleString()}`;
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `receipt-${Date.now()}.txt`;
                  a.click();
                }}
                className="p-2.5 rounded-xl text-slate-600 dark:text-surface-300 hover:bg-slate-50 text-xs flex flex-col items-center gap-1 font-medium"
              >
                <Download className="w-4 h-4 text-primary-500" />
                <span>Download</span>
              </button>
              <button
                onClick={handleClose}
                className="p-2.5 rounded-xl text-slate-600 dark:text-surface-300 hover:bg-slate-50 text-xs flex flex-col items-center gap-1 font-medium"
              >
                <ReceiptText className="w-4 h-4 text-primary-500" />
                <span>View Details</span>
              </button>
            </div>

            {/* Done Button */}
            <button
              onClick={handleClose}
              className="w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/25 transition-all"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
