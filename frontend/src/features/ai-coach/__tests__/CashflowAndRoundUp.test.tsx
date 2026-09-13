import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiCoachPage from '../AiCoachPage';
import { aiApi, goalsApi, walletApi } from '../../../api/endpoints';
import type { ForecastData, RoundUpRule, WalletGoal } from '../../../types';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: () => <div data-testid="bar-chart" />,
  LineChart: () => <div data-testid="line-chart" />,
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

// Mock APIs
vi.mock('../../../api/endpoints', () => ({
  aiApi: {
    chat: vi.fn(),
    getHealthScore: vi.fn(),
    getTips: vi.fn(),
    getForecast: vi.fn(),
    getBudgetPlan: vi.fn(),
    getAlerts: vi.fn(),
    runScan: vi.fn(),
  },
  goalsApi: {
    getGoals: vi.fn(),
    createGoal: vi.fn(),
    deleteGoal: vi.fn(),
    allocateFunds: vi.fn(),
    withdrawFunds: vi.fn(),
    getRoundUp: vi.fn(),
    setRoundUp: vi.fn(),
    disableRoundUp: vi.fn(),
  },
  walletApi: {
    getWallet: vi.fn(),
  },
}));

describe('AiCoachPage - Monte Carlo Cashflow & Round-Up Rules', () => {
  const mockGoals: WalletGoal[] = [
    {
      id: 'goal-1',
      name: 'Gaming Rig',
      targetAmount: 50000,
      currentAmount: 15000,
      allocatedAmount: 15000,
      withdrawnAmount: 0,
      targetDate: '2026-12-31',
      priority: 'HIGH',
      icon: '🎮',
      status: 'ACTIVE',
      roundUpEnabled: true,
      roundUpNearest: 50,
      roundUpAccumulated: 240,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'goal-2',
      name: 'Sneakers',
      targetAmount: 8000,
      currentAmount: 2000,
      allocatedAmount: 2000,
      withdrawnAmount: 0,
      targetDate: '2026-06-30',
      priority: 'MEDIUM',
      icon: '👟',
      status: 'ACTIVE',
      roundUpEnabled: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const mockForecast: ForecastData = {
    points: [
      { label: 'Day 1', predictedCumulativeSpend: 150, medianBalance: 4850, optimisticBalance: 4950, pessimisticBalance: 4700 },
      { label: 'Day 15', predictedCumulativeSpend: 2250, medianBalance: 2750, optimisticBalance: 3200, pessimisticBalance: 2100 },
      { label: 'Day 30', predictedCumulativeSpend: 4500, medianBalance: 500, optimisticBalance: 1400, pessimisticBalance: 0 },
    ],
    modelUsed: 'MONTE_CARLO_STOCHASTIC',
    currentBalance: 5000,
    dailyBurnMean: 150.0,
    dailyBurnStdDev: 35.5,
    estimatedRunoutDays: 33,
    runoutProbability: 0.12,
    goalFeasibilities: [
      {
        goalId: 'goal-1',
        goalName: 'Gaming Rig',
        targetAmount: 50000,
        currentAmount: 15000,
        targetDate: '2026-12-31',
        probabilityPercentage: 88.5,
        status: 'ON_TRACK',
      },
      {
        goalId: 'goal-2',
        goalName: 'Sneakers',
        targetAmount: 8000,
        currentAmount: 2000,
        targetDate: '2026-06-30',
        probabilityPercentage: 45.0,
        status: 'AT_RISK',
      },
    ],
  };

  const mockRoundUpRule: RoundUpRule = {
    enabled: true,
    goalId: 'goal-1',
    goalName: 'Gaming Rig',
    roundUpNearest: 50,
    accumulatedAmount: 240.0,
    currentGoalAmount: 15000,
    targetGoalAmount: 50000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    vi.mocked(aiApi.getHealthScore).mockResolvedValue({
      data: { data: { score: 82, rating: 'GOOD', description: 'Strong savings habits', breakdown: {} } },
    } as never);
    vi.mocked(aiApi.getTips).mockResolvedValue({ data: { data: ['Keep your savings habit strong!'] } } as never);
    vi.mocked(aiApi.getForecast).mockResolvedValue({ data: { data: mockForecast } } as never);
    vi.mocked(aiApi.getBudgetPlan).mockResolvedValue({
      data: {
        data: {
          totalIncome: 12000,
          totalSpending: 4500,
          recommendedAllocation: { Needs: 6000, Wants: 3600, Savings: 2400 },
          actualAllocation: { Needs: 2500, Wants: 1500, Savings: 500 },
        },
      },
    } as never);
    vi.mocked(goalsApi.getGoals).mockResolvedValue({ data: { data: mockGoals } } as never);
    vi.mocked(walletApi.getWallet).mockResolvedValue({ data: { data: { balance: 5000 } } } as never);
    vi.mocked(aiApi.getAlerts).mockResolvedValue({ data: { data: [] } } as never);
    vi.mocked(goalsApi.getRoundUp).mockResolvedValue({ data: { data: mockRoundUpRule } } as never);
  });

  it('renders Monte Carlo cashflow KPI cards and confidence bands in Budget & Forecast tab', async () => {
    render(<AiCoachPage />);

    // Click on Budget & Forecast tab
    const budgetTabBtn = screen.getByRole('button', { name: /budget & forecast/i });
    fireEvent.click(budgetTabBtn);

    await waitFor(() => {
      // Cashflow KPI metrics
      expect(screen.getByTestId('cashflow-kpis')).toBeDefined();
      expect(screen.getByText('Daily Burn Rate')).toBeDefined();
      expect(screen.getByText('₹150.00')).toBeDefined();
      expect(screen.getByText(/±₹35.50\/day/i)).toBeDefined();

      expect(screen.getByText('30-Day Runout Risk')).toBeDefined();
      expect(screen.getByText('12.0%')).toBeDefined();

      expect(screen.getByText('Projected Runway')).toBeDefined();
      expect(screen.getByText('33 Days')).toBeDefined();

      // Chart
      expect(screen.getByText('30-Day Predictive Cashflow Simulation')).toBeDefined();
      expect(screen.getByText('MONTE_CARLO_STOCHASTIC')).toBeDefined();
    });
  });

  it('renders savings goal feasibility analysis matrix with probability and badges', async () => {
    render(<AiCoachPage />);

    // Click on Budget & Forecast tab
    const budgetTabBtn = screen.getByRole('button', { name: /budget & forecast/i });
    fireEvent.click(budgetTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('goal-feasibility-card')).toBeDefined();
      expect(screen.getByText('Savings Goal Feasibility Analysis')).toBeDefined();
      expect(screen.getByText('Gaming Rig')).toBeDefined();
      expect(screen.getByText('89%')).toBeDefined();
      expect(screen.getByText('On Track')).toBeDefined();

      expect(screen.getByText('Sneakers')).toBeDefined();
      expect(screen.getByText('45%')).toBeDefined();
      expect(screen.getByText('At Risk')).toBeDefined();
    });
  });

  it('displays active round-up rule on savings goals tab and allows disabling', async () => {
    vi.mocked(goalsApi.disableRoundUp).mockResolvedValue({} as never);

    render(<AiCoachPage />);

    // Click on Savings Goals tab
    const goalsTabBtn = screen.getByRole('button', { name: /savings goals/i });
    fireEvent.click(goalsTabBtn);

    await waitFor(() => {
      const banner = screen.getByTestId('round-up-banner');
      expect(banner).toBeDefined();
      expect(screen.getByText(/Active \(Nearest ₹50\)/i)).toBeDefined();
      expect(screen.getByText(/Total saved: ₹240.00/i)).toBeDefined();
    });

    // Disable button
    const disableBtn = screen.getByRole('button', { name: /^disable$/i });
    fireEvent.click(disableBtn);

    await waitFor(() => {
      expect(goalsApi.disableRoundUp).toHaveBeenCalledTimes(1);
    });
  });

  it('opens round-up modal, configures nearest ₹100, and activates rule', async () => {
    vi.mocked(goalsApi.getRoundUp).mockResolvedValue({
      data: { data: { enabled: false, accumulatedAmount: 0 } },
    } as never);
    vi.mocked(goalsApi.setRoundUp).mockResolvedValue({
      data: {
        data: {
          enabled: true,
          goalId: 'goal-2',
          goalName: 'Sneakers',
          roundUpNearest: 100,
          accumulatedAmount: 0,
        },
      },
    } as never);

    render(<AiCoachPage />);

    const goalsTabBtn = screen.getByRole('button', { name: /savings goals/i });
    fireEvent.click(goalsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Configure Round-Up')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Configure Round-Up'));

    await waitFor(() => {
      expect(screen.getByTestId('round-up-modal')).toBeDefined();
      expect(screen.getByText('Configure Auto Round-Up')).toBeDefined();
    });

    // Select goal
    const select = screen.getByLabelText(/target savings goal/i);
    fireEvent.change(select, { target: { value: 'goal-2' } });

    // Select nearest ₹100
    const step100Btn = screen.getByRole('button', { name: /nearest ₹100/i });
    fireEvent.click(step100Btn);

    // Click Activate
    const activateBtn = screen.getByRole('button', { name: /activate round-up/i });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(goalsApi.setRoundUp).toHaveBeenCalledWith('goal-2', 100);
    });
  });
});
