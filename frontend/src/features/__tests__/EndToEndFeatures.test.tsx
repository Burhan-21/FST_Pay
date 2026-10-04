import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BillsRechargeModal from '../../components/modals/BillsRechargeModal';
import AiCoachPage from '../ai-coach/AiCoachPage';
import AnalyticsPage from '../analytics/AnalyticsPage';
import { ThemeProvider } from '../../context/ThemeContext';
import { transactionApi, goalsApi, analyticsApi } from '../../api/endpoints';

// Polyfill scrollIntoView for jsdom
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.Element.prototype.scrollIntoView = vi.fn();
});

// Mocks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'teen-1', fullName: 'Teen User', role: 'TEEN' },
  }),
}));

vi.mock('../../api/endpoints', () => ({
  transactionApi: {
    simulateSpend: vi.fn(),
    getTransactions: vi.fn(),
    exportTransactions: vi.fn(),
  },
  goalsApi: {
    getGoals: vi.fn(),
    createGoal: vi.fn(),
    addMoney: vi.fn(),
    getRoundUp: vi.fn().mockResolvedValue({ data: { data: null } }),
  },
  walletApi: {
    getWallet: vi.fn().mockResolvedValue({ data: { data: { balance: 5000 } } }),
  },
  aiApi: {
    chat: vi.fn(),
    getHealthScore: vi.fn().mockResolvedValue({ data: { data: null } }),
    getTips: vi.fn().mockResolvedValue({ data: { data: [] } }),
    getBudgetPlan: vi.fn().mockResolvedValue({ data: { data: null } }),
    getAnomalies: vi.fn().mockResolvedValue({ data: { data: [] } }),
    getForecast: vi.fn().mockResolvedValue({ data: { data: null } }),
    getAlerts: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
  analyticsApi: {
    getAnalytics: vi.fn(),
    getFinancialHealth: vi.fn(),
    getMonthlyInsights: vi.fn(),
    getSpendingPredictions: vi.fn(),
  },
  gamificationApi: {
    getLeaderboard: vi.fn(),
  },
  cardApi: {
    getCards: vi.fn(),
    updateCardDesign: vi.fn(),
  },
}));

describe('Bills & Recharge Modal Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transactionApi.simulateSpend).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        data: {
          id: 'txn-bill-123',
          amount: 299,
          type: 'DEBIT',
          status: 'COMPLETED',
          category: 'BILLS',
          merchant: 'Reliance Jio',
          description: 'Mobile Recharge for +91 9876543210 (Reliance Jio)',
          createdAt: '2026-09-14T10:00:00Z',
        },
      },
    } as never);
  });

  it('allows user to select operator, select a recharge plan, and pay successfully', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <BillsRechargeModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        currentBalance={1500}
        initialCategory="MOBILE"
      />
    );

    expect(screen.getByText(/Bills & Recharge/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mobile/i })).toBeInTheDocument();

    // Enter 10-digit mobile number
    const phoneInput = screen.getByPlaceholderText(/98765 43210/i);
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    // Click on a popular plan (₹299)
    const plan299 = screen.getByText('₹299');
    fireEvent.click(plan299);

    // Proceed to Review
    const continueBtn = screen.getByRole('button', { name: /Continue to Pay/i });
    fireEvent.click(continueBtn);

    // Check review screen
    await waitFor(() => {
      expect(screen.getByText('Biller / Operator')).toBeInTheDocument();
      expect(screen.getByText(/Reliance Jio/i)).toBeInTheDocument();
    });

    // Click Pay Now
    const payBtn = screen.getByRole('button', { name: /Confirm & Pay/i });
    fireEvent.click(payBtn);

    // Verify simulateSpend called
    await waitFor(() => {
      expect(transactionApi.simulateSpend).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 299,
          category: 'BILLS',
          merchant: 'Reliance Jio',
        })
      );
      expect(screen.getByText(/Payment Successful!/i)).toBeInTheDocument();
      expect(screen.getByText(/Download Receipt/i)).toBeInTheDocument();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('switches between categories properly (Electricity/Power, Broadband, DTH, Gas/Water)', async () => {
    render(
      <BillsRechargeModal
        isOpen={true}
        onClose={vi.fn()}
        currentBalance={1000}
      />
    );

    // Click Electricity/Power tab
    fireEvent.click(screen.getByRole('button', { name: /Power/i }));
    expect(screen.getByText(/Consumer \/ Account Number/i)).toBeInTheDocument();

    // Click Broadband tab
    fireEvent.click(screen.getByRole('button', { name: /Broadband/i }));
    expect(screen.getByText(/Consumer \/ Account Number/i)).toBeInTheDocument();

    // Click DTH tab
    fireEvent.click(screen.getByRole('button', { name: /DTH/i }));
    expect(screen.getByText(/Consumer \/ Account Number/i)).toBeInTheDocument();

    // Click Gas/Water tab
    fireEvent.click(screen.getByRole('button', { name: /Gas\/Water/i }));
    expect(screen.getByText(/Consumer \/ Account Number/i)).toBeInTheDocument();
  });
});

