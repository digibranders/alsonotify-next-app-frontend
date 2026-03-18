'use client';

import { X } from 'lucide-react';
import { NOTIFICATION_CONFIG, DEFAULT_CONFIG } from './constants';

interface NotificationToastProps {
  type?: string;
  title?: string;
  message?: string;
  onView?: () => void;
  onDismiss?: () => void;
}

export function NotificationToast({ type, title, message, onView, onDismiss }: NotificationToastProps) {
  const config = type ? (NOTIFICATION_CONFIG[type] ?? DEFAULT_CONFIG) : DEFAULT_CONFIG;
  const IconComponent = config.icon;
  const displayTitle = title || message || 'New notification';
  const displayDesc = title ? message : undefined;

  return (
    <div className="w-full max-w-[360px] bg-white rounded-xl shadow-lg border border-[#EEEEEE] p-3.5 flex gap-3 items-start">
      {/* Icon */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border"
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          color: config.color,
        }}
      >
        <IconComponent className="w-3.5 h-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#111111] leading-snug line-clamp-2">{displayTitle}</p>
        {displayDesc && (
          <p className="text-xs text-[#666666] font-medium mt-0.5 line-clamp-1">{displayDesc}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {onView && (
            <button
              onClick={onView}
              className="text-xs font-semibold text-[#1976d2] hover:text-[#1565c0] transition-colors"
            >
              View
            </button>
          )}
        </div>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] text-[#999999] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
