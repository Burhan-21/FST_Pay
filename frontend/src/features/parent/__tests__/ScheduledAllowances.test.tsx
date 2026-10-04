import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ParentDashboard from '../ParentDashboard';
import { parentalApi } from '../../../api/endpoints';
import type { ParentDashboardData, ScheduledAllowance } from '../../../types';

// Mock Auth
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'parent-1', email: 'parent@example.com', fullName: 'Jane Parent', role: 'PARENT' },
  }),
}));

// Mock APIs
vi.mock('../../../api/endpoints', () => ({
  parentalApi: {
    getDashboard: vi.fn(),
    getAllowances: vi.fn(),
    createAllowance: vi.fn(),
    updateAllowance: vi.fn(),
    deleteAllowance: vi.fn(),
    triggerAllowance: vi.fn(),
    getChildDetails: vi.fn(),
    sendPocketMoney: vi.fn(),
    setSpendingLimits: vi.fn(),
    markNotificationsAsRead: vi.fn(),
  },
  walletApi: {
    getWallet: vi.fn().mockResolvedValue({ data: { data: { balance: 5000, currency: 'INR' } } }),
    topUp: vi.fn(),
  },
}));

describe('ParentDashboard - Scheduled Allowances & Auto-Sweeps', () => {
  const mockDashboardData: ParentDashboardData = {
    totalChildrenBalance: 3200,
    totalPocketMoneySentThisMonth: 800,
    pendingApprovalsCount: 0,
    children: [
      {
        id: 'child-1',
        fullName: 'Leo Teen',
        email: 'leo@example.com',
        isActive: true,
        parentalControlEnabled: true,
        parentalDailyLimit: 500,
        parentalMonthlyLimit: 5000,
        parentalMaxTxnAmount: 1000,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    activityTimeline: [],
    recentNotifications: [],
  };

  const mockAllowances: ScheduledAllowance[] = [
    {
      id: 'allow-1',
      parentId: 'parent-1',
      parentName: 'Jane Parent',
      childId: 'child-1',
      childName: 'Leo Teen',
      childEmail: 'leo@example.com',
      amount: 450,
      frequency: 'WEEKLY',
      dayOfWeek: 'FRIDAY',
      targetGoalId: 'goal-laptop',
      targetGoalName: 'MacBook Air Fund',
      note: 'Friday pocket money & savings',
      active: true,
      nextRunDate: '2026-09-18',
      lastRunDate: '2026-09-11',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-11T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parentalApi.getDashboard).mockResolvedValue({ data: { data: mockDashboardData } } as never);
    vi.mocked(parentalApi.getAllowances).mockResolvedValue({ data: { data: mockAllowances } } as never);
    vi.mocked(parentalApi.getChildDetails).mockResolvedValue({
      data: {
        data: {
          id: 'child-1',
          fullName: 'Leo Teen',
          activeGoals: [
            {
              id: 'goal-laptop',
              name: 'MacBook Air Fund',
              targetAmount: 80000,
              currentAmount: 20000,
              status: 'ACTIVE',
            },
          ],
        },
      },
    } as never);
  });

  it('renders scheduled allowances card with active schedules and auto-sweep targets', async () => {
    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Scheduled Allowances & Auto-Sweeps')).toBeInTheDocument();
      expect(screen.getAllByText('Leo Teen').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Auto-Sweep to: MacBook Air Fund')).toBeInTheDocument();
      expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('triggers immediate manual sweep when clicking Run Now', async () => {
    vi.mocked(parentalApi.triggerAllowance).mockResolvedValue({
      data: { data: { ...mockAllowances[0], lastRunDate: '2026-09-14' } },
    } as never);

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Run Now')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Run Now'));

    await waitFor(() => {
      expect(parentalApi.triggerAllowance).toHaveBeenCalledWith('allow-1');
    });
  });

  it('toggles pause and resume status for an allowance schedule', async () => {
    vi.mocked(parentalApi.updateAllowance).mockResolvedValue({
      data: { data: { ...mockAllowances[0], active: false } },
    } as never);

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Pause'));

    await waitFor(() => {
      expect(parentalApi.updateAllowance).toHaveBeenCalledWith('allow-1', { active: false });
    });
  });

  it('deletes an allowance schedule', async () => {
    vi.mocked(parentalApi.deleteAllowance).mockResolvedValue({ data: { data: null } } as never);

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTitle('Delete schedule')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Delete schedule'));

    await waitFor(() => {
      expect(screen.getByText('Delete Allowance Schedule')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(parentalApi.deleteAllowance).toHaveBeenCalledWith('allow-1');
    });
  });
});
