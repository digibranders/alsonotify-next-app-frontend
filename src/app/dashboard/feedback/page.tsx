'use client';

import React, { useMemo, useState } from 'react';
import { Select, Modal, Empty, App, Skeleton } from 'antd';
import { PageLayout } from '@/components/layout/PageLayout';
import { 
  Eye, 
  Bug, 
  Lightbulb, 
  TrendingUp, 
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle,
  ThumbsUp,
  Loader2
} from 'lucide-react';
import { 
  useAdminFeedbackList, 
  useFeedbackList,
  useToggleFeedbackVote
} from '@/hooks/useFeedback';
import { FeedbackItem, FeedbackStatus, FeedbackType } from '@/services/feedback';
import { useUserDetails } from '@/hooks/useUser';
import { getRoleFromUser } from '@/utils/roleUtils';
import { FeedbackWidget } from '@/components/common/FeedbackWidget';

import { PaginationBar } from '@/components/ui/PaginationBar';

/* ---------- Helpers & Config ---------- */

const getFeedbackTypeConfig = (type: FeedbackType) => {
  switch (type) {
    case FeedbackType.BUG:
      return { label: 'Bug', color: '#EF4444', bgColor: '#FEE2E2', icon: <Bug className="w-4 h-4" /> };
    case FeedbackType.FEATURE:
      return { label: 'Feature', color: '#F59E0B', bgColor: '#FEF3C7', icon: <Lightbulb className="w-4 h-4" /> };
    case FeedbackType.IMPROVEMENT:
      return { label: 'Improvement', color: '#10B981', bgColor: '#D1FAE5', icon: <TrendingUp className="w-4 h-4" /> };
    case FeedbackType.OTHER:
    default:
      return { label: 'Other', color: '#6366F1', bgColor: '#E0E7FF', icon: <MessageCircle className="w-4 h-4" /> };
  }
};

