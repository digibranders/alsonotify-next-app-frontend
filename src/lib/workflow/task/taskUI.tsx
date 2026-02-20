import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Loader2, Eye } from 'lucide-react';
import { TaskStatus } from '../types/task.types';

export interface TaskUIConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
}

/**
 * UI Configuration map for all Task Statuses.
 * Uses O(1) lookup for better performance than switch statements.
 */
export const TASK_STATUS_UI_CONFIG: Record<TaskStatus, TaskUIConfig> = {
  Assigned: {
    label: 'Assigned',
    color: 'bg-[#F7F7F7] text-[#666666]',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  In_Progress: {
    label: 'In Progress',
    color: 'bg-[#E3F2FD] text-[#2F80ED]',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  Review: {
    label: 'In Review',
    color: 'bg-[#F3E5F5] text-[#9C27B0]',
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  Completed: {
    label: 'Completed',
    color: 'bg-[#E8F5E9] text-[#0F9D58]',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  Delayed: {
    label: 'Delayed',
    color: 'bg-[#FFF5F5] text-[#ff3b3b]',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  Stuck: {
    label: 'Stuck',
    color: 'bg-[#FFF3E0] text-[#EF6C00]',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  Impediment: {
    label: 'Impediment',
    color: 'bg-[#FFF5F5] text-[#ff3b3b]',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

/**
 * Gets the UI configuration for a specific task status.
 * Handles case-insensitivity and fallbacks gracefully.
 * 
 * @param status - The task status string (e.g. "In_Progress", "in-progress", "completed")
 */
export function getTaskStatusUI(status?: string): TaskUIConfig {
  if (!status) return TASK_STATUS_UI_CONFIG.Assigned;

  // Normalize inputs (backend uses underscores, UI might use dashes or lowercase)
  // We try to match valid keys in TASK_STATUS_UI_CONFIG

  // 1. Direct match
  if (status in TASK_STATUS_UI_CONFIG) {
    return TASK_STATUS_UI_CONFIG[status as TaskStatus];
  }

  // 2. Case-insensitive / format normalization
  const normalized = status.toLowerCase();

  if (normalized.includes('progress')) return TASK_STATUS_UI_CONFIG.In_Progress;
  if (normalized.includes('review')) return TASK_STATUS_UI_CONFIG.Review;
  if (normalized.includes('complete') || normalized.includes('done')) return TASK_STATUS_UI_CONFIG.Completed;
  if (normalized.includes('delay')) return TASK_STATUS_UI_CONFIG.Delayed;
  if (normalized.includes('stuck')) return TASK_STATUS_UI_CONFIG.Stuck;
  if (normalized.includes('impediment')) return TASK_STATUS_UI_CONFIG.Impediment;

  // Fallback
  return TASK_STATUS_UI_CONFIG.Assigned;
}
