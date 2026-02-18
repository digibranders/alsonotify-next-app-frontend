'use client';

import React, { useMemo, useState } from 'react';
import { Select, Modal, Empty, Popconfirm, App, Switch, Skeleton } from 'antd';
import { PageLayout } from '@/components/layout/PageLayout';
import { 
  Eye, 
  Trash2, 
  Bug, 
  Lightbulb, 
  TrendingUp, 
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle,
  ThumbsUp,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { 
  useAdminFeedbackList, 
  useUpdateFeedbackStatus, 
  useSoftDeleteFeedback 
} from '@/hooks/useFeedback';
import { FeedbackItem, FeedbackStatus, FeedbackType } from '@/services/feedback';
import { useUserDetails } from '@/hooks/useUser';
import { getRoleFromUser } from '@/utils/roleUtils';

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

const UserAvatar = ({ name, email }: { name?: string | null; email?: string | null }) => {
  const displayName = name || email || '?';
  const initials = displayName.slice(0, 2).toUpperCase();
  const bgColor = stringToColor(displayName);

  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-bold text-white shrink-0"
      style={{ backgroundColor: bgColor }}
      title={displayName}
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
  const [showDeleted, setShowDeleted] = useState(false);
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // --- Data & Mutations ---
  const { data, isLoading, refetch } = useAdminFeedbackList({
    status: statusFilter,
    type: typeFilter,
    includeDeleted: showDeleted,
  });

  const { mutate: mutateStatus, isPending: statusUpdating } = useUpdateFeedbackStatus();
  const { mutate: mutateDelete, isPending: deleting } = useSoftDeleteFeedback();

  // Loading States for specific rows
  const [rowUpdatingId, setRowUpdatingId] = useState<number | null>(null);
  const [rowDeletingId, setRowDeletingId] = useState<number | null>(null);

  // Sorting
  const sortedFeedbacks = useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [data]
  );

  // Pagination
  const paginatedFeedbacks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFeedbacks.slice(start, start + pageSize);
  }, [sortedFeedbacks, currentPage, pageSize]);

  // --- Handlers ---
  const handleStatusChange = (id: number, status: FeedbackStatus) => {
    setRowUpdatingId(id);
    mutateStatus(
      { id, status },
      {
        onSuccess: () => {
          message.success('Status updated');
          setRowUpdatingId(null);
          refetch();
        },
        onError: (err: any) => {
          const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update status';
          message.error(errorMessage);
          setRowUpdatingId(null);
        },
      }
    );
  };

  const handleSoftDelete = (id: number) => {
    setRowDeletingId(id);
    mutateDelete(id, {
      onSuccess: () => {
        message.success('Feedback deleted');
        setRowDeletingId(null);
        refetch();
      },
      onError: (err: any) => {
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete feedback';
        message.error(errorMessage);
        setRowDeletingId(null);
      },
    });
  };

  // Check if user is Admin
  const isAdmin = useMemo(() => {
    const userData = userDetails?.result || {};
    return getRoleFromUser(userData) === 'Admin';
  }, [userDetails]);

  // Show loading state while checking user
  if (isLoadingUser) {
    return (

        <PageLayout title="Feedback Admin">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#ff3b3b] mx-auto mb-4" />
              <p className="text-[#666666] text-sm">Checking permissions...</p>
            </div>
          </div>
        </PageLayout>

    );
  }

  // Show unauthorized message if not Admin
  if (!isAdmin) {
    return (

        <PageLayout title="Feedback Admin">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-[#EF4444]" />
              </div>
              <h2 className="text-2xl font-bold text-[#111111] mb-2">
                Access Denied
              </h2>
              <p className="text-[#666666] text-[0.9375rem] font-normal">
                You are not authorized to access this page. Only Admin users can view and manage feedback.
              </p>
            </div>
          </div>
        </PageLayout>

    );
  }

  /* ----- Render ----- */
  return (

      <PageLayout 
        title="Feedback Management"
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
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[#EEEEEE]">
            <span className="text-xs text-[#666666] font-medium">Include Deleted</span>
            <Switch size="small" checked={showDeleted} onChange={setShowDeleted} />
          </div>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pt-1">
        {/* Banner/Intro */}
        {!isLoading && sortedFeedbacks.length > 0 && (
          <div className="mb-2">
            <p className="text-sm text-[#666666] font-normal">
              Triage and manage feedback from your team to improve the application.
            </p>
          </div>
        )}

        {/* List Section */}
        <div className="space-y-3 pb-8">
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
              <Skeleton active avatar paragraph={{ rows: 2 }} />
            </div>
          ) : !sortedFeedbacks.length ? (
            <div className="bg-white rounded-2xl border border-[#EEEEEE] p-12 text-center">
              <Empty description="No feedback items found matching your filters." />
            </div>
          ) : (
            <>
              {paginatedFeedbacks.map((item) => {
                const isUpdating = rowUpdatingId === item.id && statusUpdating;
                const isDeleting = rowDeletingId === item.id && deleting;
                const typeConfig = getFeedbackTypeConfig(item.type);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border border-[#EEEEEE] p-4 hover:shadow-lg hover:border-[#ff3b3b]/10 transition-all ${
                      item.is_deleted ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Vote Count Pill */}
                      <div className="w-12 shrink-0">
                        <div className="bg-[#F7F7F7] rounded-xl p-2 text-center border border-[#EEEEEE]">
                          <ThumbsUp className="w-4 h-4 text-[#ff3b3b] mx-auto mb-1" />
                          <span className="text-sm font-bold text-[#111111]">
                            {item.voteCount || 0}
                          </span>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="text-base font-semibold text-[#111111]">
                            {item.title}
                          </h3>
                          <span className="text-xs text-[#999999] shrink-0 font-normal">
                            {formatDateTime(item.created_at)}
                          </span>
                        </div>

                        <p className="text-sm text-[#666666] line-clamp-2 mb-3 font-normal">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-3 flex-wrap">
                          <UserAvatar name={item.createdBy?.name} email={item.createdBy?.email} />
                          
                          <div
                            className="px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                            style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
                          >
                            {typeConfig.icon}
                            {typeConfig.label}
                          </div>

                          {item.is_deleted && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-[#FEE2E2] text-[#EF4444]">
                              DELETED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 items-end shrink-0">
                        <Select
                          size="small"
                          loading={isUpdating}
                          value={item.status}
                          style={{ width: 140 }}
                          className="feedback-status-select"
                          onChange={(val) => handleStatusChange(item.id, val)}
                          options={STATUS_OPTIONS.map((s) => ({
                            value: s,
                            label: getStatusConfig(s).label,
                          }))}
                        />

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelected(item)}
                            className="w-8 h-8 rounded-lg bg-[#F7F7F7] hover:bg-[#EEEEEE] flex items-center justify-center transition-colors border border-[#EEEEEE]"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-[#666666]" />
                          </button>

                          <Popconfirm
                            title="Delete this feedback?"
                            description="This hides it from users but keeps it in the database."
                            onConfirm={() => handleSoftDelete(item.id)}
                            okText="Yes"
                            cancelText="No"
                            disabled={item.is_deleted || isDeleting}
                          >
                            <button
                              disabled={item.is_deleted || isDeleting}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
                                item.is_deleted || isDeleting
                                  ? 'bg-[#F7F7F7] text-[#CCCCCC] cursor-not-allowed border-transparent'
                                  : 'bg-[#FEE2E2] hover:bg-[#FECACA] text-[#EF4444] border-[#FEE2E2]'
                              }`}
                              title="Soft Delete"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#EF4444]" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </Popconfirm>
                        </div>
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

                  <div className="border-t border-[#EEEEEE] pt-6">
                    <p className="text-xs text-[#999999] font-bold uppercase tracking-wider mb-3">Reporter</p>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={selected.createdBy?.name} email={selected.createdBy?.email} />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#111111]">
                          {selected.createdBy?.name || 'Anonymous User'}
                        </span>
                        <span className="text-xs text-[#999999] font-normal">
                          {selected.createdBy?.email}
                        </span>
                      </div>
                    </div>
                  </div>
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
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-[#ff3b3b]" />
                      <p className="text-sm font-bold text-[#111111]">
                        {selected.voteCount ?? 0} Upvotes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageLayout>

  );
}
