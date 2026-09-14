import { useState } from 'react';
import axios from 'axios';
import { X, Wallet, QrCode, CreditCard, Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { walletApi } from '../../api/endpoints';
import { formatCurrency } from '../../utils/helpers';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

export default function AddMoneyModal({ isOpen, onClose, onSuccess, currentBalance }: AddMoneyModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleQuickSelect = (val: number) => {
    setAmount(val.toString());
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (num > 100000) {
      setError('Single transaction limit is ₹1,00,000.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await walletApi.topUp({ amount: num, method });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Failed to top up wallet. Please try again.');
      } else {
        setError('Network error. Failed to complete top-up.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-surface-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Money</h3>
              <p className="text-xs text-slate-500 dark:text-surface-400">Available: {formatCurrency(currentBalance)}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Money Added Successfully!</h4>
            <p className="text-sm text-slate-500 dark:text-surface-400">
              {formatCurrency(parseFloat(amount))} has been credited to your FST Pay wallet.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-surface-400 mb-2">
                Enter Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max="100000"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  placeholder="0.00"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-surface-800/60 rounded-2xl border border-slate-200 dark:border-surface-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Quick Pills */}
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickSelect(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    amount === val.toString()
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                      : 'bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-surface-300 hover:bg-slate-200'
                  }`}
                >
                  +₹{val}
                </button>
              ))}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-surface-400 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI Fast', icon: QrCode },
                  { id: 'CARD', label: 'Debit Card', icon: CreditCard },
                  { id: 'NETBANKING', label: 'Net Banking', icon: Building2 },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as any)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 text-primary-600 font-semibold shadow-sm'
                          : 'border-slate-200 dark:border-surface-700/60 hover:bg-slate-50 dark:hover:bg-surface-800 text-slate-600 dark:text-surface-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing Top-Up...
                </>
              ) : (
                `Add ${amount && parseFloat(amount) > 0 ? formatCurrency(parseFloat(amount)) : 'Money'}`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
