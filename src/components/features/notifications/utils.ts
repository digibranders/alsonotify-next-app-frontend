import type { NotificationPriority, TimeGroup, EnrichedNotification, NotificationItem, NotificationBundle } from './types';

// ── Priority mapping ─────────────────────────────────────────────────

const PRIORITY_MAP: Record<string, NotificationPriority> = {
  // Critical — requires urgent human attention
  TASK_OVERDUE: 'critical',
  TASK_DELETED: 'critical',
  REQUIREMENT_REJECTED: 'critical',
  INVOICE_OVERDUE: 'critical',

  // Warning — time-sensitive or needs review
  TASK_DUE_SOON: 'warning',
  TASK_REVISION: 'warning',
  TASK_DEADLINE_APPROACHING: 'warning',
  REQUIREMENT_REVIEW: 'warning',
  REQUIREMENT_REVISION: 'warning',
  REQUIREMENT_DEADLINE_APPROACHING: 'warning',
  REQUIREMENT_DELAYED: 'warning',

  // Success — positive outcomes
  TASK_COMPLETED: 'success',
  TASK_ESTIMATE_PROVIDED: 'success',
  TASK_DEPENDENCY_CLEARED: 'success',
  REQUIREMENT_ACCEPTED: 'success',
  REQUIREMENT_APPROVED: 'success',
  REQUIREMENT_COMPLETED: 'success',
  INVOICE_PAID: 'success',
  INVOICE_APPROVED: 'success',
};

export function getPriority(type: string): NotificationPriority {
  return PRIORITY_MAP[type] ?? 'info';
}

// ── Priority visual styles ───────────────────────────────────────────

export const PRIORITY_STYLES: Record<NotificationPriority, {
  stripeColor: string;
  unreadBg: string;
}> = {
  critical: { stripeColor: '#D32F2F', unreadBg: 'rgba(211,47,47,0.04)' },
  warning: { stripeColor: '#F57C00', unreadBg: 'rgba(245,124,0,0.04)' },
  success: { stripeColor: '#388E3C', unreadBg: 'rgba(56,142,60,0.04)' },
  info: { stripeColor: 'transparent', unreadBg: 'rgba(0,0,0,0.02)' },
};

// ── Time grouping ────────────────────────────────────────────────────

export function getTimeGroup(dateStr: string): TimeGroup {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'earlier';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86_400_000);
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000);
    const monthAgo = new Date(today.getTime() - 30 * 86_400_000);

    if (date >= today) return 'today';
    if (date >= yesterday) return 'yesterday';
    if (date >= weekAgo) return 'this_week';
    if (date >= monthAgo) return 'this_month';
    return 'earlier';
  } catch {
    return 'earlier';
  }
}

export const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  this_month: 'This Month',
  earlier: 'Earlier',
};

const TIME_GROUP_ORDER: TimeGroup[] = ['today', 'yesterday', 'this_week', 'this_month', 'earlier'];

// ── Relative time ────────────────────────────────────────────────────

export function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Just now';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Just now';
  }
}

// ── Enrich notifications ─────────────────────────────────────────────

export function enrichNotification(item: NotificationItem): EnrichedNotification {
  const priority = getPriority(item.type);
  const timeGroup = getTimeGroup(item.createdAt);

  // Build a grouping key for bundling (same entity within same time group)
  let groupKey: string | undefined;
  if (item.metadata?.taskId) {
    groupKey = `task-${item.metadata.taskId}-${timeGroup}`;
  } else if (item.metadata?.requirementId) {
    groupKey = `req-${item.metadata.requirementId}-${timeGroup}`;
  }

  return { ...item, priority, timeGroup, groupKey };
}

// ── Group notifications by time ──────────────────────────────────────

export function groupByTime(notifications: EnrichedNotification[]): { group: TimeGroup; label: string; items: EnrichedNotification[] }[] {
  const groups = new Map<TimeGroup, EnrichedNotification[]>();

  for (const n of notifications) {
    const existing = groups.get(n.timeGroup);
    if (existing) {
      existing.push(n);
    } else {
      groups.set(n.timeGroup, [n]);
    }
  }

  return TIME_GROUP_ORDER
    .filter(g => groups.has(g))
    .map(g => ({
      group: g,
      label: TIME_GROUP_LABELS[g],
      items: groups.get(g)!,
    }));
}

// ── Bundle notifications for same entity ─────────────────────────────

export function bundleNotifications(notifications: EnrichedNotification[]): (EnrichedNotification | NotificationBundle)[] {
  const result: (EnrichedNotification | NotificationBundle)[] = [];
  const grouped = new Map<string, EnrichedNotification[]>();
  const standalone: EnrichedNotification[] = [];

  for (const n of notifications) {
    if (n.groupKey) {
      const existing = grouped.get(n.groupKey);
      if (existing) {
        existing.push(n);
      } else {
        grouped.set(n.groupKey, [n]);
      }
    } else {
      standalone.push(n);
    }
  }

  // Process grouped items
  for (const [key, items] of grouped) {
    if (items.length >= 2) {
      result.push({
        key,
        latest: items[0], // Already sorted by created_at desc from API
        items,
        count: items.length,
      });
    } else {
      result.push(items[0]);
    }
  }

  // Add standalone items
  result.push(...standalone);

  // Sort by latest notification time (bundles use their latest item)
  result.sort((a, b) => {
    const aTime = 'latest' in a ? a.latest.createdAt : a.createdAt;
    const bTime = 'latest' in b ? b.latest.createdAt : b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return result;
}

// ── Type guard ───────────────────────────────────────────────────────

export function isBundle(item: EnrichedNotification | NotificationBundle): item is NotificationBundle {
  return 'latest' in item && 'items' in item;
}

// ── Search ───────────────────────────────────────────────────────────

export function searchNotifications(notifications: EnrichedNotification[], query: string): EnrichedNotification[] {
  const q = query.toLowerCase().trim();
  if (!q) return notifications;

  return notifications.filter(n => {
    const fields = [
      n.title,
      n.message,
      n.metadata?.taskName,
      n.metadata?.requirementName,
      n.metadata?.actorName,
      n.metadata?.memberName,
      n.metadata?.senderCompanyName,
      n.metadata?.receiverCompanyName,
    ];
    return fields.some(f => f && String(f).toLowerCase().includes(q));
  });
}
