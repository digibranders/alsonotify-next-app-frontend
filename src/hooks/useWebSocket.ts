import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAuthenticated } from '@/services/cookies';
import { NotificationToast } from '@/components/features/notifications/NotificationToast';
import { getPriority } from '@/components/features/notifications/utils';

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
  .replace(/^http/, 'ws')
  .replace(/\/$/, '');

const MIN_RETRY_DELAY = 1_000;
const MAX_RETRY_DELAY = 30_000;
const MAX_RETRIES = 10;

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    if (!isAuthenticated()) return;

    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect on deliberate close
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      retryCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          title?: string;
          message?: string;
          icon?: string;
        };

        // Ignore CONNECTED handshake
        if (data.type === 'CONNECTED') return;

        // Invalidate all notification queries so panels refresh
        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        // Show a rich toast for the incoming notification
        const priority = data.type ? getPriority(data.type) : 'info';
        const duration = priority === 'critical' ? 15000 : priority === 'warning' ? 8000 : 5000;

        toast.custom(
          (t) =>
            NotificationToast({
              type: data.type,
              title: data.title,
              message: data.message,
              onDismiss: () => toast.dismiss(t),
            }),
          { duration, position: 'top-right' },
        );
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror — reconnect handled there
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (unmountedRef.current) return;
      if (retryCountRef.current >= MAX_RETRIES) return;

      const delay = Math.min(
        MIN_RETRY_DELAY * 2 ** retryCountRef.current,
        MAX_RETRY_DELAY
      );
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => connectRef.current(), delay);
    };
  }, [queryClient]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      clearRetryTimer();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
