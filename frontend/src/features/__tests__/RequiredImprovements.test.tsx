import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettlementBadge } from '../../components/ui/SettlementBadge';
import TransactionsPage from '../transactions/TransactionsPage';
import GoalsPage from '../goals/GoalsPage';
import ParentDashboard from '../parent/ParentDashboard';
import { ThemeProvider } from '../../context/ThemeContext';
import { transactionApi, goalsApi, parentalApi, rewardsApi, reportsApi, walletApi } from '../../api/endpoints';

// Polyfills
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.Element.prototype.scrollIntoView = vi.fn();
});

// Mocks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'parent-1', fullName: 'John Doe', email: 'john@example.com', role: 'PARENT' },
    logout: vi.fn(),
  }),
}));

vi.mock('../../api/endpoints', () => ({
  transactionApi: {
    getTransactions: vi.fn(),
    simulateSpend: vi.fn(),
    exportTransactions: vi.fn(),
  },
  fxApi: {
    getQuote: vi.fn(),
  },
  goalsApi: {
    getGoals: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    allocateFunds: vi.fn(),
    withdrawFunds: vi.fn(),
    getRoundUp: vi.fn(),
    setRoundUp: vi.fn(),
    disableRoundUp: vi.fn(),
  },
  parentalApi: {
    getDashboard: vi.fn(),
    getAllowances: vi.fn(),
    getChildDetails: vi.fn(),
    updateChildCardDesign: vi.fn(),
    setSpendingLimits: vi.fn(),
    triggerAllowance: vi.fn(),
    deleteAllowance: vi.fn(),
    updateAllowance: vi.fn(),
    markNotificationsAsRead: vi.fn(),
  },
  rewardsApi: {
    getStatus: vi.fn(),
    getCatalog: vi.fn(),
    claimStreak: vi.fn(),
    redeemItem: vi.fn(),
    getBadges: vi.fn(),
    getRedemptions: vi.fn(),
  },
  reportsApi: {
    requestMonthlyReport: vi.fn(),
  },
  walletApi: {
    getWallet: vi.fn(),
  },
  aiApi: {
    getHealthScore: vi.fn(),
    getTips: vi.fn(),
    chat: vi.fn(),
  },
  contactsApi: {
    getContacts: vi.fn(),
  },
  analyticsApi: {
    getAnalytics: vi.fn(),
  },
}));

describe('1. SettlementBadge Status Handling', () => {
  it('renders Successful/Settled badge with emerald styling', () => {
    const { rerender } = render(<SettlementBadge status="SUCCESSFUL" />);
    expect(screen.getByText(/successful/i)).toBeInTheDocument();

    rerender(<SettlementBadge status="SETTLED" />);
    expect(screen.getByText(/settled/i)).toBeInTheDocument();
  });

  it('renders Pending badge with amber styling', () => {
    render(<SettlementBadge status="PENDING" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('renders Failed badge with rose styling', () => {
    render(<SettlementBadge status="FAILED" />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('renders Cancelled badge with slate styling', () => {
    render(<SettlementBadge status="CANCELLED" />);
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
  });
});

describe('2. Transactions Page with Status Filter and Details Modal', () => {
  const mockTxns = [
    {
      id: 'txn-101',
      merchant: 'Swiggy',
      amount: 450,
      balanceAfter: 4550,
      category: 'FOOD',
      type: 'DEBIT',
      status: 'SUCCESSFUL',
      createdAt: '2026-09-14T10:00:00Z',
      description: 'Lunch order',
    },
    {
      id: 'txn-102',
      merchant: 'Steam Games',
      amount: 1200,
      balanceAfter: 4550,
      category: 'ENTERTAINMENT',
      type: 'DEBIT',
      status: 'FAILED',
      createdAt: '2026-09-14T11:00:00Z',
      description: 'Game purchase declined',
    },
    {
      id: 'txn-103',
      merchant: 'Electricity Board',
      amount: 850,
      balanceAfter: 4550,
      category: 'BILLS',
      type: 'DEBIT',
      status: 'PENDING',
      createdAt: '2026-09-14T12:00:00Z',
      description: 'Power bill payment',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (transactionApi.getTransactions as any).mockResolvedValue({
      data: { data: { content: mockTxns } },
    });
  });

  it('displays Status filter tabs and filters transactions', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <TransactionsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Swiggy')).toBeInTheDocument();
      expect(screen.getByText('Steam Games')).toBeInTheDocument();
    });

    // Verify Status filter tabs exist
    expect(screen.getByText('✓ Successful')).toBeInTheDocument();
    expect(screen.getByText('✗ Failed')).toBeInTheDocument();
    expect(screen.getByText('⏳ Pending')).toBeInTheDocument();

    // Click Successful filter
    fireEvent.click(screen.getByText('✓ Successful'));
    expect(screen.getByText('Swiggy')).toBeInTheDocument();
    expect(screen.queryByText('Steam Games')).not.toBeInTheDocument();

    // Click Failed filter
    fireEvent.click(screen.getByText('✗ Failed'));
    expect(screen.getByText('Steam Games')).toBeInTheDocument();
    expect(screen.queryByText('Swiggy')).not.toBeInTheDocument();
  });

  it('opens Transaction Details modal when row is clicked and provides Download Slip', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <TransactionsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Swiggy')).toBeInTheDocument();
    });

    // Click on Swiggy row
    fireEvent.click(screen.getByText('Swiggy'));

    await waitFor(() => {
      expect(screen.getByText('Transaction Details')).toBeInTheDocument();
      expect(screen.getByText('Download Slip')).toBeInTheDocument();
    });
  });
});

