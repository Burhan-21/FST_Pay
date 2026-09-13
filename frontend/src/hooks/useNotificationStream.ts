import { useEffect, useState, useRef, useCallback } from 'react';
import type { SseEventPayload, SseSettlementUpdatePayload, SseWalletUpdatePayload, SseAiAlertPayload } from '../types';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseNotificationStreamOptions {
  enabled?: boolean;
  onSettlementUpdate?: (payload: SseSettlementUpdatePayload) => void;
  onWalletUpdate?: (payload: SseWalletUpdatePayload) => void;
  onAiAlert?: (payload: SseAiAlertPayload) => void;
  onMessage?: (event: MessageEvent) => void;
}

export function useNotificationStream(options: UseNotificationStreamOptions = {}) {
  const { enabled = true, onSettlementUpdate, onWalletUpdate, onAiAlert, onMessage } = options;
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastEvent, setLastEvent] = useState<SseEventPayload | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const onSettlementUpdateRef = useRef(onSettlementUpdate);
  const onWalletUpdateRef = useRef(onWalletUpdate);
  const onAiAlertRef = useRef(onAiAlert);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onSettlementUpdateRef.current = onSettlementUpdate;
    onWalletUpdateRef.current = onWalletUpdate;
    onAiAlertRef.current = onAiAlert;
    onMessageRef.current = onMessage;
  });

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = localStorage.getItem('fst_access_token');
    if (!token) {
      setConnectionState('disconnected');
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState('connecting');

    const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
    const streamUrl = `${apiBase}/notifications/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      setConnectionState('connected');
    });

    es.addEventListener('INIT', () => {
      setConnectionState('connected');
    });

    es.addEventListener('SETTLEMENT_UPDATE', (e: MessageEvent) => {
      try {
        const payload: SseSettlementUpdatePayload = JSON.parse(e.data);
        setLastEvent(payload);
        if (onSettlementUpdateRef.current) {
          onSettlementUpdateRef.current(payload);
        }
        window.dispatchEvent(new CustomEvent('fst:settlement_update', { detail: payload }));
      } catch (err) {
        console.error('Failed to parse SSE SETTLEMENT_UPDATE payload:', err);
      }
    });

    es.addEventListener('WALLET_UPDATE', (e: MessageEvent) => {
      try {
        const payload: SseWalletUpdatePayload = JSON.parse(e.data);
        setLastEvent(payload);
        if (onWalletUpdateRef.current) {
          onWalletUpdateRef.current(payload);
        }
        window.dispatchEvent(new CustomEvent('fst:wallet_update', { detail: payload }));
      } catch (err) {
        console.error('Failed to parse SSE WALLET_UPDATE payload:', err);
      }
    });

    es.addEventListener('AI_ALERT', (e: MessageEvent) => {
      try {
        const payload: SseAiAlertPayload = JSON.parse(e.data);
        setLastEvent(payload);
        if (onAiAlertRef.current) {
          onAiAlertRef.current(payload);
        }
        window.dispatchEvent(new CustomEvent('fst:ai_alert', { detail: payload }));
      } catch (err) {
        console.error('Failed to parse SSE AI_ALERT payload:', err);
      }
    });

    es.onmessage = (e: MessageEvent) => {
      if (onMessageRef.current) {
        onMessageRef.current(e);
      }
      try {
        const parsed = JSON.parse(e.data);
        setLastEvent(parsed);
      } catch {
        // Raw string message
      }
    };

    es.onerror = () => {
      // EventSource automatically retries connection in standard browser behavior
      setConnectionState('error');
    };
  }, [enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    lastEvent,
    reconnect: connect,
  };
}
