import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  BarChart3,
  Bot,
  Trophy,
  Settings,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const baseNavItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/wallet', icon: Wallet, label: 'Wallet' },
  { path: '/cards', icon: CreditCard, label: 'Cards' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/ai-coach', icon: Bot, label: 'AI Coach', badge: 'AI' },
  { path: '/rewards', icon: Trophy, label: 'Rewards' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, user } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  const navItems = [
    ...baseNavItems,
    ...(user?.role === 'ADMIN' ? [{ path: '/admin', icon: Shield, label: 'Admin Panel', badge: 'Admin' }] : []),
  ];

  const isAmoled = theme === 'amoled';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 flex flex-col
          transition-all duration-400 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isAmoled
            ? 'bg-black border-r border-white/5'
            : 'bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-surface-700/50'
          }
        `}
      >
        {/* Logo */}
        <div className={`p-6 ${isAmoled ? 'border-b border-white/5' : 'border-b border-slate-200 dark:border-surface-700/50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gradient-card flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-accent tracking-[0.15em] text-slate-800 dark:text-white amoled:text-white uppercase leading-tight">
                FST Pay
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-surface-400 amoled:text-surface-500 font-medium tracking-wider uppercase">
                Premium Wallet
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 group relative overflow-hidden
                  ${isActive
                    ? 'text-white'
                    : isAmoled
                      ? 'text-surface-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 dark:text-surface-400 hover:bg-slate-100 dark:hover:bg-surface-800 hover:text-slate-800 dark:hover:text-white'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 gradient-primary opacity-90" />
                )}
                <item.icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-white' : ''}`} />
                <span className="relative z-10">{item.label}</span>
                {item.badge && (
                  <span className={`ml-auto relative z-10 ${isActive
                    ? 'badge-glass text-[10px] px-1.5 py-0.5'
                    : 'badge-primary text-[10px] px-1.5 py-0.5'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/70" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card + Logout */}
        <div className={`p-4 ${isAmoled ? 'border-t border-white/5' : 'border-t border-slate-200 dark:border-surface-700/50'}`}>
          <div className={`rounded-2xl p-3 ${isAmoled ? 'bg-white/3' : 'bg-slate-50 dark:bg-surface-800/50'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-card flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary-500/20">
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white amoled:text-white truncate">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-surface-400 amoled:text-surface-500 truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm w-full mt-2
              transition-all duration-200 haptic-tap
              ${isAmoled
                ? 'text-surface-500 hover:bg-white/5 hover:text-danger-400'
                : 'text-slate-500 dark:text-surface-400 hover:bg-danger-500/10 hover:text-danger-400'
              }
            `}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
