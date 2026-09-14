import { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Scan, ArrowRight } from 'lucide-react';

interface ScanPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: { recipient: string; amount?: string }) => void;
}

export default function ScanPayModal({ isOpen, onClose, onScanSuccess }: ScanPayModalProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported on this browser or device.');
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
    } catch (err) {
      setCameraError('Camera access denied. You can upload an image or type the UPI ID below.');
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
        const am = url.searchParams.get('am') || undefined;
        return { recipient: pa || raw, amount: am };
      }
    } catch {}
    return { recipient: raw };
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const parsed = parseUpiUri(manualInput.trim());
    stopCamera();
    onScanSuccess(parsed);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // For demonstrative fallback, prompt user or extract filename
    const simulatedScan = file.name.includes('@') ? file.name.replace(/\.[^/.]+$/, '') : 'merchant@fstpay';
    stopCamera();
    onScanSuccess({ recipient: simulatedScan });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-surface-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Scan & Pay</h3>
              <p className="text-xs text-slate-500 dark:text-surface-400">Point at any UPI QR code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="p-6 space-y-4">
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
                {cameraError && <p className="text-[11px] text-rose-400">{cameraError}</p>}
              </div>
            )}

            {/* Viewfinder Target Box Overlay */}
            <div className="absolute inset-8 pointer-events-none border-2 border-primary-400/80 rounded-2xl">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary-500 -mt-1 -ml-1 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary-500 -mt-1 -mr-1 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary-500 -mb-1 -ml-1 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary-500 -mb-1 -mr-1 rounded-br" />
            </div>
          </div>

          {/* Upload QR Image or Enter Manually */}
          <div className="flex items-center gap-3">
            <label className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-surface-700 hover:bg-slate-50 dark:hover:bg-surface-800 text-xs font-semibold text-slate-700 dark:text-surface-200 flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-primary-500" />
              <span>Upload QR Image</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-slate-100 dark:border-surface-800">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Or Enter UPI ID / Phone
            </label>
            <div className="relative">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. merchant@upi or 9876543210"
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <span>Proceed</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
