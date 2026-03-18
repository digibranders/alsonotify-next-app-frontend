import type { LucideIcon } from 'lucide-react';
import type { NotificationTypeValue, NotificationMetadata } from '@/services/notification';

// ── Priority & categorization ────────────────────────────────────────

export type NotificationPriority = 'critical' | 'warning' | 'info' | 'success';

export type TimeGroup = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'earlier';

// ── Icon configuration ───────────────────────────────────────────────

export interface NotificationConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ── Notification item ────────────────────────────────────────────────

export interface NotificationItem {
  id: number;
  type: NotificationTypeValue | string;
  title: string | null;
  message: string;
  time: string;
  unread: boolean;
  icon?: string | null;
  actionLink?: string | null;
  metadata?: NotificationMetadata | null;
  createdAt: string;
  isArchived: boolean;
}

// ── Enriched notification (with computed fields) ─────────────────────

export interface EnrichedNotification extends NotificationItem {
  priority: NotificationPriority;
  timeGroup: TimeGroup;
  groupKey?: string; // For bundling (e.g., same taskId)
}

// ── Notification group (for bundled items) ───────────────────────────

export interface NotificationBundle {
  key: string;
  latest: EnrichedNotification;
  items: EnrichedNotification[];
  count: number;
}

// ── Tab configuration ────────────────────────────────────────────────

export interface NotificationTab {
  key: string;
  label: string;
}

// ── Filter chip ──────────────────────────────────────────────────────

export interface FilterChip {
  key: string;
  label: string;
  filter: (n: EnrichedNotification) => boolean;
}

// ── Drawer props ─────────────────────────────────────────────────────

export interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export type { NotificationTypeValue, NotificationMetadata };
