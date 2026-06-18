import { useState, useEffect } from 'react';
import { formatCurrency, parseMoneyInput } from '../../utils/helpers';
import {
  Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight, QrCode, CreditCard, Building2,
  Loader2, IndianRupee
} from 'lucide-react';
import { walletApi, transactionApi } from '../../api/endpoints';

const topUpMethods = [
  { id: 'upi', icon: QrCode, label: 'UPI', desc: 'Pay via UPI ID or QR' },
  { id: 'card', icon: CreditCard, label: 'Card', desc: 'Debit or Credit Card' },
  { id: 'bank', icon: Building2, label: 'Bank', desc: 'Net Banking Transfer' },
];

export default function WalletPage() {
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [balanceRevealed, setBalanceRevealed] = useState(false);

  const fetchWalletAndHistory = async () => {
    try {
      setIsLoading(true);
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
    fetchWalletAndHistory();
  }, []);

  const handleTopUp = async () => {
    const amount = parseMoneyInput(topUpAmount, 1);
    if (amount === null) {
      console.error('Invalid top-up amount');
      return;
    }
    try {
      setIsActionLoading(true);
      await walletApi.topUp({ amount, method: selectedMethod });
      await fetchWalletAndHistory();
      setShowTopUp(false);
      setTopUpAmount('');
    } catch (err) {
      console.error('Top-up failed:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2000, 5000];
  const balance = wallet?.balance ?? 0;

  if (isLoading && !wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-surface-400 text-sm">Opening your wallet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              onClick={() => setShowTopUp(true)}
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
          <div className="modal-panel space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-primary font-bold text-white">Add Money</h3>
              </div>
              <button onClick={() => setShowTopUp(false)} className="w-8 h-8 rounded-xl bg-surface-700/50 flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-600/50 transition-all">
                ✕
              </button>
            </div>

            <div>
              <label className="input-label">Amount</label>
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
              onClick={handleTopUp}
              disabled={isActionLoading || parseMoneyInput(topUpAmount) === null}
              className="btn-gradient w-full flex items-center justify-center gap-2 py-3"
            >
              {isActionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Add {topUpAmount ? formatCurrency(Number(topUpAmount)) : 'Money'}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Wallet History */}
      <div className="glass-card p-6 page-section">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-primary font-bold text-white tracking-wide">Wallet History</h3>
          <span className="text-xs text-surface-500">{history.length} transactions</span>
        </div>
        <div className="space-y-1">
          {history.length === 0 ? (
            <p className="text-surface-500 text-sm py-8 text-center">No transaction history yet.</p>
          ) : (
            history.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800/30 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  txn.type === 'CREDIT' ? 'bg-accent-500/10' : 'bg-surface-700/50'
                }`}>
                  {txn.type === 'CREDIT'
                    ? <ArrowDownRight className="w-5 h-5 text-accent-400" />
                    : <ArrowUpRight className="w-5 h-5 text-danger-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{txn.description || txn.merchant || 'Transaction'}</p>
                  <p className="text-xs text-surface-500">
                    {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold font-primary ${txn.type === 'CREDIT' ? 'text-accent-400' : 'text-white'}`}>
                    {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                  <p className="text-[10px] text-surface-600">Bal: {formatCurrency(txn.balanceAfter)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
