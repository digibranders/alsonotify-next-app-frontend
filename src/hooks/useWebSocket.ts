import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Cookies from 'universal-cookie';
import { NotificationToast } from '@/components/features/notifications/NotificationToast';
import { getPriority } from '@/components/features/notifications/utils';
import { applyTeamsEvent, parseTeamsEvent } from './useTeamsRealtime';

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
  .replace(/^http/, 'ws')
  .replace(/\/$/, '');

/**
 * The notification frame, as `sendNotification` writes it on the backend,
 * reduced to the fields the toast reads. Everything is optional because this
 * is what a frame is narrowed TO by the parser below, not what arrived.
 */
interface NotificationFrame {
  type?: string;
  title?: string;
  message?: string;
}

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Namespace for realtime frames. Never notifications, whatever they carry. */
const TEAMS_FRAME_PREFIX = 'TEAMS_';

/**
 * Is this frame a notification, i.e. something the toast and the notification
 * panel should react to?
 *
 * Asked structurally rather than by enumerating known types. Enumerating is
 * tempting — NOTIFICATION_CONFIG and PRIORITY_MAP are right there — but both
 * maps are well behind the backend's `NotificationType` enum: INVOICE_SENT,
 * INVOICE_PARTIAL_PAID, CREDIT_NOTE_ISSUED and TASK_REVIEW_READY are all real,
 * deliverable types absent from both, and gating on them would silently
 * swallow those notifications. Trading a blank toast for a missing one is not
 * a fix.
 *
 * What the toast actually needs is displayable text: NotificationToast falls
 * back to the literal string 'New notification' when it has neither a title
 * nor a message, which is exactly the blank toast every non-notification
 * frame used to produce. So require the text, and additionally exclude the
 * TEAMS_* namespace outright — those belong to the realtime channel and must
 * never reach the notification queries, whatever fields they grow.
 */
function parseNotificationFrame(frame: Record<string, unknown>): NotificationFrame | null {
  if (typeof frame.type === 'string' && frame.type.startsWith(TEAMS_FRAME_PREFIX)) return null;
  if (!hasText(frame.title) && !hasText(frame.message)) return null;

  return {
    type: typeof frame.type === 'string' ? frame.type : undefined,
    title: typeof frame.title === 'string' ? frame.title : undefined,
    message: typeof frame.message === 'string' ? frame.message : undefined,
  };
}

const MIN_RETRY_DELAY = 1_000;
const MAX_RETRY_DELAY = 30_000;
const MAX_RETRIES = 10;

/**
 * A clean, deliberate close by the peer.
 *
 * The backend sends it in exactly one place: `registerClient` closes a user's
 * previous socket when a second one connects ("Replaced by a newer
 * connection"). Reconnecting on it made two open tabs fight — A reconnects,
 * the server closes B, B reconnects, the server closes A — forever at ~1s
 * cadence, with `onopen` resetting the retry counter so MAX_RETRIES never
 * stopped it. Each tab received roughly half the messages and the rest landed
 * in a tab nobody was looking at.
 *
 * So the replaced tab stands down and lives on the 120s poll until the user
 * actually looks at it (see the focus listener below). This holds either way
 * round the backend fix that gives each user a Set of sockets and fans out to
 * all of them: with it, this close is simply never sent and the branch never
 * fires.
 */
const CLOSE_NORMAL = 1000;

/**
 * Policy violation — the backend's code for a missing, invalid or expired
 * token. Ten retries with the same rejected credential cannot succeed; the
 * hook reconnects from scratch when it next mounts with a good one.
 */
const CLOSE_POLICY_VIOLATION = 1008;

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  /** This tab stood down for another one and is waiting to be looked at. */
  const replacedRef = useRef(false);

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const connectRef = useRef<() => void>(() => {});

  /**
   * Queue another attempt on the shared backoff, or stop if the budget is
   * spent. `onopen` resets the counter, so a working connection always starts
   * from a full budget again.
   */
  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current) return;
    if (retryCountRef.current >= MAX_RETRIES) return;

    const delay = Math.min(MIN_RETRY_DELAY * 2 ** retryCountRef.current, MAX_RETRY_DELAY);
    retryCountRef.current += 1;
    clearRetryTimer();
    retryTimerRef.current = setTimeout(() => connectRef.current(), delay);
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const cookies = new Cookies();
    const token: string | undefined = cookies.get('_token');
    if (!token) {
      // Not readable yet. This used to return outright, which meant a mount
      // that raced the cookie -- a hard reload, or the redirect immediately
      // after login -- got no socket for the entire session and had no way
      // back to one. The only symptom is chat silently running on its 120s
      // poll, i.e. the degraded behaviour this feature exists to replace, so
      // it would never be reported as broken. Retrying on the same backoff
      // covers the race and still stops after MAX_RETRIES, so a genuinely
      // logged-out tab does not read the cookie for the rest of its life.
      scheduleReconnect();
      return;
    }

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
      let raw: unknown;
      try {
        raw = JSON.parse(event.data as string);
      } catch {
        return; // Not JSON. Nothing to route.
      }
      if (typeof raw !== 'object' || raw === null) return;
      const frame = raw as Record<string, unknown>;

      // Ignore CONNECTED handshake
      if (frame.type === 'CONNECTED') return;

      // Teams messages share this socket (the backend keys connections by
      // user id) but are NOT notifications: they must not invalidate the
      // notification queries or raise a toast, only update the Teams
      // chat/channel cache. A TEAMS_* frame that fails validation is dropped
      // here rather than falling through — `parseNotificationFrame` excludes
      // the whole namespace, so a broken contract cannot become a blank toast.
      const teamsEvent = parseTeamsEvent(frame);
      if (teamsEvent) {
        applyTeamsEvent(queryClient, teamsEvent);
        return;
      }

      const notification = parseNotificationFrame(frame);
      if (!notification) return;

      // Invalidate all notification queries so panels refresh
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show a rich toast for the incoming notification
      const priority = notification.type ? getPriority(notification.type) : 'info';
      const duration = priority === 'critical' ? 15000 : priority === 'warning' ? 8000 : 5000;

      toast.custom(
        (t) =>
          NotificationToast({
            type: notification.type,
            title: notification.title,
            message: notification.message,
            onDismiss: () => toast.dismiss(t),
          }),
        { duration, position: 'top-right' },
      );
    };

    ws.onerror = () => {
      // onclose will fire after onerror — reconnect handled there
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      if (unmountedRef.current) return;

      if (event.code === CLOSE_NORMAL) {
        replacedRef.current = true;
        return;
      }
      if (event.code === CLOSE_POLICY_VIOLATION) return;

      scheduleReconnect();
    };
  }, [queryClient, scheduleReconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  /**
   * Reclaim the socket when the user comes back to a tab that stood down.
   *
   * Standing down is the right call at the moment of replacement, but leaving
   * the tab on the 120s poll for the rest of the session is not: the tab the
   * user is actually looking at should be the one holding the socket. Focus
   * fires on one tab at a time, so this hands the socket over on demand
   * instead of restarting the flap.
   */
  useEffect(() => {
    const reclaim = () => {
      if (unmountedRef.current || !replacedRef.current || wsRef.current) return;
      replacedRef.current = false;
      retryCountRef.current = 0;
      connectRef.current();
    };

    window.addEventListener('focus', reclaim);
    return () => window.removeEventListener('focus', reclaim);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    retryCountRef.current = 0;
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
