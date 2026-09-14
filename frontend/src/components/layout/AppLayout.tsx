import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
    walletBalance,
    recentTransactions,
    triggerRefresh,
    refreshTrigger,
  };

  return (
    <div className="min-h-screen bg-[#F7FAFF] dark:bg-surface-950 flex transition-colors duration-500 font-sans">
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

        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet context={contextValue} />
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav onScanClick={openScan} />
      </div>

      {commandPaletteOpen && (
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
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
      />

      <AddMoneyModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={triggerRefresh}
        currentBalance={walletBalance}
      />
    </div>
  );
}
