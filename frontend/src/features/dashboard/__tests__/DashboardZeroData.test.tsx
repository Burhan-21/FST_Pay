import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { walletApi, transactionApi, rewardsApi, analyticsApi } from '../../../api/endpoints';

let mockUser = {
  id: 'usr_real_99',
  email: 'realuser@fstpay.com',
  fullName: 'Priya Sharma',
  role: 'USER',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
};

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock('../../../api/endpoints', () => ({
  walletApi: {
    getWallet: vi.fn(),
  },
  transactionApi: {
    getTransactions: vi.fn(),
  },
  rewardsApi: {
    getStatus: vi.fn(),
  },
  analyticsApi: {
    getAnalytics: vi.fn(),
  },
}));

describe('Dashboard - STRICT Production UI & Zero Demo Data Compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders live balance and displays clean empty state when there are no transactions', async () => {
    vi.mocked(walletApi.getWallet).mockResolvedValueOnce({
      data: { data: { balance: 4500.5, currency: 'INR' } },
    } as any);

    vi.mocked(transactionApi.getTransactions).mockResolvedValueOnce({
      data: { data: { content: [] } },
    } as any);

    vi.mocked(rewardsApi.getStatus).mockResolvedValueOnce({
      data: { data: { points: 150, streakDays: 3 } },
    } as any);

    vi.mocked(analyticsApi.getAnalytics).mockResolvedValueOnce({
      data: { data: { totalCredit: 0, totalDebit: 0, netSavings: 0 } },
    } as any);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Dynamic greeting reflects real user full name
    expect(await screen.findByText(/Hi, Priya 👋/i)).toBeInTheDocument();

    // Balance displays real ₹4,500.50 from live API response
    expect(await screen.findByText(/4,500\.50/)).toBeInTheDocument();

    // Clean empty state is shown instead of fake transactions
    expect(await screen.findByText(/No transactions yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Your payment activity will appear here once you make your first transfer or top-up\./i)).toBeInTheDocument();

    // PROHIBITED DEMO DATA: Verify NO hardcoded demo balance or fake merchants exist
    expect(screen.queryByText(/12,450\.75/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rahul Shaikh/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aarav Sharma/i)).not.toBeInTheDocument();
  });

  it('renders authentic transactions when returned by the backend API', async () => {
    vi.mocked(walletApi.getWallet).mockResolvedValueOnce({
      data: { data: { balance: 12000, currency: 'INR' } },
    } as any);

    vi.mocked(transactionApi.getTransactions).mockResolvedValueOnce({
      data: {
        data: {
          content: [
            {
              id: 'tx_live_101',
              amount: 250,
              type: 'DEBIT',
              category: 'FOOD_AND_DINING',
              merchant: 'Campus Cafeteria',
              status: 'COMPLETED',
              createdAt: '2026-03-10T12:30:00Z',
            },
          ],
        },
      },
    } as any);

    vi.mocked(rewardsApi.getStatus).mockResolvedValueOnce({
      data: { data: { points: 50, streakDays: 1 } },
    } as any);

    vi.mocked(analyticsApi.getAnalytics).mockResolvedValueOnce({
      data: { data: { totalCredit: 12250, totalDebit: 250, netSavings: 12000 } },
    } as any);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Campus Cafeteria')).toBeInTheDocument();
    });

    // Verify empty state is NOT displayed when data exists
    expect(screen.queryByText(/No transactions yet/i)).not.toBeInTheDocument();
  });
});
