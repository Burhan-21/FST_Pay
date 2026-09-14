import { NavLink } from 'react-router-dom';
import { Home, ReceiptText, Scan, Trophy, User } from 'lucide-react';

interface BottomNavProps {
  onScanClick: () => void;
}

export default function BottomNav({ onScanClick }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-surface-800 lg:hidden px-4 py-2 safe-area-pb shadow-lg shadow-slate-200/50 dark:shadow-none">
      <div className="flex items-center justify-around relative">
        {/* Left item: Home */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              isActive ? 'text-primary-600 font-bold' : 'text-slate-400 dark:text-surface-400 hover:text-slate-600'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </NavLink>

        {/* Transactions */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              isActive ? 'text-primary-600 font-bold' : 'text-slate-400 dark:text-surface-400 hover:text-slate-600'
            }`
          }
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px]">History</span>
        </NavLink>

        {/* Center elevated Scan & Pay Button */}
        <div className="-mt-7">
          <button
            onClick={onScanClick}
            className="w-13 h-13 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/40 active:scale-95 transition-transform"
            aria-label="Scan and Pay QR"
          >
            <Scan className="w-6 h-6" />
          </button>
        </div>

        {/* Rewards */}
        <NavLink
          to="/rewards"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              isActive ? 'text-primary-600 font-bold' : 'text-slate-400 dark:text-surface-400 hover:text-slate-600'
            }`
          }
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px]">Rewards</span>
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              isActive ? 'text-primary-600 font-bold' : 'text-slate-400 dark:text-surface-400 hover:text-slate-600'
            }`
          }
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
}