describe('Goals Flow & Date Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(goalsApi.getGoals).mockResolvedValue({
      data: { data: [] },
    } as never);
    vi.mocked(goalsApi.createGoal).mockResolvedValue({
      data: {
        data: {
          id: 'goal-1',
          name: 'Gaming Headphones',
          targetAmount: 4000,
          currentAmount: 0,
          targetDate: '2026-12-31',
          category: 'SHOPPING',
          status: 'IN_PROGRESS',
        },
      },
    } as never);
  });

  it('allows typing goal name and selecting quick target date shortcut', async () => {
    render(
      <MemoryRouter>
        <AiCoachPage />
      </MemoryRouter>
    );

    // Switch to Savings Goals tab
    const goalsTabBtn = await screen.findByRole('button', { name: /Savings Goals/i });
    fireEvent.click(goalsTabBtn);

    // Open Create Goal Modal
    const openModalBtn = await screen.findByRole('button', { name: /Create Goal/i });
    expect(openModalBtn).toBeInTheDocument();
    fireEvent.click(openModalBtn);

    expect(screen.getByText('Create Savings Goal')).toBeInTheDocument();

    // Enter goal name smoothly
    const titleInput = screen.getByPlaceholderText(/College Laptop/i);
    fireEvent.change(titleInput, { target: { value: 'Sony WH-1000XM5 Headphones' } });
    expect(titleInput).toHaveValue('Sony WH-1000XM5 Headphones');

    // Enter target amount
    const amountInput = screen.getByLabelText(/Target Amount/i);
    fireEvent.change(amountInput, { target: { value: '4000' } });

    // Click quick target date button '+3M'
    const threeMonthsBtn = screen.getByRole('button', { name: '+3M' });
    fireEvent.click(threeMonthsBtn);

    // Date input should be populated
    const dateInput = screen.getByLabelText(/Target Date \*/i) as HTMLInputElement;
    expect(dateInput.value).not.toBe('');

    // Submit form (button inside modal form)
    const submitBtn = screen.getAllByRole('button', { name: /^Create Goal$/i }).slice(-1)[0];
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(goalsApi.createGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sony WH-1000XM5 Headphones',
          targetAmount: 4000,
        })
      );
    });
  });
});

describe('Analytics Page Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analyticsApi.getAnalytics).mockResolvedValue({
      data: {
        data: {
          totalCredit: 15000,
          totalDebit: 7200,
          netSavings: 7800,
          dailyAverageSpend: 240,
          spendByCategory: {
            FOOD: 3200,
            SHOPPING: 2500,
            ENTERTAINMENT: 1500,
          },
          flowData: [],
          dailyTrend: [],
        },
      },
    } as never);
    vi.mocked(transactionApi.getTransactions).mockResolvedValue({
      data: { data: { content: [] } },
    } as never);
  });

  it('renders summary cards, Financial Health banner, and statement export buttons', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AnalyticsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Inflow/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Outflow/i)).toBeInTheDocument();
      expect(screen.getByText(/Net Savings/i)).toBeInTheDocument();
      expect(screen.getByText(/Savings Efficiency/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /CSV/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /PDF/i })).toBeInTheDocument();
    });
  });
});
