import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiCoachPage from '../AiCoachPage';
import { aiApi, goalsApi, walletApi } from '../../../api/endpoints';

// Mock recharts to avoid DOM measurement issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: () => <div data-testid="bar-chart" />,
  LineChart: () => <div data-testid="line-chart" />,
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
  },
  walletApi: {
    getWallet: vi.fn(),
  },
}));

describe('AiCoachPage Proactive Alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    vi.mocked(aiApi.getHealthScore).mockResolvedValue({
      data: { data: { score: 75, rating: 'GOOD', description: 'Healthy', breakdown: {} } },
    } as never);
    vi.mocked(aiApi.getTips).mockResolvedValue({ data: { data: [] } } as never);
    vi.mocked(aiApi.getForecast).mockResolvedValue({ data: { data: { points: [] } } } as never);
    vi.mocked(aiApi.getBudgetPlan).mockResolvedValue({
      data: {
        data: {
          totalIncome: 10000,
          totalSpending: 4000,
          recommendedAllocation: {},
          actualAllocation: {},
        },
      },
    } as never);
    vi.mocked(goalsApi.getGoals).mockResolvedValue({ data: { data: [] } } as never);
    vi.mocked(walletApi.getWallet).mockResolvedValue({ data: { data: { balance: 2500 } } } as never);
  });

  it('renders empty state when no anomalies exist', async () => {
    vi.mocked(aiApi.getAlerts).mockResolvedValue({ data: { data: [] } } as never);

    render(<AiCoachPage />);

    // Click on Proactive Alerts tab
    const alertsTabBtn = screen.getByRole('button', { name: /proactive alerts/i });
    expect(alertsTabBtn).toBeDefined();

    fireEvent.click(alertsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('All Clear! No Budget Anomalies')).toBeDefined();
      expect(screen.getByText(/Next automated scan scheduled for Monday/i)).toBeDefined();
    });
  });

  it('renders anomaly cards with metrics and recommendations', async () => {
    const mockAlerts = [
      {
        anomalyType: 'CATEGORY_SPIKE',
        severity: 'ALERT' as const,
        category: 'FOOD',
        currentAmount: 1850,
        baselineAmount: 1000,
        title: 'FOOD Spending Spike Detected',
        message: 'You spent ₹1,850 on Food in the last 7 days.',
        actionableAdvice: 'Cap dining out at ₹250/day.',
        detectedAt: new Date().toISOString(),
      },
    ];

    vi.mocked(aiApi.getAlerts).mockResolvedValue({ data: { data: mockAlerts } } as never);

    render(<AiCoachPage />);

    const alertsTabBtn = screen.getByRole('button', { name: /proactive alerts/i });
    fireEvent.click(alertsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('FOOD Spending Spike Detected')).toBeDefined();
      expect(screen.getByText('ALERT')).toBeDefined();
      expect(screen.getByText('Cap dining out at ₹250/day.')).toBeDefined();
    });
  });

  it('triggers on-demand scan when Run Instant Scan button is clicked', async () => {
    vi.mocked(aiApi.getAlerts).mockResolvedValue({ data: { data: [] } } as never);
    vi.mocked(aiApi.runScan).mockResolvedValue({
      data: {
        data: [
          {
            anomalyType: 'BURN_RATE_RISK',
            severity: 'ALERT' as const,
            category: 'WALLET',
            currentAmount: 300,
            baselineAmount: 700,
            title: 'Wallet Depletion Risk',
            message: 'Burn rate warning.',
            actionableAdvice: 'Top up wallet.',
            detectedAt: new Date().toISOString(),
          },
        ],
      },
    } as never);

    render(<AiCoachPage />);

    const alertsTabBtn = screen.getByRole('button', { name: /proactive alerts/i });
    fireEvent.click(alertsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('All Clear! No Budget Anomalies')).toBeDefined();
    });

    const scanBtn = screen.getByRole('button', { name: /run instant scan/i });
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(aiApi.runScan).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Wallet Depletion Risk')).toBeDefined();
    });
  });
});
