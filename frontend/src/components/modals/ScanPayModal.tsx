import { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  X, Camera, Upload, Scan, ArrowRight, ArrowLeft, CheckCircle2,
  ShieldCheck, Users, Plus, Minus, Download, AlertCircle, Loader2
} from 'lucide-react';
import { transactionApi } from '../../api/endpoints';
import { formatCurrency } from '../../utils/helpers';
import { shareOrDownloadReceiptJpg } from '../../utils/receiptGenerator';

interface ScanPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (data: { recipient: string; amount?: string }) => void;
  currentBalance?: number;
  onSuccess?: () => void;
}

type ScanStep = 'scan' | 'details' | 'review' | 'processing' | 'success';

export default function ScanPayModal({
  isOpen,
  onClose,
  onScanSuccess: _onScanSuccess,
  currentBalance = 0,
  onSuccess,
}: ScanPayModalProps) {
  const [step, setStep] = useState<ScanStep>('scan');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Payment Form States
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  
  // Split Amount States
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  // Execution States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedTxn, setConfirmedTxn] = useState<any>(null);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  // Dynamic Split Calculations
  const numericAmount = parseFloat(amount) || 0;
  const perPersonShare = useMemo(() => {
    if (!isSplitEnabled || splitCount <= 1 || numericAmount <= 0) {
      return numericAmount;
    }
    return Math.round((numericAmount / splitCount) * 100) / 100;
  }, [numericAmount, isSplitEnabled, splitCount]);

  const payableAmount = isSplitEnabled ? perPersonShare : numericAmount;
  const isBalanceInsufficient = payableAmount > currentBalance;

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep('scan');
      setRecipient('');
      setAmount('');
      setNote('');
      setIsSplitEnabled(false);
      setSplitCount(2);
      setError('');
      setConfirmedTxn(null);
      return;
    }
    setStep('scan');
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported on this device/browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setCameraError('Camera access denied. You can upload a QR image or enter a UPI ID.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const parseUpiUri = (raw: string) => {
    try {
      if (raw.startsWith('upi://pay?')) {
        const url = new URL(raw);
        const pa = url.searchParams.get('pa') || '';
        const am = url.searchParams.get('am') || '';
        const pn = url.searchParams.get('pn') || '';
        return { recipient: pa || raw, amount: am, note: pn };
      }
    } catch {}
    return { recipient: raw, amount: '', note: '' };
  };

  const handleDetectedRecipient = (rawTarget: string, defaultAmt?: string, defaultNote?: string) => {
    const parsed = parseUpiUri(rawTarget);
    const targetRecipient = parsed.recipient || rawTarget;
    setRecipient(targetRecipient);
    if (parsed.amount || defaultAmt) {
      setAmount(parsed.amount || defaultAmt || '');
    }
    if (parsed.note || defaultNote) {
      setNote(parsed.note || defaultNote || '');
    }
    stopCamera();
    setStep('details');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleDetectedRecipient(manualInput.trim());
    setManualInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const simulatedScan = file.name.includes('@') ? file.name.replace(/\.[^/.]+$/, '') : 'merchant.cafe@fstpay';
    handleDetectedRecipient(simulatedScan);
  };

  const handleConfirmPayment = async () => {
    if (payableAmount <= 0) {
      setError('Please specify a valid payment amount.');
      return;
    }
    if (isBalanceInsufficient) {
      setError('Insufficient wallet balance for this transaction.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (isSplitEnabled) {
        // Real Backend Call to Split Payments Endpoint
        const res = await transactionApi.splitPayment({
          totalAmount: numericAmount,
          splitCount: splitCount,
          userShare: perPersonShare,
          merchant: recipient,
          note: note.trim() || undefined,
        });
        setConfirmedTxn(res.data?.data || {
          id: `FST-${Date.now()}`,
          referenceId: `REF${Date.now().toString().slice(-8)}`,
          amount: perPersonShare,
          merchant: recipient,
        });
      } else {
        // Real Backend Call to Simulate Spend / Card Transaction
        const res = await transactionApi.simulateSpend({
          amount: numericAmount,
          category: 'SHOPPING',
          merchant: recipient,
          description: note.trim() || 'Scan & Pay transfer',
        });
        setConfirmedTxn(res.data?.data || {
          id: `FST-${Date.now()}`,
          referenceId: `REF${Date.now().toString().slice(-8)}`,
          amount: numericAmount,
          merchant: recipient,
        });
      }

      // Notify parent to refresh balances
      if (onSuccess) {
        onSuccess();
      }

      setStep('success');
    } catch (err: unknown) {
      console.error('Scan payment failed:', err);
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Payment failed. Please check your wallet balance and try again.');
      } else {
        setError('Payment processing encountered an unexpected issue.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!confirmedTxn) return;
    setIsDownloadingReceipt(true);
    try {
      await shareOrDownloadReceiptJpg({
        transactionId: confirmedTxn.referenceId || confirmedTxn.id || `TXN-${Date.now()}`,
        amount: payableAmount,
        recipientName: recipient,
        recipientDetail: recipient.includes('@') ? recipient : `${recipient}@fstpay`,
        paymentMethod: isSplitEnabled ? `FST Pay Wallet (Split with ${splitCount})` : 'FST Pay Instant Wallet',
        note: note || (isSplitEnabled ? `Split 1/${splitCount} Share` : 'Scan & Pay QR Payment'),
        date: new Date(),
        status: 'SUCCESS',
      });
    } catch (err) {
      console.error('Receipt generation error:', err);
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-surface-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            {step !== 'scan' && step !== 'success' && (
              <button
                onClick={() => {
                  if (step === 'review') setStep('details');
                  else if (step === 'details') {
                    setStep('scan');
                    startCamera();
                  }
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 flex items-center justify-center font-bold">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {step === 'scan' && 'Scan & Pay'}
                {step === 'details' && 'Payment Details'}
                {step === 'review' && 'Review Payment'}
                {step === 'success' && 'Payment Receipt'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-surface-400">
                {step === 'scan' && 'Point at any UPI QR code or enter address'}
                {step === 'details' && 'Enter amount, optional note, or split the bill'}
                {step === 'review' && 'Verify transaction details before confirming'}
                {step === 'success' && 'Transaction completed and confirmed'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-600 dark:text-danger-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP 1: SCAN QR / ENTER RECIPIENT ── */}
          {step === 'scan' && (
            <div className="space-y-4">
              <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-primary-500/40">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                {!cameraActive && (
                  <div className="text-center p-6 space-y-2 text-slate-400">
                    <Camera className="w-10 h-10 mx-auto text-primary-400 animate-pulse" />
                    <p className="text-xs font-medium">Camera viewfinder</p>
                    {cameraError && <p className="text-[11px] text-rose-400 max-w-xs">{cameraError}</p>}
                  </div>
                )}

                {/* Viewfinder Target Overlay */}
                <div className="absolute inset-8 pointer-events-none border-2 border-primary-400/80 rounded-2xl">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary-500 -mt-1 -ml-1 rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary-500 -mt-1 -mr-1 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary-500 -mb-1 -ml-1 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary-500 -mb-1 -mr-1 rounded-br" />
                </div>
              </div>

              {/* Upload QR Image */}
              <div className="flex items-center gap-3">
                <label className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-surface-700 hover:bg-slate-50 dark:hover:bg-surface-800 text-xs font-semibold text-slate-700 dark:text-surface-200 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-primary-500" />
                  <span>Upload QR Image from Device</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Manual Input Form */}
              <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-slate-100 dark:border-surface-800">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Or Enter UPI ID / Phone / Merchant
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="e.g. coffee@upi, 9876543210, or merchant@fstpay"
                    className="w-full px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-400 bg-slate-50 dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <button
                    type="submit"
                    disabled={!manualInput.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 2: AMOUNT, PAYMENT NOTE & SPLIT OPTION ── */}
          {step === 'details' && (
            <div className="space-y-5">
              {/* Recipient Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200/80 dark:border-surface-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
                    {recipient.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{recipient}</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-surface-400">Verified Recipient</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('scan');
                    startCamera();
                  }}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-surface-200">
                    {isSplitEnabled ? 'Total Bill Amount' : 'Amount'}
                  </label>
                  <span className="text-xs text-slate-500 dark:text-surface-400 font-medium">
                    Wallet: <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(currentBalance)}</span>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 text-2xl font-extrabold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-surface-600 bg-white dark:bg-surface-800 rounded-2xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Quick Amount Chips */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {[100, 250, 500, 1000].map((quickAmt) => (
                    <button
                      key={quickAmt}
                      type="button"
                      onClick={() => setAmount(quickAmt.toString())}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-surface-200 transition-colors"
                    >
                      +₹{quickAmt}
                    </button>
                  ))}
                  {currentBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(Math.floor(currentBalance).toString())}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300 hover:bg-primary-100 transition-colors"
                    >
                      Max
                    </button>
                  )}
                </div>
              </div>

              {/* Optional Payment Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-surface-200 mb-1.5">
                  Payment Note <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Dinner with friends, Grocery shopping, Coffee"
                  maxLength={100}
                  className="w-full px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 bg-white dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Optional Split Amount Feature */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/60 dark:from-surface-800/80 dark:to-surface-800/40 border border-indigo-100 dark:border-surface-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Split this bill with friends</p>
                      <p className="text-[11px] text-slate-500 dark:text-surface-400">Calculate and pay only your individual share</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="splitToggle"
                    checked={isSplitEnabled}
                    onChange={(e) => setIsSplitEnabled(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer"
                  />
                </div>

                {isSplitEnabled && (
                  <div className="pt-2 border-t border-indigo-100/80 dark:border-surface-700 space-y-3 animate-slide-down">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700 dark:text-surface-200">
                        Number of People:
                      </span>
                      <div className="flex items-center gap-2 bg-white dark:bg-surface-900 px-2 py-1 rounded-xl border border-slate-200 dark:border-surface-700">
                        <button
                          type="button"
                          disabled={splitCount <= 2}
                          onClick={() => setSplitCount((prev) => Math.max(2, prev - 1))}
                          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-slate-900 dark:text-white px-2">
                          {splitCount} people
                        </span>
                        <button
                          type="button"
                          disabled={splitCount >= 20}
                          onClick={() => setSplitCount((prev) => Math.min(20, prev + 1))}
                          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {numericAmount > 0 && (
                      <div className="p-3 rounded-xl bg-white dark:bg-surface-900 border border-indigo-100 dark:border-surface-700 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                            Your Share to Pay Now
                          </span>
                          <span className="text-base font-extrabold text-primary-600 dark:text-primary-400">
                            {formatCurrency(perPersonShare)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-surface-400">
                          (₹{numericAmount.toLocaleString('en-IN')} ÷ {splitCount})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Insufficient balance warning */}
              {isBalanceInsufficient && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-warning-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Amount exceeds your wallet balance ({formatCurrency(currentBalance)}).</span>
                </div>
              )}

              {/* Next Action */}
              <button
                type="button"
                disabled={numericAmount <= 0 || isBalanceInsufficient}
                onClick={() => setStep('review')}
                className="w-full py-3 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-primary-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Review Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 3: REVIEW PAYMENT ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200/80 dark:border-surface-700 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-surface-700">
                  <span className="text-xs text-slate-500 dark:text-surface-400">Pay To</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{recipient}</span>
                </div>

                {note && (
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-surface-700">
                    <span className="text-xs text-slate-500 dark:text-surface-400">Payment Note</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-surface-200">{note}</span>
                  </div>
                )}

                {isSplitEnabled && (
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-surface-700">
                    <span className="text-xs text-slate-500 dark:text-surface-400">Split Breakdown</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-surface-200">
                      Total ₹{numericAmount} ÷ {splitCount} people
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-surface-700">
                  <span className="text-xs text-slate-500 dark:text-surface-400">Debited From</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-surface-200">FST Pay Wallet</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-surface-400 block">Total Deduction</span>
                    <span className="text-xs text-slate-400 block">
                      Remaining after pay: {formatCurrency(currentBalance - payableAmount)}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(payableAmount)}
                  </span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-surface-400 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>256-Bit Encrypted • Instant Merchant Settlement</span>
              </div>

              {/* Confirm and Pay Button */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep('details')}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-surface-700 hover:bg-slate-100 dark:hover:bg-surface-800 text-xs font-bold text-slate-700 dark:text-surface-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmPayment}
                  className="flex-2 py-3 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-primary-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing Payment...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Pay {formatCurrency(payableAmount)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: SUCCESS STATE & JPG RECEIPT ── */}
          {step === 'success' && (
            <div className="py-4 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">Payment Successful</h4>
                <p className="text-xs text-slate-500 dark:text-surface-400 mt-1">
                  Transferred {formatCurrency(payableAmount)} to {recipient}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-800/60 border border-slate-200/80 dark:border-surface-700 text-left text-xs space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between text-slate-500 dark:text-surface-400">
                  <span>Ref ID:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-semibold">
                    {confirmedTxn?.referenceId || confirmedTxn?.id || `FST${Date.now().toString().slice(-8)}`}
                  </span>
                </div>
                {note && (
                  <div className="flex justify-between text-slate-500 dark:text-surface-400">
                    <span>Note:</span>
                    <span className="text-slate-900 dark:text-white font-medium">{note}</span>
                  </div>
                )}
                {isSplitEnabled && (
                  <div className="flex justify-between text-slate-500 dark:text-surface-400">
                    <span>Bill Split:</span>
                    <span className="text-primary-600 dark:text-primary-400 font-bold">
                      Your share paid (1 of {splitCount})
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 dark:text-surface-400">
                  <span>Timestamp:</span>
                  <span className="text-slate-900 dark:text-white">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>

              {isSplitEnabled && (
                <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 text-xs text-primary-800 dark:text-primary-300 max-w-sm mx-auto text-left">
                  <p className="font-bold">Bill Split Registered!</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    You paid your share of {formatCurrency(perPersonShare)}. Share the bill with your {splitCount - 1} friends to collect the remaining {formatCurrency(numericAmount - perPersonShare)}.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-sm mx-auto">
                <button
                  type="button"
                  disabled={isDownloadingReceipt}
                  onClick={handleDownloadReceipt}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-surface-700 hover:bg-slate-100 dark:hover:bg-surface-800 text-xs font-bold text-slate-700 dark:text-surface-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  {isDownloadingReceipt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-primary-500" />
                  )}
                  <span>Download JPG</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-lg shadow-primary-500/25 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
