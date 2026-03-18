import {
  Bell,
  Info,
  UserCheck,
  UserPlus,
  UserMinus,
  AtSign,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  RotateCcw,
  PlayCircle,
  Timer,
  CheckSquare,
  Link2Off,
  Inbox,
  FileText,
  XCircle,
  Eye,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';
import type { NotificationConfig, NotificationTab, FilterChip, EnrichedNotification } from './types';

// ── Notification type → icon/color config ────────────────────────────

export const NOTIFICATION_CONFIG: Record<string, NotificationConfig> = {
  TASK_ASSIGNED:           { icon: UserCheck,    color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  TASK_COMMENT:            { icon: MessageSquare, color: '#555555', bgColor: '#f5f5f5', borderColor: '#e0e0e0' },
  TASK_MENTIONED:          { icon: AtSign,        color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  TASK_DUE_SOON:           { icon: Clock,         color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  TASK_OVERDUE:            { icon: AlertTriangle, color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  TASK_DELETED:            { icon: Trash2,        color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  TASK_STATUS_UPDATED:     { icon: RefreshCw,     color: '#7b1fa2', bgColor: '#f3e5f5', borderColor: '#e1bee7' },
  TASK_REVISION:           { icon: RotateCcw,     color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  TASK_COMPLETED:          { icon: CheckCircle2,  color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  TASK_YOUR_TURN:          { icon: PlayCircle,    color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  TASK_ESTIMATE_REQUESTED: { icon: Timer,         color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  TASK_ESTIMATE_PROVIDED:  { icon: CheckSquare,   color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  TASK_DEPENDENCY_CLEARED: { icon: Link2Off,      color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  TASK_MEMBER_ADDED:       { icon: UserPlus,      color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  TASK_MEMBER_REMOVED:     { icon: UserMinus,     color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  REQUIREMENT_RECEIVED:    { icon: Inbox,         color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  REQUIREMENT_SUBMITTED:   { icon: FileText,      color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  REQUIREMENT_ACCEPTED:    { icon: CheckCircle2,  color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  REQUIREMENT_REJECTED:    { icon: XCircle,       color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  REQUIREMENT_REVIEW:      { icon: Eye,           color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  REQUIREMENT_COMPLETED:   { icon: BadgeCheck,    color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  REQUIREMENT_REVISION:    { icon: RotateCcw,     color: '#d32f2f', bgColor: '#ffebee', borderColor: '#ffcdd2' },
  REQUIREMENT_APPROVED:    { icon: ShieldCheck,   color: '#388e3c', bgColor: '#e8f5e9', borderColor: '#c8e6c9' },
  REQUIREMENT_MENTIONED:   { icon: AtSign,        color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  TODO_REMINDER:           { icon: Bell,          color: '#f57c00', bgColor: '#fff3e0', borderColor: '#ffe0b2' },
  PARTNER_INVITE:          { icon: UserPlus,      color: '#1976d2', bgColor: '#e3f2fd', borderColor: '#bbdefb' },
  GENERAL:                 { icon: Info,          color: '#555555', bgColor: '#f5f5f5', borderColor: '#e0e0e0' },
};

export const DEFAULT_CONFIG: NotificationConfig = {
  icon: Info, color: '#555555', bgColor: '#f5f5f5', borderColor: '#e0e0e0',
};

// ── Tab configuration ────────────────────────────────────────────────

export const TABS: NotificationTab[] = [
  { key: 'all', label: 'All' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'dues', label: 'Dues' },
];

// ── Filter chips per tab ─────────────────────────────────────────────

export const FILTER_CHIPS: Record<string, FilterChip[]> = {
  all: [
    { key: 'unread', label: 'Unread', filter: (n: EnrichedNotification) => n.unread },
    { key: 'tasks', label: 'Tasks', filter: (n: EnrichedNotification) => n.type.startsWith('TASK_') || n.type === 'TODO_REMINDER' },
    { key: 'requirements', label: 'Requirements', filter: (n: EnrichedNotification) => n.type.startsWith('REQUIREMENT_') },
    { key: 'critical', label: 'High Priority', filter: (n: EnrichedNotification) => n.priority === 'critical' || n.priority === 'warning' },
  ],
  mentions: [
    { key: 'unread', label: 'Unread', filter: (n: EnrichedNotification) => n.unread },
    { key: 'tasks', label: 'Tasks', filter: (n: EnrichedNotification) => n.type === 'TASK_MENTIONED' },
    { key: 'requirements', label: 'Requirements', filter: (n: EnrichedNotification) => n.type === 'REQUIREMENT_MENTIONED' },
  ],
  dues: [
    { key: 'overdue', label: 'Overdue', filter: (n: EnrichedNotification) => n.type === 'TASK_OVERDUE' || n.type === 'INVOICE_OVERDUE' || n.type === 'REQUIREMENT_DELAYED' },
    { key: 'due_soon', label: 'Due Soon', filter: (n: EnrichedNotification) => n.type === 'TASK_DUE_SOON' || n.type === 'TASK_DEADLINE_APPROACHING' || n.type === 'REQUIREMENT_DEADLINE_APPROACHING' },
    { key: 'reminders', label: 'Reminders', filter: (n: EnrichedNotification) => n.type === 'TODO_REMINDER' },
  ],
};
