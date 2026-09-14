import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Send,
  Download,
  Scan,
  CreditCard,
  Receipt,
  ReceiptText,
  Trophy,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  Shield,
  SendHorizontal
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/wallet?action=send', icon: Send, label: 'Send Money' },
  { path: '/wallet?action=receive', icon: Download, label: 'Receive Money' },
  { path: '/wallet?action=scan', icon: Scan, label: 'Scan & Pay' },
  { path: '/cards', icon: CreditCard, label: 'Cards' },
  { path: '/transactions?category=BILLS', icon: Receipt, label: 'Bills & Recharges' },
  { path: '/transactions', icon: ReceiptText, label: 'Transactions' },
  { path: '/rewards', icon: Trophy, label: 'Rewards' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSendClick?: () => void;
  onReceiveClick?: () => void;
  onScanClick?: () => void;
}

export default function Sidebar({ isOpen, onClose, onSendClick, onReceiveClick, onScanClick }: SidebarProps) {
  const { logout, user } = useAuth();
  const location = useLocation();

  const handleCustomNav = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.path.includes('action=send') && onSendClick) {
      e.preventDefault();
      onSendClick();
      onClose();
    } else if (item.path.includes('action=receive') && onReceiveClick) {
      e.preventDefault();
      onReceiveClick();
      onClose();
    } else if (item.path.includes('action=scan') && onScanClick) {
      e.preventDefault();
      onScanClick();
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 flex flex-col
          transition-all duration-300 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          bg-white dark:bg-surface-900 border-r border-slate-100 dark:border-surface-800
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-500 text-white flex items-center justify-center shadow-md shadow-primary-500/25">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                FST Pay
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-surface-400 font-semibold tracking-wider uppercase mt-0.5">
                Fast · Secure · Trusted
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(e) => handleCustomNav(item, e)}
                className={`
                  flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold
                  transition-all duration-150 group
                  ${isActive
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400 font-bold shadow-xs'
                    : 'text-slate-500 dark:text-surface-400 hover:bg-slate-50 dark:hover:bg-surface-800 hover:text-slate-900 dark:hover:text-white'
                  }
                `}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {user?.role === 'PARENT' && (
            <NavLink
              to="/parent/dashboard"
              onClick={onClose}
              className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:text-surface-400 dark:hover:bg-surface-800"
            >
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Parent Panel</span>
            </NavLink>
          )}
        </nav>

        {/* Bottom Card (Mockup: "Less Hassle, More Possibilities — FST Pay") */}
        <div className="p-4 border-t border-slate-100 dark:border-surface-800 space-y-3">
          <div className="relative overflow-hidden p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 via-primary-50 to-purple-50 dark:from-surface-800 dark:to-surface-800/60 border border-primary-100/60 dark:border-surface-700/60 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">
                  Less Hassle
                </p>
                <p className="text-[11px] font-bold text-primary-600 leading-tight">
                  More Possibilities
                </p>
                <span className="inline-block mt-2 text-[9px] font-bold text-slate-500 dark:text-surface-400 uppercase tracking-wider">
                  FST Pay
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white dark:bg-surface-700 shadow-sm flex items-center justify-center text-primary-500">
                <SendHorizontal className="w-5 h-5 -rotate-45" />
              </div>
            </div>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-surface-400 font-medium truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-surface-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
