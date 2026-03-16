import { Popover } from 'antd';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  MoreHorizontal,
  X,
  Receipt,
  Clock,
  FilePlus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { format, differenceInDays, isPast, isToday, parseISO } from 'date-fns';
import {
  getRequirementCTAConfig,
  type RequirementStatus,
} from '@/lib/workflow';
import { Requirement as DomainRequirement } from '@/types/domain';
import {
  mapRequirementToStatus,
  mapRequirementToRole,
  mapRequirementToContext,
  mapRequirementToType,
} from '../utils/requirementState.utils';

interface RequirementCardProps {
  requirement: DomainRequirement;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onNavigate?: () => void;
  onRestore?: () => void;
  deleteLabel?: string;
  deleteIcon?: React.ReactNode;
  currentUserId?: number;
  onSubmitForReview?: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'INR': '₹',
  'AED': 'د.إ',
};

export function RequirementCard({
  requirement,
  onAccept,
  onReject,
  onEdit,
  onDelete,
  onDuplicate,
  onNavigate,
  onRestore,
  deleteLabel,
  deleteIcon,
  currentUserId,
  onSubmitForReview,
}: Readonly<RequirementCardProps>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Determine state using workflow module
  const ctaConfig = useMemo(() => {
    const status = mapRequirementToStatus(requirement);
    const type = mapRequirementToType(requirement);
    const role = mapRequirementToRole(requirement);
    const context = mapRequirementToContext(requirement, currentUserId, role);


    if (status === 'draft' || status === 'Draft') {
      const isOutsourced = type === 'outsourced';
      return {
        isPending: true,
        displayStatus: 'Draft',
        primaryAction: {
          label: isOutsourced ? 'Send to Partner' : 'Submit for Work',
          modal: 'none' as const
        },
        secondaryAction: undefined,
        tab: 'draft' as const,
      };
    }

    return getRequirementCTAConfig(status as RequirementStatus, role, context, type);
  }, [requirement, currentUserId]);

  const isPending = ctaConfig.isPending;
  const displayStatus = ctaConfig.displayStatus;

  const getUnifiedStatusConfig = () => {
    // 1. Billing / Financial Status (Highest Priority)
    if (requirement.invoice_status === 'paid') {
      return {
        label: requirement.type === 'outsourced' ? 'Payment Cleared' : 'Payment Received',
        icon: <CheckCircle className="w-3 h-3" />,
        className: 'bg-[#f3ffe6] text-[#7ccf00] border-[#7ccf00]',
        onClick: null
      };
    }
    if (requirement.invoice_status === 'sent' || requirement.invoice_status === 'partial' || requirement.invoice_status === 'overdue') {
      return {
        label: requirement.type === 'outsourced' ? 'Invoice Received' : 'Invoice Sent',
        icon: <CheckCircle className="w-3 h-3" />,
        className: 'bg-[#E3F2FD] text-[#2196F3] border-[#90CAF9]',
        onClick: null
      };
    }

    // 2. Project Status
    switch (requirement.status) {
      case 'completed': {
        if (requirement.type === 'outsourced') {
          return {
            label: 'Invoice Received',
            icon: <Receipt className="w-3 h-3" />,
            className: 'bg-[#F3E5F5] text-[#9C27B0] border-[#E1BEE7]',
            onClick: null
          };
        }
        // In-House / Client work completed
        const isInHouse = !requirement?.receiver_company_id || requirement?.receiver_company_id === requirement?.sender_company_id;

        if (isInHouse) {
          return {
            label: 'Completed',
            icon: <CheckCircle className="w-3 h-3" />,
            className: 'bg-[#f3ffe6] text-[#7ccf00] border-[#7ccf00]',
            onClick: null
          };
        }

        // Client work completed -> Ready to Bill
        const price = requirement.quoted_price || requirement.estimated_cost || requirement.budget;
        const symbol = CURRENCY_SYMBOLS[requirement.currency || 'USD'] || '$';
        const priceLabel = price ? ` - ${symbol}${Number(price).toLocaleString()}` : '';
        return {
          label: `Ready to Bill${priceLabel}`,
          icon: <Receipt className="w-3 h-3" />,
          className: 'bg-[#FFF3E0] text-[#EF6C00] border-[#FFE0B2]',
          onClick: null
        };
      }
      case 'in-progress':
        return {
          label: 'In Progress',
          icon: <Clock className="w-3 h-3" />,
          className: 'bg-[#E3F2FD] text-[#2F80ED] border-[#90CAF9]',
          onClick: null
        };
      case 'delayed':
        return {
          label: 'Delayed',
          icon: <Clock className="w-3 h-3" />,
          className: 'bg-[#FEE2E2] text-[#EB5757] border-[#FCA5A5]',
          onClick: null
        };
      case 'draft':
        return {
          label: 'Draft',
          icon: <FilePlus className="w-3 h-3" />,
          className: 'bg-[#F3F4F6] text-[#666666] border-[#D1D5DB]',
          onClick: null
        };
      default:
        return {
          label: 'To Do',
          icon: <Clock className="w-3 h-3" />,
          className: 'bg-[#F3F4F6] text-[#6B7280] border-[#D1D5DB]',
          onClick: null
        };
    }
  };

  const statusConfig = getUnifiedStatusConfig();

  const getTimelineStatus = (dueDate?: string) => {
    if (!dueDate || dueDate === 'TBD') return null;
    const due = new Date(dueDate);
    if (isValidDate(due)) {
      if (isPast(due) && !isToday(due)) {
        const daysOverdue = differenceInDays(new Date(), due);
        return { text: `Overdue by ${daysOverdue} days`, color: 'text-[#DC2626]' };
      }
      if (isToday(due)) return { text: 'Deadline today', color: 'text-[#F59E0B]' };
      const daysLeft = differenceInDays(due, new Date());
      return { text: `${daysLeft} days to deadline`, color: 'text-[#666666]' };
    }
    return null;
  };

  // Helper to check valid date
  const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());

  const timelineStatus = getTimelineStatus(requirement.end_date ?? undefined);

  /* Helper methods replaced by getRequirementActionState utility */

  const getCostDisplay = () => {
    const val = requirement.quoted_price || requirement.estimated_cost || requirement.budget;
    if (!val) return null;

    // Robust currency handling: Try exact match, then uppercase match, default to code or '$'
    const currencyCode = requirement.currency ? requirement.currency.toUpperCase() : 'USD';
    const symbol = CURRENCY_SYMBOLS[currencyCode] || (requirement.currency ? requirement.currency : '$');

    return `${symbol}${Number(val).toLocaleString()}`;
  };

  const costDisplay = getCostDisplay();

  // Advance overdue badge
  const advanceOverdueInfo = useMemo(() => {
    if (!requirement.requires_advance_payment) return null;
    const advInvoice = requirement.advance_invoice;
    if (!advInvoice) return null;
    const isOverdue = advInvoice.status === 'overdue'
      || (advInvoice.due_date && isPast(parseISO(advInvoice.due_date)) && advInvoice.status !== 'paid');
    if (!isOverdue) return null;
    const dueDate = advInvoice.due_date;
    if (!dueDate) return { text: 'Advance overdue' };
    const days = differenceInDays(new Date(), parseISO(dueDate));
    return { text: `Advance overdue by ${days} day${days !== 1 ? 's' : ''}` };
  }, [requirement]);

  return (
    <div
      onClick={onNavigate}
      className={`group border rounded-[20px] p-5 hover:border-[#ff3b3b]/20 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col relative w-full
        ${isPending
          ? 'border-dashed border-[#E5E7EB] bg-[#F9FAFB]'
          : 'border-[#EEEEEE] bg-white'
        }
      `}
    >
      {/* Top Right Controls: More Options */}
      {(onEdit || onDuplicate || onRestore || onDelete || onSubmitForReview) && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* More Options Menu */}
          <Popover
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            content={
              <div className="w-40" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit?.();
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 rounded text-[#111111]"
                  >
                    Edit Details
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDuplicate?.();
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 rounded text-[#111111]"
                  >
                    Duplicate
                  </button>
                )}

                {onRestore && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRestore();
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 rounded text-green-600 flex items-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Make Active
                  </button>
                )}

                {onSubmitForReview && ['In_Progress', 'Delayed', 'On_Hold'].includes(requirement.rawStatus || '') && requirement.tasksTotal > 0 && requirement.tasksCompleted === requirement.tasksTotal && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSubmitForReview();
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 rounded text-[#15803D]"
                  >
                    Submit for Review
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete?.();
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 rounded flex items-center gap-2 ${deleteLabel === 'Archive' ? 'text-[#F59E0B]' : 'text-[#ff3b3b]'}`}
                  >
                    {deleteIcon || <Trash2 className="w-3.5 h-3.5" />}
                    {deleteLabel || 'Delete'}
                  </button>
                )}
              </div>
            }
            trigger="click"
            placement="bottomRight"
            overlayClassName="requirement-card-popover"
            arrow={false}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Popover handles state
              }}
              className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] text-[#999999] hover:text-[#111111] transition-all opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </Popover>
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        {/* Context Row: [TYPE] | [Contact Name] | [Company Name] */}
        <div className="flex items-center gap-2 mb-2">
          {/* Type Badge: For outsourced reqs, receiver sees INHOUSE, sender sees OUTSOURCED */}
          <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-[#F5F5F5] text-[#666666] uppercase border border-[#EEEEEE] tracking-wide whitespace-nowrap">
            {requirement.type === 'outsourced'
              ? (requirement.isReceiver ? 'client work' : 'outsourced')
              : (['client', 'Client work', 'Client Work'].includes(requirement.type || '')
                ? (requirement.isSender ? 'outsourced' : 'client work')
                : 'inhouse')}
          </span>

          {/* Contact Person Name - only show if available */}
          {requirement.headerContact && (
            <>
              <span className="text-[#E5E5E5] text-2xs">|</span>
              <span className="font-bold text-[#111111] text-xs truncate max-w-[100px]" title={requirement.headerContact}>
                {requirement.headerContact}
              </span>
            </>
          )}

          {/* Company Name - Use headerCompany which is correctly computed, no hardcoded fallbacks */}
          {requirement.headerCompany && (
            <>
              <span className="text-[#E5E5E5] shrink-0 text-2xs">|</span>
              <span className="font-bold text-[#999999] text-xs truncate max-w-[100px]" title={requirement.headerCompany}>
                {requirement.headerCompany}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <div className="flex justify-between items-start gap-2 pr-16">
          <h3 className="font-bold text-sm leading-snug text-[#111111] group-hover:text-[#ff3b3b] transition-colors line-clamp-2">
            {requirement.title}
          </h3>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {requirement.departments && requirement.departments.length > 0 && requirement.departments.slice(0, 3).map((dept: string, i: number) => (
          <span key={i} className="px-1.5 py-0.5 rounded-md bg-white border border-[#E5E5E5] text-xs text-[#666666] font-medium">
            {dept}
          </span>
        ))}
        {requirement.departments && requirement.departments.length > 3 && (
          <span className="px-1.5 py-0.5 text-2xs text-[#999999]">+{requirement.departments.length - 3}</span>
        )}
        {advanceOverdueInfo && (
          <span className="px-1.5 py-0.5 rounded-md bg-red-50 border border-red-200 text-xs text-[#D14343] font-semibold flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {advanceOverdueInfo.text}
          </span>
        )}
      </div>

      {/* Date & Description */}
      <div className="mb-4">
        {(requirement.startDate || requirement.end_date) && (
          <div className="flex items-center gap-2 text-xs text-[#666666] font-medium mb-2 bg-[#F9FAFB] p-1.5 rounded-md w-fit max-w-full">
            <CalendarIcon className="w-3 h-3 text-[#999999] flex-shrink-0" />
            <span className="truncate">
              {requirement.startDate ? format(new Date(requirement.startDate), 'MMM d') : ''}
              {requirement.startDate ? ' - ' : ''}
              {requirement.end_date && requirement.end_date !== 'TBD' ? format(new Date(requirement.end_date), 'MMM d') : 'TBD'}
            </span>
            {timelineStatus && (
              <span className={`pl-1 border-l border-[#E5E5E5] ${timelineStatus.color} whitespace-nowrap`}>
                {timelineStatus.text}
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-[#666666] font-medium line-clamp-3 leading-relaxed mb-0">
          {requirement.description}
        </p>
      </div>

      {/* Progress Section */}
      {!isPending && (
        <div className="mb-4 mt-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-2xs text-[#999999] font-medium">
              Progress
            </span>
            <span className="text-2xs text-[#111111] font-bold">
              {requirement.progress}%
            </span>
          </div>
          <div className="w-full h-[3.5px] bg-[#F0F0F0] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${requirement.status === 'completed'
                ? 'bg-[#7ccf00]'
                : requirement.status === 'delayed'
                  ? 'bg-[#ff3b3b]'
                  : 'bg-[#2F80ED]'
                }`}
              style={{ width: `${Math.min(requirement.progress ?? 0, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Pending Message */}
      {isPending && (
        <div className="mt-auto mb-4 min-h-[40px] flex items-center justify-center text-xs text-[#999999] italic bg-[#F9FAFB] rounded-lg border border-dashed border-[#E5E7EB] mx-1 px-2 text-center">
          {displayStatus}
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-[#EEEEEE] flex items-center justify-between mt-auto">

        {/* Left: Priority & Assignees */}
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <div className={`w-2 h-2 rounded-full ${requirement.priority === 'high' || requirement.is_high_priority ? 'bg-[#ff3b3b]' :
            requirement.priority === 'medium' ? 'bg-[#F59E0B]' :
              'bg-[#3B82F6]'
            }`} title={`Priority: ${requirement.priority || (requirement.is_high_priority ? 'High' : 'Normal')}`} />

          {/* Assignees */}
          <div className="flex -space-x-1.5">
            {(requirement.assignedTo || []).slice(0, 3).map((person: string, i: number) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full bg-[#F7F7F7] border border-white flex items-center justify-center text-2xs font-bold text-[#666666] relative z-[3] hover:z-10 hover:scale-110 transition-all shadow-sm"
                title={person}
              >
                {person.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Status or Action */}
        <div className="flex items-center gap-3">
          {costDisplay && (
            <span className="text-xs font-bold text-[#111111]">
              {costDisplay}
            </span>
          )}

          {isPending ? (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {/* 
                  Action Button Logic using Utility State:
                  - 'Reject': Show Reject Button
                  - 'Edit': Show Edit Button (Sender Resend) - maps to onEdit? No, RequirementsPage needs to handle "Resend". 
                            Typical onEdit opens edit modal. We need to ensure saving there triggers transition if needed? 
                            Actually, RequirementsPage handleEditAndResend will just open Edit Modal. 
                            Saving that modal calls 'updateRequirement'. 
                            So we just need to trigger the right callback prop here.
                  - 'Revise': Show Revise Button (Receiver Revise Quote)
               */}

              {/* REJECT BUTTON - Show if secondaryAction is danger type */}
              {ctaConfig.secondaryAction?.type === 'danger' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReject?.(); }}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-[#ff3b3b] text-[#ff3b3b] hover:bg-[#ff3b3b] hover:text-white transition-all shadow-sm"
                  title={ctaConfig.secondaryAction.label || 'Reject'}
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* EDIT BUTTON (for Drafts) */}
              {ctaConfig.tab === 'draft' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                  className="px-3 h-6 flex items-center justify-center rounded-full bg-white border border-[#E5E5E5] text-[#666666] hover:bg-[#F3F4F6] hover:text-[#111111] transition-all shadow-sm text-2xs font-bold"
                >
                  Edit
                </button>
              )}

              {/* PRIMARY ACTION BUTTON */}
              {ctaConfig.primaryAction && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const { modal } = ctaConfig.primaryAction!;
                    if (modal === 'edit') {
                      onEdit?.();
                    } else if (modal === 'quotation' || modal === 'mapping' || modal === 'none' || modal === 'client_accept' || modal === 'approval') {
                      // quotation, mapping, client_accept, approval and none (direct API) all use onAccept
                      onAccept?.();
                    }
                  }}
                  className={`px-2 h-6 flex items-center justify-center rounded-full bg-[#7ccf00] text-white hover:bg-[#6bb800] transition-all shadow-sm text-2xs font-bold whitespace-nowrap`}
                  title={ctaConfig.primaryAction.label}
                >
                  {ctaConfig.primaryAction.label}
                </button>
              )}
            </div>
          ) : (
            <div
              className={`
                    flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border transition-all
                    ${statusConfig.className}
                `}
            >
              <span className="capitalize">{statusConfig.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
