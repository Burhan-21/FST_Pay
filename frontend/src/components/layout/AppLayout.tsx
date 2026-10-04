import { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import CommandPalette from './CommandPalette';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationStream } from '../../hooks/useNotificationStream';
import { walletApi, transactionApi } from '../../api/endpoints';
import type { Transaction } from '../../types';

import SendMoneyModal from '../modals/SendMoneyModal';
import ReceiveMoneyModal from '../modals/ReceiveMoneyModal';
import ScanPayModal from '../modals/ScanPayModal';
import AddMoneyModal from '../modals/AddMoneyModal';
import BillsRechargeModal, { type BillCategory } from '../modals/BillsRechargeModal';

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
  '/parent/dashboard': 'Parent Panel',
  '/parent/approvals': 'Approvals Queue',
};

export interface AppLayoutContextType {
  openSend: (recipient?: string, amount?: string) => void;
  openReceive: () => void;
  openScan: () => void;
  openAdd: () => void;
  openBillsRecharge: (category?: BillCategory) => void;
  walletBalance: number;
  recentTransactions: Transaction[];
  triggerRefresh: () => void;
  refreshTrigger: number;
}

export default function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { isConnected } = useNotificationStream();
  const location = useLocation();
  const title = pageTitles[location.pathname] || (location.pathname.startsWith('/parent/child/') ? 'Child Details' : '');

  // Global Real Wallet & Transactions state for modals & subcomponents
  const [walletBalance, setWalletBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBillsOpen, setIsBillsOpen] = useState(false);
  const [billsCategory, setBillsCategory] = useState<BillCategory>('MOBILE');
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchLayoutData = useCallback(async () => {
    try {
      const [walletRes, txnRes] = await Promise.all([
        walletApi.getWallet().catch(() => ({ data: { data: { balance: 0 } } })),
        transactionApi.getTransactions({ size: 50 }).catch(() => ({ data: { data: { content: [] } } })),
      ]);
      if (walletRes.data?.data) {
        setWalletBalance(walletRes.data.data.balance || 0);
      }
      const txns = txnRes.data?.data?.content || txnRes.data?.data || [];
      setRecentTransactions(txns);
    } catch (err) {
      console.error('Failed to sync wallet in layout:', err);
    }
  }, []);

  useEffect(() => {
    fetchLayoutData();
  }, [fetchLayoutData, refreshTrigger]);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const openSend = (recipient = '', amount = '') => {
    setSendRecipient(recipient);
    setSendAmount(amount);
    setIsSendOpen(true);
  };

  const openReceive = () => setIsReceiveOpen(true);
  const openScan = () => setIsScanOpen(true);
  const openAdd = () => setIsAddOpen(true);
  const openBillsRecharge = (category: BillCategory = 'MOBILE') => {
    setBillsCategory(category);
    setIsBillsOpen(true);
  };

  const handleScanSuccess = (data: { recipient: string; amount?: string }) => {
    setIsScanOpen(false);
    openSend(data.recipient, data.amount);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const contextValue: AppLayoutContextType = {
    openSend,
    openReceive,
    openScan,
    openAdd,
    openBillsRecharge,
    walletBalance,
    recentTransactions,
    triggerRefresh,
    refreshTrigger,
  };

  return (
    <div className="min-h-screen bg-[#F7FAFF] dark:bg-surface-950 flex transition-colors duration-500 font-sans relative">
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-primary-600 focus:text-white focus:text-xs focus:font-bold focus:rounded-xl focus:shadow-xl focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSendClick={() => openSend()}
        onReceiveClick={openReceive}
        onScanClick={openScan}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          onSearchClick={() => setCommandPaletteOpen(true)}
          isLiveConnected={isConnected}
        />

        <main id="main-content" className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet context={contextValue} />

          {/* Global Accessible App Footer */}
          <footer className="mt-12 pt-6 pb-2 border-t border-slate-200/80 dark:border-surface-800 text-xs text-slate-500 dark:text-surface-400 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3 font-medium">
              <Link to="/privacy" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Privacy</Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Terms</Link>
              <span>·</span>
              <Link to="/cookies" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Cookies</Link>
              <span>·</span>
              <Link to="/refund" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Refunds</Link>
            </div>
            <p className="text-center sm:text-right">
              &copy; {new Date().getFullYear()} [LEGAL ENTITY NAME]. All rights reserved.
            </p>
          </footer>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav onScanClick={openScan} />
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed bottom-20 lg:bottom-8 right-6 p-3 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 hover:bg-primary-700 active:scale-95 transition-all z-40 focus:outline-hidden focus:ring-2 focus:ring-primary-400"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {commandPaletteOpen && (
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onOpenSend={() => openSend()}
          onOpenReceive={openReceive}
          onOpenScan={openScan}
          onOpenAdd={openAdd}
        />
      )}

      {/* Global Interactive Modals */}
      <SendMoneyModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        onSuccess={triggerRefresh}
        currentBalance={walletBalance}
        recentTransactions={recentTransactions}
        initialRecipient={sendRecipient}
        initialAmount={sendAmount}
      />

      <ReceiveMoneyModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        user={user}
      />

      <ScanPayModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onScanSuccess={handleScanSuccess}
        currentBalance={walletBalance}
        onSuccess={triggerRefresh}
      />

      <AddMoneyModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={triggerRefresh}
        currentBalance={walletBalance}
      />

      <BillsRechargeModal
        isOpen={isBillsOpen}
        onClose={() => setIsBillsOpen(false)}
        onSuccess={triggerRefresh}
        currentBalance={walletBalance}
        initialCategory={billsCategory}
      />
    </div>
  );
}