const getStatusConfig = (status: FeedbackStatus) => {
  switch (status) {
    case FeedbackStatus.IN_PROGRESS:
      return { color: '#3B82F6', bgColor: '#DBEAFE', icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'In Progress' };
    case FeedbackStatus.PLANNED:
      return { color: '#8B5CF6', bgColor: '#EDE9FE', icon: <Clock className="w-3 h-3" />, label: 'Planned' };
    case FeedbackStatus.COMPLETED:
      return { color: '#10B981', bgColor: '#D1FAE5', icon: <CheckCircle className="w-3 h-3" />, label: 'Completed' };
    case FeedbackStatus.DECLINED:
      return { color: '#EF4444', bgColor: '#FEE2E2', icon: <XCircle className="w-3 h-3" />, label: 'Declined' };
    case FeedbackStatus.UNDER_REVIEW:
      return { color: '#F59E0B', bgColor: '#FEF3C7', icon: <Eye className="w-3 h-3" />, label: 'Under Review' };
    case FeedbackStatus.OPEN:
    default:
      return { color: '#6B7280', bgColor: '#F3F4F6', icon: null, label: 'Open' };
  }
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const STATUS_OPTIONS: FeedbackStatus[] = [
  FeedbackStatus.OPEN,
  FeedbackStatus.UNDER_REVIEW,
  FeedbackStatus.PLANNED,
  FeedbackStatus.IN_PROGRESS,
  FeedbackStatus.COMPLETED,
  FeedbackStatus.DECLINED,
];

const TYPE_OPTIONS: FeedbackType[] = [
  FeedbackType.FEATURE,
  FeedbackType.BUG,
  FeedbackType.IMPROVEMENT,
  FeedbackType.OTHER,
];

// --- User Avatar Helper ---
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const UserAvatar = ({ name }: { name?: string | null }) => {
  const firstName = name?.split(' ')[0] || 'Anonymous';
  const initials = firstName.slice(0, 1).toUpperCase();
  const bgColor = stringToColor(firstName);

  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-bold text-white shrink-0"
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
};

/* ---------- Main Component ---------- */

export default function AdminFeedbackPage() {
  const { message } = App.useApp();
  const { data: userDetails, isLoading: isLoadingUser } = useUserDetails();
  
  // --- State ---
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<FeedbackType | undefined>();
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // --- Data & Mutations ---
  const { data: adminData, isLoading: isAdminLoading, refetch: refetchAdmin } = useAdminFeedbackList({
    status: statusFilter,
    type: typeFilter,
  });

  const { data: publicData, isLoading: isPublicLoading, refetch: refetchPublic } = useFeedbackList({
    status: statusFilter,
    type: typeFilter,
  });

  // Check if user is Admin
  const isAdmin = useMemo(() => {
    const userData = userDetails?.result || {};
    return getRoleFromUser(userData) === 'Admin';
  }, [userDetails]);

  const data = isAdmin ? adminData : publicData;
  const isLoading = isAdmin ? isAdminLoading : isPublicLoading;
  const refetch = isAdmin ? refetchAdmin : refetchPublic;

  const { mutate: mutateVote } = useToggleFeedbackVote();

  // Loading States for specific rows
  const [rowVotingId, setRowVotingId] = useState<number | null>(null);

  // Sorting
  const sortedFeedbacks = useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort((a: FeedbackItem, b: FeedbackItem) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [data]
  );

  // Pagination
  const paginatedFeedbacks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFeedbacks.slice(start, start + pageSize);
  }, [sortedFeedbacks, currentPage, pageSize]);

  // --- Handlers ---

  const handleToggleVote = (id: number) => {
    setRowVotingId(id);
    mutateVote(id, {
      onSuccess: () => {
        setRowVotingId(null);
        refetch();
      },
      onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to vote';
        message.error(errorMessage);
        setRowVotingId(null);
      },
    });
  };

  // Show loading state while checking user
  if (isLoadingUser) {
    return (
      <PageLayout title="Feedback Management">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#ff3b3b] mx-auto mb-4" />
            <p className="text-[#666666] text-sm">Checking permissions...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  /* ----- Render ----- */
  return (
    <PageLayout 
      title="Feedbacks"
      titleAction={{
        onClick: () => setShowFeedbackModal(true),
        label: 'Add Feedback'
      }}
      customFilters={
        <div className="flex items-center gap-3">
          <Select
            showSearch={{
              filterOption: (input, option) =>
                (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
            }}
            allowClear
            placeholder="Status"
            style={{ width: 150 }}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            className="feedback-admin-select"
            options={STATUS_OPTIONS.map((s) => ({
              value: s,
              label: getStatusConfig(s).label,
            }))}
          />
          
          <Select
            showSearch={{
              filterOption: (input, option) =>
                (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
            }}
            allowClear
            placeholder="Type"
            style={{ width: 140 }}
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            className="feedback-admin-select"
            options={TYPE_OPTIONS.map((t) => ({
              value: t,
              label: getFeedbackTypeConfig(t).label,
            }))}
          />
        </div>
      }
    >
      <div className="flex-1 overflow-hidden flex flex-col pt-4">
        {/* Table Header */}
        <div className="grid grid-cols-[60px_1fr_120px_120px_140px_60px] gap-4 px-4 mb-2 text-xs font-bold text-[#999999] uppercase tracking-wider">
          <div className="text-center">Votes</div>
          <div>Feedback</div>
          <div className="text-center">Status</div>
          <div className="text-center">Type</div>
          <div className="text-center">Date</div>
          <div className="text-right pr-2">Actions</div>
        </div>

        {/* List Section */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 pb-8">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#EEEEEE] rounded-[16px] p-4 h-20">
                <Skeleton active avatar={{ size: 'small' }} paragraph={{ rows: 1 }} />
              </div>
            ))
          ) : !sortedFeedbacks.length ? (
            <div className="bg-white rounded-[16px] border border-[#EEEEEE] p-12 text-center">
              <Empty description="No feedback items found matching your filters." />
            </div>
          ) : (
            <>
              {paginatedFeedbacks.map((item: FeedbackItem) => {
                const typeConfig = getFeedbackTypeConfig(item.type);
                const statusConfig = getStatusConfig(item.status);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={`
                      group bg-white border border-[#EEEEEE] rounded-[16px] px-4 py-3 transition-all duration-300 cursor-pointer relative
                      hover:border-[#ff3b3b]/20 hover:shadow-lg grid grid-cols-[60px_1fr_120px_120px_140px_60px] gap-4 items-center
                      ${item.is_deleted ? 'opacity-60' : ''}
                    `}
                  >
                    {/* Votes */}
                    <div className="flex flex-col items-center justify-center border-r border-[#EEEEEE] pr-4 mr-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleVote(item.id)}
                        disabled={rowVotingId === item.id}
                        className={`group/vote flex flex-col items-center justify-center p-1 rounded-lg transition-colors ${
                          item.hasVoted 
                            ? 'text-[#ff3b3b]' 
                            : 'text-[#999999] hover:text-[#ff3b3b]'
                        }`}
                      >
                        {rowVotingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mb-0.5" />
                        ) : (
                          <ThumbsUp className={`w-3.5 h-3.5 mb-0.5 ${item.hasVoted ? 'fill-[#ff3b3b]' : ''}`} />
                        )}
                        <span className="text-xs font-bold leading-none">
                          {item.voteCount || 0}
                        </span>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 pr-4">
                      <div className="font-bold text-xs !text-[#111111] group-hover:text-[#ff3b3b] transition-colors truncate mb-0.5">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={item.createdBy?.name} />
                        <span className="text-[0.6875rem] text-[#999999] font-medium truncate">
                           {item.description}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex justify-center">
                      <div
                        className="px-2 py-0.5 rounded-lg text-[0.6875rem] font-bold flex items-center gap-1.5 whitespace-nowrap"
                        style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                      >
                        {statusConfig.icon}
                        {statusConfig.label.toUpperCase()}
                      </div>
                    </div>

                    {/* Type */}
                    <div className="flex justify-center">
                      <div
                        className="px-2 py-0.5 rounded-lg text-[0.6875rem] font-bold flex items-center gap-1.5 whitespace-nowrap"
                        style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                      >
                        {typeConfig.icon ? React.cloneElement(typeConfig.icon as React.ReactElement<any>, { className: 'w-3 h-3' }) : null}
                        {typeConfig.label.toUpperCase()}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-center text-[0.625rem] font-medium text-[#999999] whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                         day: '2-digit',
                         month: 'short',
                         year: 'numeric'
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pr-2">
                      <div className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
                        <Eye className="w-4 h-4 text-[#666666]" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {sortedFeedbacks.length > pageSize && (
                <div className="flex justify-end pt-4">
                  <PaginationBar
                    currentPage={currentPage}
                    totalItems={sortedFeedbacks.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    itemLabel="feedback items"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Modal */}
        <Modal
          open={!!selected}
          onCancel={() => setSelected(null)}
          footer={null}
          width="min(700px, 95vw)"
          centered
          styles={{
            body: { padding: '24px' }
          }}
          title={
            selected && (
              <div className="flex items-center gap-2 text-lg font-bold text-[#111111]">
                {getFeedbackTypeConfig(selected.type).icon}
                <span>Feedback Details</span>
              </div>
            )
          }
        >
          {selected && (
            <div className="pt-2">
              <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2">
                  <h2 className="text-xl font-bold text-[#111111] mb-3 leading-snug">
                    {selected.title}
                  </h2>
                  <p className="text-[0.9375rem] text-[#666666] font-normal whitespace-pre-wrap mb-6 leading-relaxed">
                    {selected.description}
                  </p>

                  {isAdmin && (
                    <div className="border-t border-[#EEEEEE] pt-6">
                      <p className="text-xs text-[#999999] font-bold uppercase tracking-wider mb-3">Reporter</p>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={selected.createdBy?.name} />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#111111]">
                            {selected.createdBy?.name?.split(' ')[0] || 'Anonymous'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-l border-[#EEEEEE] pl-8 space-y-6">
                  <div>
                    <p className="text-xs text-[#999999] font-bold uppercase tracking-wider mb-2">Status</p>
                    <div
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                      style={{ 
                        backgroundColor: getStatusConfig(selected.status).bgColor, 
                        color: getStatusConfig(selected.status).color 
                      }}
                    >
                      {getStatusConfig(selected.status).icon}
                      {getStatusConfig(selected.status).label}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[#999999] font-bold uppercase tracking-wider mb-2">Type</p>
                    <div
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                      style={{ 
                        backgroundColor: getFeedbackTypeConfig(selected.type).bgColor, 
                        color: getFeedbackTypeConfig(selected.type).color 
                      }}
                    >
                      {getFeedbackTypeConfig(selected.type).icon}
                      {getFeedbackTypeConfig(selected.type).label}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[#999999] font-bold uppercase tracking-wider mb-2">Date Created</p>
                    <p className="text-sm font-semibold text-[#111111]">
                      {formatDateTime(selected.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[#999999] font-bold uppercase tracking-wider mb-2">Popularity</p>
                    <button
                      onClick={() => handleToggleVote(selected.id)}
                      disabled={rowVotingId === selected.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                        selected.hasVoted 
                          ? 'border-[#ff3b3b] bg-[#FEF2F2] text-[#ff3b3b]' 
                          : 'border-[#EEEEEE] hover:border-[#ff3b3b]/30 text-[#111111]'
                      }`}
                    >
                      {rowVotingId === selected.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ThumbsUp className={`w-4 h-4 ${selected.hasVoted ? 'fill-[#ff3b3b]' : ''}`} />
                      )}
                      <p className="text-sm font-bold">
                        {selected.voteCount ?? 0} Upvotes
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Create Feedback Modal */}
        <FeedbackWidget 
          open={showFeedbackModal} 
          onClose={() => setShowFeedbackModal(false)} 
        />
      </div>
    </PageLayout>
  );
}
