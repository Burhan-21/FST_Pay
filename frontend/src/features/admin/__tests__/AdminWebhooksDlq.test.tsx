import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../AdminPage';
import { adminWebhooksApi } from '../../../api/endpoints';
import api from '../../../api/axios';

vi.mock('../../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../../api/endpoints', () => ({
  adminWebhooksApi: {
    getCircuitBreaker: vi.fn(),
    getDlq: vi.fn(),
    replay: vi.fn(),
    replayAll: vi.fn(),
    discard: vi.fn(),
    resetCircuitBreaker: vi.fn(),
  },
}));

describe('AdminPage - Webhooks DLQ & Resilience4j Circuit Breaker', () => {
  const mockStats = {
    totalUsers: 25,
    activeCards: 18,
    totalWalletBalance: 125400.5,
    totalTransactions: 342,
    totalVolume: 532100.0,
  };

  const mockCircuitBreaker = {
    name: 'merchantSettlementCircuitBreaker',
    state: 'CLOSED',
    failureRate: 0.0,
    slowCallRate: 0.0,
    numberOfBufferedCalls: 10,
    numberOfFailedCalls: 0,
    numberOfSuccessfulCalls: 10,
    numberOfSlowCalls: 0,
    numberOfNotPermittedCalls: 0,
  };

  const mockDlqEntries = [
    {
      id: 'dlq-1',
      eventType: 'MERCHANT_SETTLEMENT_CALLBACK',
      referenceId: 'REF-DLQ-1001',
      merchantId: 'AMAZON-IN',
      settlementAmount: 1499.0,
      currency: 'INR',
      payload: '{"referenceId":"REF-DLQ-1001"}',
      retryCount: 2,
      maxRetries: 5,
      status: 'PENDING_RETRY',
      lastError: 'Downstream HTTP 503 Service Unavailable',
      nextRetryAt: '2026-09-14T01:00:00Z',
      lastAttemptAt: '2026-09-14T00:58:00Z',
      createdAt: '2026-09-14T00:50:00Z',
      updatedAt: '2026-09-14T00:58:00Z',
    },
    {
      id: 'dlq-2',
      eventType: 'MERCHANT_SETTLEMENT_CALLBACK',
      referenceId: 'REF-DLQ-1002',
      merchantId: 'FLIPKART-RETAIL',
      settlementAmount: 4999.0,
      currency: 'INR',
      payload: '{"referenceId":"REF-DLQ-1002"}',
      retryCount: 5,
      maxRetries: 5,
      status: 'DEAD_LETTER',
      lastError: 'Exhausted max retries (5). Connection refused.',
      nextRetryAt: null,
      lastAttemptAt: '2026-09-14T00:55:00Z',
      createdAt: '2026-09-14T00:30:00Z',
      updatedAt: '2026-09-14T00:55:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/admin/stats') return Promise.resolve({ data: { data: mockStats } }) as any;
      if (url.startsWith('/admin/users')) return Promise.resolve({ data: { data: { content: [] } } }) as any;
      if (url.startsWith('/admin/transactions')) return Promise.resolve({ data: { data: { content: [] } } }) as any;
      if (url === '/admin/observability') return Promise.resolve({ data: { data: {} } }) as any;
      return Promise.resolve({ data: { data: {} } }) as any;
    });

    vi.mocked(adminWebhooksApi.getCircuitBreaker).mockResolvedValue({
      data: { data: mockCircuitBreaker },
    } as any);

    vi.mocked(adminWebhooksApi.getDlq).mockResolvedValue({
      data: { data: { content: mockDlqEntries, totalElements: 2 } },
    } as any);
  });

  it('navigates to Webhooks & DLQ tab and renders Circuit Breaker telemetry', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    const dlqTabButton = screen.getByRole('button', { name: /Webhooks & DLQ/i });
    fireEvent.click(dlqTabButton);

    await waitFor(() => {
      expect(screen.getByText(/Resilience4j Settlement Circuit Breaker/i)).toBeInTheDocument();
    });

    expect(screen.getByText('CLOSED')).toBeInTheDocument();
    expect(screen.getByText('merchantSettlementCircuitBreaker')).toBeInTheDocument();
    expect(screen.getByText('REF-DLQ-1001')).toBeInTheDocument();
    expect(screen.getByText('REF-DLQ-1002')).toBeInTheDocument();
  });

  it('triggers manual replay for a dead-letter webhook', async () => {
    vi.mocked(adminWebhooksApi.replay).mockResolvedValueOnce({
      data: { data: true },
    } as any);

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    const dlqTabButton = screen.getByRole('button', { name: /Webhooks & DLQ/i });
    fireEvent.click(dlqTabButton);

    await waitFor(() => {
      expect(screen.getByText('REF-DLQ-1002')).toBeInTheDocument();
    });

    const replayButtons = screen.getAllByRole('button', { name: /^Replay$/i });
    expect(replayButtons.length).toBeGreaterThan(0);
    fireEvent.click(replayButtons[0]);

    await waitFor(() => {
      expect(adminWebhooksApi.replay).toHaveBeenCalled();
    });
  });

  it('allows resetting the circuit breaker', async () => {
    vi.mocked(adminWebhooksApi.resetCircuitBreaker).mockResolvedValueOnce({
      data: { data: 'Circuit breaker reset successfully' },
    } as any);

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    const dlqTabButton = screen.getByRole('button', { name: /Webhooks & DLQ/i });
    fireEvent.click(dlqTabButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset Circuit/i })).toBeInTheDocument();
    });

    const resetButton = screen.getByRole('button', { name: /Reset Circuit/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(adminWebhooksApi.resetCircuitBreaker).toHaveBeenCalled();
    });
  });

  it('triggers replay-all for all dead letter entries', async () => {
    vi.mocked(adminWebhooksApi.replayAll).mockResolvedValueOnce({
      data: { data: { replayedCount: 1, resolvedCount: 1 } },
    } as any);

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    const dlqTabButton = screen.getByRole('button', { name: /Webhooks & DLQ/i });
    fireEvent.click(dlqTabButton);

    await waitFor(() => {
      expect(screen.getByText(/Replay All Dead Letters/i)).toBeInTheDocument();
    });

    const replayAllBtn = screen.getByRole('button', { name: /Replay All Dead Letters/i });
    fireEvent.click(replayAllBtn);

    await waitFor(() => {
      expect(adminWebhooksApi.replayAll).toHaveBeenCalled();
    });
  });
});