describe('3. Goals Page: Continuous Typing & Target Date Selection', () => {
  const mockGoals = [
    {
      id: 'goal-1',
      name: 'PlayStation 5 Pro',
      targetAmount: 50000,
      currentAmount: 15000,
      targetDate: '2026-12-31',
      priority: 'HIGH',
      icon: '🎮',
      color: '#6366f1',
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (walletApi.getWallet as any).mockResolvedValue({ data: { data: { balance: 5000, currency: 'INR' } } });
    (goalsApi.getGoals as any).mockResolvedValue({
      data: { data: mockGoals },
    });
    (goalsApi.getRoundUp as any).mockResolvedValue({
      data: { data: { active: true, nearest: 10 } },
    });
  });

  it('allows continuous typing without blur and allows target date selection', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <GoalsPage />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PlayStation 5 Pro')).toBeInTheDocument();
    });

    // Open Create Goal Modal
    const createBtn = screen.getByText('New Goal');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText(/Create a New Savings Goal/i)).toBeInTheDocument();
    });

    // Find Name Input and test continuous typing
    const nameInput = screen.getByPlaceholderText(/e\.g\. New Laptop/i);
    fireEvent.change(nameInput, { target: { value: 'MacBook Air M3' } });
    expect(nameInput).toHaveValue('MacBook Air M3');

    // Click a duration shortcut (+3M)
    const threeMonthBtn = screen.getByText('+3M');
    fireEvent.click(threeMonthBtn);

    const dateInput = screen.getByLabelText(/target date/i);
    expect(dateInput).not.toHaveValue('');
  });
});

