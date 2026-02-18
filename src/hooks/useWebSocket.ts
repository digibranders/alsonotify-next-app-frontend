import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Cookies from 'universal-cookie';
import { queryKeys } from '@/lib/queryKeys';

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

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const cookies = new Cookies();
    const token: string | undefined = cookies.get('_token');
    if (!token) return; // Not authenticated yet

    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect on deliberate close
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(`${WS_URL}/ws`, token);
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

        // Show a toast for the incoming notification
        const toastTitle = data.title || data.message || 'New notification';
        const toastDesc = data.title ? data.message : undefined;

        if (toastDesc) {
          toast(toastTitle, { description: toastDesc });
        } else {
          toast(toastTitle);
        }
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
      retryTimerRef.current = setTimeout(connect, delay);
    };
  }, [queryClient]);

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
