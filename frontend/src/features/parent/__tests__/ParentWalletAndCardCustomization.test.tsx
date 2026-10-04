import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ParentDashboard from '../ParentDashboard';
import ChildOverview from '../ChildOverview';
import { parentalApi, walletApi } from '../../../api/endpoints';
import type { ParentDashboardData, ChildDetail } from '../../../types';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'parent-1', email: 'parent@example.com', fullName: 'Jane Parent', role: 'PARENT' },
  }),
}));

vi.mock('../../../api/endpoints', () => ({
  parentalApi: {
    getDashboard: vi.fn(),
    getAllowances: vi.fn(),
    getChildDetails: vi.fn(),
    sendPocketMoney: vi.fn(),
    updateChildCardDesign: vi.fn(),
    freezeChildCard: vi.fn(),
    unfreezeChildCard: vi.fn(),
    unlinkChild: vi.fn(),
    markNotificationsAsRead: vi.fn(),
  },
  walletApi: {
    getWallet: vi.fn(),
    topUp: vi.fn(),
  },
}));

describe('Parent Dashboard - Add Money & Multi-Payment Pocket Money', () => {
  const mockDashboard: ParentDashboardData = {
    children: [
      {
        id: 'teen-1',
        fullName: 'Alex Teen',
        email: 'alex@example.com',
        isActive: true,
        parentalControlEnabled: true,
        walletBalance: 1200,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    totalChildrenBalance: 1200,
    totalPocketMoneySentThisMonth: 500,
    parentWalletBalance: 4500,
    pendingApprovalsCount: 0,
    recentNotifications: [],
    activityTimeline: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parentalApi.getDashboard).mockResolvedValue({
      data: { data: mockDashboard },
    } as any);
    vi.mocked(parentalApi.getAllowances).mockResolvedValue({
      data: { data: [] },
    } as any);
    vi.mocked(walletApi.getWallet).mockResolvedValue({
      data: { data: { balance: 4500, currency: 'INR' } },
    } as any);
  });

  it('renders Parent Wallet & Add Money section with balance and buttons', async () => {
    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Parent FST Wallet')).toBeInTheDocument();
      expect(screen.getByText('Add Money')).toBeInTheDocument();
      expect(screen.getByText('Active • KYC Verified')).toBeInTheDocument();
    });
  });

  it('opens pocket money modal with multi-payment methods and dispatches transfer', async () => {
    vi.mocked(parentalApi.sendPocketMoney).mockResolvedValue({
      data: { message: 'Success' },
    } as any);

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Send Pocket Money').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Send Pocket Money')[0]);

    await waitFor(() => {
      expect(screen.getByText('Send Pocket Money to Teen')).toBeInTheDocument();
      expect(screen.getByText('FST Wallet')).toBeInTheDocument();
      expect(screen.getByText('UPI Fast')).toBeInTheDocument();
      expect(screen.getByText('Debit/Credit')).toBeInTheDocument();
      expect(screen.getByText('Net Banking')).toBeInTheDocument();
    });

    // Enter amount and select UPI
    const amtInput = screen.getByPlaceholderText('250.00');
    fireEvent.change(amtInput, { target: { value: '300' } });

    fireEvent.click(screen.getByText('UPI Fast'));

    const submitBtn = screen.getByRole('button', { name: /Send ₹300/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(parentalApi.sendPocketMoney).toHaveBeenCalledWith(
        expect.objectContaining({
          childId: 'teen-1',
          amount: 300,
          paymentMethod: 'UPI',
        })
      );
    });
  });
});

describe('Child Overview - Virtual Card Customization', () => {
  const mockChildDetail: ChildDetail = {
    id: 'teen-1',
    fullName: 'Alex Teen',
    email: 'alex@example.com',
    relationship: 'SON',
    parentalControlEnabled: true,
    parentalMaxTxnAmount: 1000,
    parentalDailyLimit: 2000,
    parentalWeeklyLimit: 5000,
    parentalMonthlyLimit: 10000,
    parentalRestrictedCategories: '',
    walletBalance: 1200,
    walletCurrency: 'INR',
    virtualCards: [
      {
        id: 'card-1',
        userId: 'teen-1',
        cardNumber: '4111222233334444',
        cardHolder: 'Alex Teen',
        expiryMonth: 12,
        expiryYear: 28,
        status: 'ACTIVE',
        cardType: 'PREPAID CARD',
        cardDesign: JSON.stringify({ bg: 'titanium' }),
        spendingLimit: 5000,
        dailyLimit: 2000,
        isOneTime: false,
        merchantLock: [],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    activeGoals: [],
    recentTransactions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parentalApi.getChildDetails).mockResolvedValue({
      data: { data: mockChildDetail },
    } as any);
  });

  it('renders child card with Customize button and opens customization modal', async () => {
    render(
      <MemoryRouter initialEntries={['/parent/child/teen-1']}>
        <Routes>
          <Route path="/parent/child/:childId" element={<ChildOverview />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alex Teen').length).toBeGreaterThan(0);
      expect(screen.getByText('Customize')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Customize'));

    await waitFor(() => {
      expect(screen.getByText('Customize Teen Virtual Card')).toBeInTheDocument();
      expect(screen.getByText('Finish Themes')).toBeInTheDocument();
      expect(screen.getByText('Image URL')).toBeInTheDocument();
      expect(screen.getByText('Upload Image')).toBeInTheDocument();
      expect(screen.getByText('Save Card Design')).toBeInTheDocument();
    });
  });
});