describe('4. Parent Rewards & Level Up on Parent Dashboard', () => {
  const mockParentDash = {
    children: [
      {
        id: 'child-1',
        fullName: 'Alex Doe',
        email: 'alex@example.com',
        walletBalance: 1200,
        parentalControlEnabled: true,
        parentalDailyLimit: 500,
        parentalMonthlyLimit: 5000,
        parentalMaxTxnAmount: 500,
        cards: [
          {
            id: 'card-1',
            userId: 'child-1',
            cardNumber: '4532 8765 4321 9876',
            cardHolder: 'Alex Doe',
            expiryMonth: 12,
            expiryYear: 2028,
            cardType: 'VISA',
            status: 'ACTIVE',
            isOneTime: false,
            cardDesign: JSON.stringify({ bg: 'sapphire' }),
            createdAt: '2026-09-14T00:00:00Z',
          },
        ],
      },
    ],
    totalChildrenBalance: 1200,
    totalPocketMoneySentThisMonth: 1500,
    pendingApprovalsCount: 0,
    activityTimeline: [],
  };

  const mockRewardsStatus = {
    points: 350,
    streakDays: 5,
    xp: 220,
    level: 3,
    currentLevelXpBoundary: 100,
    nextLevelXpBoundary: 300,
    lastStreakAt: '2026-09-13T10:00:00Z',
  };

  const mockCatalog = [
    {
      id: 'reward-1',
      title: 'Amazon ₹500 Shopping Gift Card',
      description: 'Flat ₹500 off on Amazon Pantry & Books',
      costPoints: 200,
      stock: 10,
      code: 'AMZN500',
      createdAt: '2026-09-14T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (walletApi.getWallet as any).mockResolvedValue({ data: { data: { balance: 5000, currency: 'INR' } } });
    (parentalApi.getDashboard as any).mockResolvedValue({ data: { data: mockParentDash } });
    (parentalApi.getAllowances as any).mockResolvedValue({ data: { data: [] } });
    (parentalApi.getChildDetails as any).mockResolvedValue({ data: { data: mockParentDash.children[0] } });
    (rewardsApi.getStatus as any).mockResolvedValue({ data: { data: mockRewardsStatus } });
    (rewardsApi.getCatalog as any).mockResolvedValue({ data: { data: mockCatalog } });
  });

  it('renders Parent Rewards card with streak claiming and rewards catalog', async () => {
    (rewardsApi.claimStreak as any).mockResolvedValue({
      data: { data: { ...mockRewardsStatus, streakDays: 6, points: 360 } },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ParentDashboard />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Guardian Rewards & Perks')).toBeInTheDocument();
      expect(screen.getByText(/Level 3 Guardian Club/i)).toBeInTheDocument();
      expect(screen.getByText('350 Points')).toBeInTheDocument();
      expect(screen.getByText('Amazon ₹500 Shopping Gift Card')).toBeInTheDocument();
    });

    // Claim streak button
    const claimBtn = screen.getByText('Claim Streak');
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(rewardsApi.claimStreak).toHaveBeenCalled();
    });
  });

  it('allows parent to open card customization for teen directly', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ParentDashboard />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Customize Card')).toBeInTheDocument();
    });

    // Click Customize Card
    fireEvent.click(screen.getByText('Customize Card'));

    await waitFor(() => {
      expect(screen.getByText(/Customize Alex Doe's Card/i)).toBeInTheDocument();
      expect(screen.getByText('Upload File')).toBeInTheDocument();
      expect(screen.getByText('Image URL')).toBeInTheDocument();
    });
  });
});

describe('5. Monthly Statement Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (walletApi.getWallet as any).mockResolvedValue({ data: { data: { balance: 5000, currency: 'INR' } } });
    (parentalApi.getDashboard as any).mockResolvedValue({
      data: {
        data: {
          children: [],
          totalChildrenBalance: 0,
          totalPocketMoneySentThisMonth: 0,
          pendingApprovalsCount: 0,
          activityTimeline: [],
        },
      },
    });
    (parentalApi.getAllowances as any).mockResolvedValue({ data: { data: [] } });
    (rewardsApi.getStatus as any).mockResolvedValue({ data: { data: null } });
    (rewardsApi.getCatalog as any).mockResolvedValue({ data: { data: [] } });
  });

  it('triggers reportsApi.requestMonthlyReport and displays success alert', async () => {
    (reportsApi.requestMonthlyReport as any).mockResolvedValue({
      data: { message: 'Monthly report sent successfully' },
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ParentDashboard />
        </ThemeProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Email Monthly Statement')).toBeInTheDocument();
    });

    const emailBtn = screen.getByText('Email Monthly Statement');
    fireEvent.click(emailBtn);

    await waitFor(() => {
      expect(reportsApi.requestMonthlyReport).toHaveBeenCalled();
      expect(screen.getByText(/Statement Dispatched/i)).toBeInTheDocument();
    });
  });
});
