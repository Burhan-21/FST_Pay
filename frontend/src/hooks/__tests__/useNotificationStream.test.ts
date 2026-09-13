import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotificationStream } from '../useNotificationStream';

class MockEventSource {
  static currentInstance: MockEventSource | null = null;
  url: string;
  listeners: Record<string, ((event: unknown) => void)[]> = {};
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.currentInstance = this;
  }

  addEventListener(event: string, callback: (event: unknown) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event: string, callback: (event: unknown) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  simulateEvent(event: string, data: unknown) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => cb(data));
  }

  close() {
    this.closed = true;
  }
}

describe('useNotificationStream Hook', () => {
  let originalEventSource: typeof window.EventSource;

  beforeEach(() => {
    originalEventSource = window.EventSource;
    MockEventSource.currentInstance = null;
    window.EventSource = MockEventSource as unknown as typeof window.EventSource;
    localStorage.clear();
  });

  afterEach(() => {
    window.EventSource = originalEventSource;
    MockEventSource.currentInstance = null;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('remains disconnected if no auth token is present', () => {
    const { result } = renderHook(() => useNotificationStream());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('disconnected');
    expect(MockEventSource.currentInstance).toBeNull();
  });

  it('connects to SSE endpoint with token query param when token exists', () => {
    localStorage.setItem('fst_access_token', 'test-jwt-token-123');

    const { result } = renderHook(() => useNotificationStream());

    expect(MockEventSource.currentInstance).not.toBeNull();
    expect(MockEventSource.currentInstance?.url).toContain('/api/v1/notifications/stream?token=test-jwt-token-123');
    expect(result.current.connectionState).toBe('connecting');

    act(() => {
      MockEventSource.currentInstance?.simulateEvent('INIT', { data: JSON.stringify({ message: 'connected' }) });
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionState).toBe('connected');
  });

  it('handles SETTLEMENT_UPDATE and dispatches window custom event', () => {
    localStorage.setItem('fst_access_token', 'test-jwt-token-123');
    const onSettlementMock = vi.fn();
    const windowEventSpy = vi.fn();

    window.addEventListener('fst:settlement_update', windowEventSpy);

    const { result } = renderHook(() =>
      useNotificationStream({ onSettlementUpdate: onSettlementMock })
    );

    const settlementData = {
      type: 'SETTLEMENT_UPDATE' as const,
      transactionId: 'txn-789',
      referenceId: 'REF-001',
      merchantId: 'MERCH-001',
      status: 'SETTLED' as const,
      amount: 450.0,
    };

    act(() => {
      MockEventSource.currentInstance?.simulateEvent('SETTLEMENT_UPDATE', {
        data: JSON.stringify(settlementData),
      });
    });

    expect(onSettlementMock).toHaveBeenCalledWith(settlementData);
    expect(windowEventSpy).toHaveBeenCalledTimes(1);
    expect(result.current.lastEvent).toEqual(settlementData);

    window.removeEventListener('fst:settlement_update', windowEventSpy);
  });

  it('handles WALLET_UPDATE event correctly', () => {
    localStorage.setItem('fst_access_token', 'test-jwt-token-123');
    const onWalletMock = vi.fn();

    const { result } = renderHook(() =>
      useNotificationStream({ onWalletUpdate: onWalletMock })
    );

    const walletData = {
      type: 'WALLET_UPDATE' as const,
      userId: 'user-123',
      amount: 100.0,
      balance: 1500.0,
    };

    act(() => {
      MockEventSource.currentInstance?.simulateEvent('WALLET_UPDATE', {
        data: JSON.stringify(walletData),
      });
    });

    expect(onWalletMock).toHaveBeenCalledWith(walletData);
    expect(result.current.lastEvent).toEqual(walletData);
  });

  it('closes EventSource connection on unmount', () => {
    localStorage.setItem('fst_access_token', 'test-jwt-token-123');

    const { unmount } = renderHook(() => useNotificationStream());

    expect(MockEventSource.currentInstance?.closed).toBe(false);

    unmount();

    expect(MockEventSource.currentInstance?.closed).toBe(true);
  });
});
