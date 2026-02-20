import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PageLayout } from '../../layout/PageLayout';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { Modal, Form, DatePicker, Select, Input, Button, Checkbox, App, Tooltip } from 'antd';
import { Skeleton } from '../../ui/Skeleton';
import { useCompanyLeaves, useUpdateLeaveStatus, useApplyForLeave } from '../../../hooks/useLeave';
import { LeaveType, updateLeaveStatus } from '../../../services/leave';
import { LeaveRow, Leave } from './rows/LeaveRow';
import { useTabSync } from '@/hooks/useTabSync';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useFloatingMenu } from '../../../context/FloatingMenuContext';
import { useUserDetails } from '../../../hooks/useUser';
import { getRoleFromUser } from '../../../utils/roleUtils';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

type LeaveTab = 'all' | 'pending' | 'approved' | 'rejected';

export function LeavesPage() {
  // Use standardized tab sync hook for consistent URL handling
  const [activeTab, setActiveTab] = useTabSync<LeaveTab>({
    defaultTab: 'all',
    validTabs: ['all', 'pending', 'approved', 'rejected']
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    leaveType: 'All',
    employee: 'All'
  });
  const [selectedLeaves, setSelectedLeaves] = useState<string[]>([]);
  const [isApplyLeaveModalOpen, setIsApplyLeaveModalOpen] = useState(false);
  const [form] = Form.useForm<ApplyLeaveFormValues>();

  const { message, modal } = App.useApp();
  const messageRef = useRef(message);
  const modalRef = useRef(modal);
  useEffect(() => { messageRef.current = message; modalRef.current = modal; }, [message, modal]);

  const queryClient = useQueryClient();
  const { setExpandedContent } = useFloatingMenu();

  const { data: userDetailsData } = useUserDetails();
  const userRole = getRoleFromUser(userDetailsData?.result);
  const canApprove = ['Admin', 'HR', 'Manager'].includes(userRole);

  const { data: leavesData, isLoading, error } = useCompanyLeaves();
  const updateStatusMutation = useUpdateLeaveStatus();
  const applyLeaveMutation = useApplyForLeave();

  // Helper functions
  const formatDate = (dateString: string): string => dayjs(dateString).format('DD-MMM-YYYY');
  const normalizeStatus = (status: string): 'pending' | 'approved' | 'rejected' => {
    const upper = status.toUpperCase();
    if (upper === 'APPROVED') return 'approved';
    if (upper === 'REJECTED') return 'rejected';
    return 'pending';
  };
  const normalizeLeaveType = (type: string): 'sick' | 'casual' | 'vacation' => {
    const lower = type.toLowerCase();
    if (lower.includes('sick')) return 'sick';
    if (lower.includes('casual')) return 'casual';
    if (lower.includes('vacation')) return 'vacation';
    return 'casual';
  };

  // Process leaves data
  const processedLeaves: Leave[] = useMemo(() => {
    if (!leavesData?.result) return [];
    return leavesData.result.map((leave: LeaveType) => {
      const daysValue = typeof leave.days === 'number' ? leave.days : (Number.parseFloat(leave.days as unknown as string) || leave.days_count || 0);
      return {
        id: String(leave.id),
        employeeName: leave.user?.name || 'Unknown Employee',
        leaveType: normalizeLeaveType(leave.leave_type),
        startDate: formatDate(leave.start_date),
        endDate: formatDate(leave.end_date),
        days: Math.round(daysValue) || 1,
        reason: leave.reason || 'No reason provided',
        status: normalizeStatus(leave.status),
        appliedOn: leave.created_at ? formatDate(leave.created_at) : formatDate(leave.start_date),
      };
    });
  }, [leavesData]);

  // Filter leaves
  const filteredLeaves = useMemo(() => {
    return processedLeaves.filter(leave => {
      const matchesTab = activeTab === 'all' || leave.status === activeTab;
      const matchesSearch = searchQuery === '' ||
        leave.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLeaveType = filters.leaveType === 'All' ||
        filters.leaveType.toLowerCase().split(',').map(t => t.trim()).includes(leave.leaveType);

      const matchesEmployee = filters.employee === 'All' ||
        filters.employee.split(',').map(e => e.trim()).includes(leave.employeeName);
      return matchesTab && matchesSearch && matchesLeaveType && matchesEmployee;
    });
  }, [processedLeaves, activeTab, searchQuery, filters]);

  // Tab counts
  const stats = useMemo(() => {
    const counts = { all: processedLeaves.length, pending: 0, approved: 0, rejected: 0 };
    processedLeaves.forEach(l => {
      if (l.status === 'pending') counts.pending++;
      else if (l.status === 'approved') counts.approved++;
      else if (l.status === 'rejected') counts.rejected++;
    });
    return counts;
  }, [processedLeaves]);

  // Selection logic
  const toggleSelectAll = () => {
    if (selectedLeaves.length === filteredLeaves.length) setSelectedLeaves([]);
    else setSelectedLeaves(filteredLeaves.map(l => l.id));
  };
  const toggleSelect = (id: string) => {
    setSelectedLeaves(prev => prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]);
  };

  // Get unique leave types for the apply leave form dropdown
  const availableLeaveTypes = useMemo(() => {
    if (!leavesData?.result) return ['Sick Leave', 'Casual Leave', 'Vacation'];
    const types = new Set(leavesData.result.map((leave: LeaveType) => leave.leave_type));
    return Array.from(types).filter(Boolean).length > 0
      ? Array.from(types).filter(Boolean)
      : ['Sick Leave', 'Casual Leave', 'Vacation'];
  }, [leavesData]);


  const handleApprove = async (leaveId: number) => {
    await updateStatusMutation.mutateAsync({ id: leaveId, status: 'APPROVED' });

  };

  const handleReject = async (leaveId: number) => {
    await updateStatusMutation.mutateAsync({ id: leaveId, status: 'REJECTED' });

  };

  const handleBulkApprove = useCallback(async () => {
    const pendingSelected = selectedLeaves.filter(id => {
      const leave = processedLeaves.find(l => l.id === id);
      return leave?.status === 'pending';
    });
    if (pendingSelected.length === 0) {
      messageRef.current.warning('No pending leave requests in the current selection');
      return;
    }
    modalRef.current.confirm({
      title: 'Bulk Approve Leaves',
      content: `Approve ${pendingSelected.length} pending leave request(s)?`,
      okText: 'Approve',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await Promise.all(pendingSelected.map(id => updateLeaveStatus(Number(id), 'APPROVED')));
          queryClient.invalidateQueries({ queryKey: queryKeys.leaves.company() });
          queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });
          messageRef.current.success(`${pendingSelected.length} leave request(s) approved`);
          setSelectedLeaves([]);
        } catch {
          messageRef.current.error('Failed to approve some leave requests');
        }
      },
    });
  }, [selectedLeaves, processedLeaves, queryClient]);

  const handleBulkReject = useCallback(async () => {
    const pendingSelected = selectedLeaves.filter(id => {
      const leave = processedLeaves.find(l => l.id === id);
      return leave?.status === 'pending';
    });
    if (pendingSelected.length === 0) {
      messageRef.current.warning('No pending leave requests in the current selection');
      return;
    }
    modalRef.current.confirm({
      title: 'Bulk Reject Leaves',
      content: `Reject ${pendingSelected.length} pending leave request(s)?`,
      okText: 'Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await Promise.all(pendingSelected.map(id => updateLeaveStatus(Number(id), 'REJECTED')));
          queryClient.invalidateQueries({ queryKey: queryKeys.leaves.company() });
          queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });
          messageRef.current.success(`${pendingSelected.length} leave request(s) rejected`);
          setSelectedLeaves([]);
        } catch {
          messageRef.current.error('Failed to reject some leave requests');
        }
      },
    });
  }, [selectedLeaves, processedLeaves, queryClient]);

  useEffect(() => {
    if (selectedLeaves.length > 0 && canApprove) {
      setExpandedContent(
        <>
          <div className="flex items-center gap-2 border-r border-white/20 pr-6">
            <div className="bg-[#ff3b3b] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {selectedLeaves.length}
            </div>
            <span className="text-sm font-semibold">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip title="Approve Selected" placement="top" styles={{ root: { marginBottom: '8px' } }}>
              <button onClick={handleBulkApprove} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip title="Reject Selected" placement="top" styles={{ root: { marginBottom: '8px' } }}>
              <button onClick={handleBulkReject} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#ff3b3b]">
                <XCircle className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
          <button onClick={() => setSelectedLeaves([])} className="ml-2 text-xs text-[#999999] hover:text-white transition-colors">
            Cancel
          </button>
        </>
      );
    } else {
      setExpandedContent(null);
    }
    return () => { setExpandedContent(null); };
  }, [selectedLeaves, canApprove, handleBulkApprove, handleBulkReject, setExpandedContent]);

  const handleApplyLeave = async (values: ApplyLeaveFormValues) => {
    await applyLeaveMutation.mutateAsync({
      start_date: values.start_date.format('YYYY-MM-DD'),
      end_date: values.end_date.format('YYYY-MM-DD'),
      day_type: values.day_type,
      leave_type: values.leave_type,
      reason: values.reason,
    });
    form.resetFields();
    setIsApplyLeaveModalOpen(false);
  };

  // Filter options
  const leaveTypes = useMemo(() => {
    const types = new Set(processedLeaves.map(l => l.leaveType.charAt(0).toUpperCase() + l.leaveType.slice(1)));
    return ['All', ...Array.from(types)];
  }, [processedLeaves]);

  const employees = useMemo(() => {
    const names = new Set(processedLeaves.map(l => l.employeeName));
    return ['All', ...Array.from(names)];
  }, [processedLeaves]);

  const filterOptions: FilterOption[] = [
    { id: 'leaveType', label: 'Leave Type', options: leaveTypes, placeholder: 'Leave Type', defaultValue: 'All', multiSelect: true },
    { id: 'employee', label: 'Employee', options: employees, placeholder: 'Employee', defaultValue: 'All', multiSelect: true }
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const clearFilters = () => {
    setFilters({ leaveType: 'All', employee: 'All' });
    setSearchQuery('');
  };

  return (
    <PageLayout
      title="Leaves"
      tabs={[
        { id: 'all', label: 'All' },
        { id: 'pending', label: 'Pending', count: stats.pending },
        { id: 'approved', label: 'Approved' },
        { id: 'rejected', label: 'Rejected' },
      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as LeaveTab)}
      searchPlaceholder="Search leave requests..."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      titleAction={{
        onClick: () => setIsApplyLeaveModalOpen(true),
        label: "Apply Leave"
      }}
    >
      <div className="mb-6">
        <FilterBar
          filters={filterOptions}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />
      </div>

      <div className="flex-1 overflow-y-auto relative min-h-[400px]">
        {/* Table Header */}
        <div className="sticky top-0 z-20 bg-white grid grid-cols-[40px_48px_1.5fr_1fr_1.5fr_0.8fr_1fr_120px_40px] gap-4 px-4 py-3 mb-2 items-center">
          <div className="flex justify-center">
            <Checkbox
              checked={filteredLeaves.length > 0 && selectedLeaves.length === filteredLeaves.length}
              onChange={toggleSelectAll}
              className="red-checkbox"
            />
          </div>
          <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide"></p>
          <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">Employee</p>
          <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide text-center">Type</p>
          <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide">Duration</p>
          <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide text-center">Days</p>
          <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide text-center">Status</p>
          <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide text-right pr-4">Actions</p>
          <p className="text-[0.6875rem] font-bold text-[#999999] uppercase tracking-wide text-right"></p>
        </div>

        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="group bg-white border border-[#EEEEEE] rounded-[16px] px-4 py-3 flex items-center">
                <div className="grid grid-cols-[40px_48px_1.5fr_1fr_1.5fr_0.8fr_1fr_120px_40px] gap-4 items-center w-full">
                  <div className="flex justify-center"><Skeleton className="h-5 w-5 rounded" /></div>
                  <div className="flex justify-center"><Skeleton className="w-10 h-10 rounded-full" /></div>
                  <div className="flex flex-col space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-20" />
                  </div>
                  <div className="flex justify-center"><Skeleton className="h-5 w-20 rounded-full" /></div>
                  <div className="flex flex-col space-y-1"><Skeleton className="h-4 w-40" /></div>
                  <div className="flex justify-center"><Skeleton className="h-4 w-12" /></div>
                  <div className="flex justify-center"><Skeleton className="h-6 w-20 rounded-full" /></div>
                  <div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></div>
                  <div className="flex justify-end"><Skeleton className="h-8 w-8 rounded-full" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-[#666666]">
            Unable to load leave requests. Please try again later.
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[#666666]">
            No leave requests found.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLeaves.map((leave) => (
              <LeaveRow
                key={leave.id}
                leave={leave}
                selected={selectedLeaves.includes(leave.id)}
                onSelect={() => toggleSelect(leave.id)}
                onApprove={handleApprove}
                onReject={handleReject}
                isActionLoading={updateStatusMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal
        title="Apply Leave"
        open={isApplyLeaveModalOpen}
        onCancel={() => { form.resetFields(); setIsApplyLeaveModalOpen(false); }}
        footer={null}
        width="min(600px, 95vw)"
        centered
        className="rounded-[16px] overflow-hidden"
        destroyOnHidden={true}
      >
        <Form form={form} layout="vertical" onFinish={handleApplyLeave} className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="start_date"
              label={<span className="text-sm font-medium text-[#666666]">Start Date</span>}
              rules={[{ required: true, message: 'Please select start date' }]}
            >
              <DatePicker className="w-full h-10 rounded-lg" format="YYYY-MM-DD" disabledDate={(current) => current && current < dayjs().startOf('day')} />
            </Form.Item>
            <Form.Item
              name="end_date"
              label={<span className="text-sm font-medium text-[#666666]">End Date</span>}
              rules={[{ required: true, message: 'Please select end date' }]}
            >
              <DatePicker className="w-full h-10 rounded-lg" format="YYYY-MM-DD" disabledDate={(current) => current && current < dayjs().startOf('day')} />
            </Form.Item>
          </div>
          <Form.Item
            name="day_type"
            label={<span className="text-sm font-medium text-[#666666]">Day Type</span>}
            rules={[{ required: true, message: 'Please select day type' }]}
          >
            <Select className="w-full h-10 rounded-lg" placeholder="Select day type">
              {['Full Day', 'First Half', 'Second Half'].map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item
            name="leave_type"
            label={<span className="text-sm font-medium text-[#666666]">Leave Type</span>}
            rules={[{ required: true, message: 'Please select leave type' }]}
          >
            <Select className="w-full h-10 rounded-lg" placeholder="Select leave type">
              {availableLeaveTypes.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label={<span className="text-sm font-medium text-[#666666]">Reason</span>}
            rules={[{ required: true, message: 'Please enter reason' }]}
          >
            <TextArea rows={4} className="rounded-lg" placeholder="Type or select a reason" />
          </Form.Item>
          <div className="flex items-center justify-end gap-4 pt-4 mt-6 border-t border-[#EEEEEE]">
            <Button onClick={() => { form.resetFields(); setIsApplyLeaveModalOpen(false); }} className="h-[44px] px-4 rounded-lg">Cancel</Button>
            <Button type="primary" htmlType="submit" loading={applyLeaveMutation.isPending} className="h-[44px] px-8 rounded-lg bg-[#111111] border-none">Save</Button>
          </div>
        </Form>
      </Modal>
    </PageLayout>
  );
}

interface ApplyLeaveFormValues {
  start_date: Dayjs;
  end_date: Dayjs;
  day_type: string;
  leave_type: string;
  reason: string;
}
