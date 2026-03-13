import React, { ReactNode } from 'react';
import { Button } from 'antd';
import { LucideIcon } from 'lucide-react';

interface FormLayoutProps {
  /** Title displayed in the header */
  title: string;
  /** Subtitle/Description displayed in the header */
  subtitle?: string;
  /** Icon component to display in the header circle */
  icon?: LucideIcon;
  /** Content of the form (Scrollable body) */
  children: ReactNode;
  /** Function to call when submitting */
  onSubmit: () => void;
  /** Function to call when cancelling */
  onCancel: () => void;
  /** Label for the submit button. Defaults to 'Submit' or 'Update' based on isEditing */
  submitLabel?: string;
  /** Whether the form is in editing mode */
  isEditing?: boolean;
  /** Loading state for the submit button */
  isLoading?: boolean;
  /** Custom footer content. If provided, overrides the default buttons. */
  footer?: ReactNode;
  /** Custom element to display in the header (e.g., Segmented, Switch) */
  headerExtra?: ReactNode;
  /** Disable submit button */
  submitDisabled?: boolean;
  /** Additional class for the container */
  className?: string;
}

export function FormLayout({
  title,
  subtitle,
  icon: Icon,
  children,
  onSubmit,
  onCancel,
  submitLabel,
  isEditing = false,
  isLoading = false,
  footer,
  headerExtra,
  submitDisabled = false,
  className = "",
}: FormLayoutProps) {
  return (
    <div className={`flex flex-col min-h-0 max-h-full bg-white ${className}`}>
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b border-[#EEEEEE] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-[#111111]">
            {Icon && (
              <div className="p-1.5 rounded-full bg-[#F7F7F7]">
                <Icon className="w-4 h-4 text-[#666666]" />
              </div>
            )}
            {title}
          </div>
          {headerExtra}
        </div>
        {subtitle && (
          <p className="text-xs text-[#666666] font-normal ml-10 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {children}
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 border-t border-[#EEEEEE] px-6 py-5 flex items-center justify-end bg-white gap-3">
        {footer ? (
          footer
        ) : (
          <>
            <Button
              type="text"
              onClick={onCancel}
              className="h-11 px-6 text-sm font-semibold text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-xl transition-all"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={onSubmit}
              loading={isLoading}
              disabled={isLoading || submitDisabled}
              className="h-11 px-8 rounded-xl bg-[#111111] hover:bg-[#000000] text-white text-sm font-semibold border-none shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLabel || (isEditing ? 'Update' : 'Submit')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
