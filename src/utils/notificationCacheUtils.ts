import type { QueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@/constants/constants';
import type { Notification } from '@/services/notification';

/** CTAs that perform a state-changing action (accept, reject, etc.) */
const ACTIONABLE_CTAS = new Set([
  'accept',
  'reject',
  'approve',
  'request_revision',
  'start_work',
  'give_estimate',
  'revise_quote',
]);

/**
 * Remove all action CTAs from a specific notification across every tab cache.
 * Used when a CTA click returns 403/409 (action already taken).
 */
export function removeActionsFromCache(queryClient: QueryClient, notificationId: number) {
  queryClient.setQueriesData<ApiResponse<Notification[]>>(
    { queryKey: ['notifications'] },
    (old) => {
      if (!old?.result) return old;
      return {
        ...old,
        result: old.result.map((n) =>
          n.id === notificationId && n.metadata?.actions?.length
            ? { ...n, metadata: { ...n.metadata, actions: [] } }
            : n
        ),
      };
    },
  );
}

/**
 * Strip actionable CTAs from all notifications matching an entity.
 * Preserves navigation-only CTAs (view_task, view_requirement, etc.).
 * Call this from page-level mutation hooks after a successful action.
 */
export function clearStaleNotificationActions(
  queryClient: QueryClient,
  entityKey: 'requirementId' | 'taskId',
  entityId: number,
) {
  queryClient.setQueriesData<ApiResponse<Notification[]>>(
    { queryKey: ['notifications'] },
    (old) => {
      if (!old?.result) return old;
      return {
        ...old,
        result: old.result.map((n) => {
          if (n.metadata?.[entityKey] !== entityId || !n.metadata?.actions?.length) return n;
          const remaining = n.metadata.actions.filter((a) => !ACTIONABLE_CTAS.has(a));
          return { ...n, metadata: { ...n.metadata, actions: remaining } };
        }),
      };
    },
  );
}

/** Check if an axios error is a "stale action" response (403, 409, or 400). */
export function isStaleActionError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 403 || status === 409 || status === 400;
}
