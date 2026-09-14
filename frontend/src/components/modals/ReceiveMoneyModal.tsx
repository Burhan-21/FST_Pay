import { useState } from 'react';
import { X, QrCode, Copy, Check, Download, Sparkles } from 'lucide-react';

interface ReceiveMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { fullName?: string; email?: string } | null;
}

export default function ReceiveMoneyModal({ isOpen, onClose, user }: ReceiveMoneyModalProps) {
  const [copied, setCopied] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');

  if (!isOpen) return null;

  const username = user?.email ? user.email.split('@')[0] : 'user';
  const upiId = `${username}@fstpay`;
  const fullName = user?.fullName || 'FST Pay User';

  const amountParam = requestAmount && parseFloat(requestAmount) > 0 ? `&am=${parseFloat(requestAmount)}` : '';
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(fullName)}&cu=INR${amountParam}`;

  // Generate crisp QR code URL using standard public secure QR provider or local rendering
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(upiString)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `fstpay-${username}-qr.png`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-surface-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Receive Money</h3>
              <p className="text-xs text-slate-500 dark:text-surface-400">Scan & Pay via any UPI App</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center space-y-5">
          {/* User Name & Tag */}
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{fullName}</h4>
            <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{upiId}</span>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-md shadow-slate-200/50 flex flex-col items-center">
            <div className="w-52 h-52 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center">
              <img
                src={qrUrl}
                alt="My FST Pay QR Code"
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-3">Scan with GPay, PhonePe, Paytm, or FST Pay</p>
          </div>

          {/* Optional Amount Specification */}
          <div className="w-full">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1 px-1">
              <span>Request specific amount (optional)</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">₹</span>
              <input
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-2 text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full pt-1">
            <button
              onClick={handleCopyUpi}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-surface-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy UPI ID'}</span>
            </button>
            <button
              onClick={handleDownloadQr}
              className="py-3 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download QR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
