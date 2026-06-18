import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import CommandPalette from './CommandPalette';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/wallet': 'Wallet',
  '/cards': 'Virtual Cards',
  '/transactions': 'Transactions',
  '/analytics': 'Analytics',
  '/ai-coach': 'AI Money Coach',
  '/rewards': 'Rewards',
  '/settings': 'Settings',
  '/admin': 'Admin Panel',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const location = useLocation();
  const title = pageTitles[location.pathname] || '';

  useEffect(() => {
    setPageKey(prev => prev + 1);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-950 amoled:bg-black flex transition-colors duration-700">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Floating Spirit-Inspired Background Layers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary-500/8 dark:bg-primary-600/10 amoled:bg-primary-500/5 rounded-full blur-[150px] layer-1" />
          <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] bg-accent-400/8 dark:bg-accent-500/10 amoled:bg-accent-400/5 rounded-full blur-[120px] layer-2" />
          <div className="absolute bottom-20 left-1/4 w-[350px] h-[350px] bg-purple-400/6 dark:bg-purple-500/8 amoled:bg-purple-400/3 rounded-full blur-[100px] layer-3" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/5 dark:bg-primary-500/6 amoled:bg-primary-400/3 rounded-full blur-[200px] layer-4" />
        </div>

        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          onSearchClick={() => setCommandPaletteOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto gradient-mesh relative z-10">
          <div key={pageKey} className="max-w-7xl mx-auto page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
