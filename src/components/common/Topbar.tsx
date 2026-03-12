'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AccessBadge } from '../ui/AccessBadge';
import { Button, Dropdown, Modal, Avatar, App } from 'antd';
import type { MenuProps } from 'antd';
import {
  Alert24Filled,
  Add24Filled,
  Sparkle24Filled
} from '@fluentui/react-icons';
import {
  UserCog,
  Settings,
  LogOut,
  MessageCircle,
  MessageSquareShare,
  ScrollText,
  Briefcase,
  ListTodo,
  CalendarDays,
  CalendarOff,
  NotebookPen
} from 'lucide-react';
import { TaskForm } from '../modals/TaskForm';
import { RequirementsForm, RequirementFormData } from '../modals/RequirementsForm';
import { WorkspaceForm } from '../modals/WorkspaceForm';
import { NotificationPanel } from './NotificationPanel';
import { Skeleton } from '../ui/Skeleton';
import { FeedbackWidget } from './FeedbackWidget';
import { useUserDetails, useCurrentUserCompany } from '@/hooks/useUser';
import { isSuperAdmin } from '@/utils/roleUtils';
import { useAccountType } from '@/utils/accountTypeUtils';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '../../hooks/useNotification';
import { useWorkspaces, useCreateRequirement } from '../../hooks/useWorkspace';
import { useCreateTask } from '@/hooks/useTask';
import { useCreateNote } from '@/hooks/useNotes';
import { useLogout } from '@/hooks/useAuth';
import { formatDateForApi, getTodayForApi } from '@/utils/date';
import { searchEmployees } from '@/services/user';
import { getRequirementsByWorkspaceId } from '@/services/workspace';
import { RequirementDropdownItem, CreateRequirementRequestDto } from '@/types/dto/requirement.dto';
import { NoteComposerModal } from './NoteComposerModal';
// import { AIAssistantDrawer } from '../features/ai/AIAssistantDrawer';
import { MeetingCreateModal } from '../modals/MeetingCreateModal';
import { LeaveApplyModal } from '../modals/LeaveApplyModal';
import { Employee } from '@/types/domain';

import { CreateTaskRequestDto } from '@/types/dto/task.dto';
import { useSidebar } from '@/context/SidebarContext';
import { useIsNarrow } from '@/hooks/useBreakpoint';

type UserRole = import('@/utils/roleUtils').UserRole;

interface HeaderProps {
  userRole?: UserRole;
  roleColor?: string;
  setUserRole?: (role: UserRole) => void;
}

// Helper function to get greeting based on local time
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

export function Header({ userRole = 'Admin', roleColor }: HeaderProps) {
  const router = useRouter();
  const handleLogout = useLogout();
  const { message } = App.useApp();
  const { isIndividual } = useAccountType();
  const isNarrow = useIsNarrow('lg');
  const { openMobileSidebar } = useSidebar();

  // Fetch user details
  const { data: userDetailsData, isLoading: isLoadingUserDetails } = useUserDetails();
  const { data: companyData } = useCurrentUserCompany();

  const availableLeaveTypes = useMemo(() => {
    if (companyData?.result?.leaves && companyData.result.leaves.length > 0) {
      return companyData.result.leaves.map((l: { name: string }) => l.name);
    }
    return ['Sick Leave', 'Casual Leave', 'Vacation'];
  }, [companyData]);

  // Fetch notifications
  const { data: notificationsData } = useNotifications();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const markReadMutation = useMarkNotificationRead();

  // Fetch data for dialogs
  const { data: workspacesData } = useWorkspaces('limit=1000');

  const [usersDropdown, setUsersDropdown] = useState<Array<{ id: number; name: string }>>([]);
  const [requirementsDropdown, setRequirementsDropdown] = useState<RequirementDropdownItem[]>([]);

  // Dialogs state
  // Mutations
  const createTaskMutation = useCreateTask();
  const createRequirementMutation = useCreateRequirement();
  const createNoteMutation = useCreateNote();

  // Dialogs state
  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showRequirementDialog, setShowRequirementDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  // const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // Form States


  const [greeting] = useState(() => getGreeting());


  // Removed localUser state and localStorage sync to prevent PII exposure
  // We now rely entirely on React Query state which is hydrated from the API

  const user = useMemo(() => {
    // Return API data directly
    const apiUser = userDetailsData?.result || {} as Employee;
    return apiUser;
  }, [userDetailsData]);

  // Extract first name from user data
  const firstName = useMemo(() => {
    const user_profile = user?.user_profile;
    if (user_profile?.first_name) {
      return user_profile.first_name;
    }
    // Employee interface doesn't have first_name directly, use name fallback
    if (user?.name) {
      return user.name.split(' ')[0] || user.name;
    }
    return user?.email?.split('@')[0] || 'User';
  }, [user]);

  // Determine role for UI - prefer prop if passed from authoritative Layout
  const mappedRole = userRole;

  // Fetch users and requirements for dropdowns
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await searchEmployees();
        if (response.success) {
          const transformed = (response.result || []).map((item: any) => ({
            id: item.value || item.id,
            name: item.label || item.name,
          }));

          setUsersDropdown(transformed);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []); // Only fetch on mount

  useEffect(() => {
    const fetchRequirements = async () => {
      if (!workspacesData?.result?.workspaces?.length) return;

      try {
        const allRequirements: RequirementDropdownItem[] = [];

        for (const workspace of workspacesData.result.workspaces) {
          try {
            const workspaceId = Number(workspace.id);
            if (isNaN(workspaceId)) continue;

            const response = await getRequirementsByWorkspaceId(workspaceId);
            if (response.success && response.result) {
              const mapped: RequirementDropdownItem[] = response.result.map((r: any) => ({
                id: r.id,
                name: r.name || r.title || '',
                type: r.type || 'inhouse',
                status: r.status || 'Assigned',
                workspace_id: r.workspace_id,
                receiver_workspace_id: r.receiver_workspace_id ?? null,
                receiver_company_id: r.receiver_company_id ?? null
              }));
              allRequirements.push(...mapped);
            }
          } catch {
            // Failed to fetch requirements for workspace - continue with others
          }
        }

        // Filter: Only include active requirements
        // The getRequirementsByWorkspaceId returns ALL requirements, so we filter by status
        const activeStatuses = ['Assigned', 'In_Progress', 'Review', 'Revision', 'On_Hold'];
        const filteredRequirements = allRequirements.filter(req => {
          return activeStatuses.includes(req.status);
        });


        setRequirementsDropdown(filteredRequirements);
      } catch (error) {
        console.error('Failed to fetch requirements:', error);
      }
    };
    fetchRequirements();
  }, [workspacesData]); // Only refetch when workspaces change

  // Handle Calendar Success

  const unreadCount = useMemo(
    () => notificationsData?.result?.filter((n) => !n.is_read).length ?? 0,
    [notificationsData]
  );

  const handleMarkAsRead = (id: number) => {
    markReadMutation.mutate(id);
  };

  const handleClearAllNotifications = () => {
    markAllReadMutation.mutate();
  };



  // Handle requirement creation
  const handleCreateRequirement = async (data: RequirementFormData | any) => {
    if (!data.title) {
      message.error("Requirement title is required");
      return;
    }

    if (!data.workspace && !data.workspace_id) {
      message.error("Please select a workspace");
      return;
    }

    const requirementPayload: CreateRequirementRequestDto = {
      workspace_id: Number(data.workspace || data.workspace_id),
      project_id: Number(data.workspace || data.workspace_id), // Backward compatibility
      name: data.title as string,
      description: (data.description || '') as string,
      start_date: getTodayForApi(),
      end_date: data.dueDate ? formatDateForApi(data.dueDate) : undefined,
      status: 'Assigned',
      is_high_priority: data.priority === 'HIGH' || Boolean(data.is_high_priority) || false,
      type: data.type as string | undefined,
      contact_person: data.contactPerson as string | undefined,
      contact_person_id: data.contact_person_id as number | undefined,
      receiver_company_id: data.receiver_company_id as number | undefined,
      budget: Number(data.budget) || 0,
    };

    createRequirementMutation.mutate(
      requirementPayload,
      {
        onSuccess: () => {
          message.success("Requirement created successfully!");
          setShowRequirementDialog(false);
          // Reset form handled by component unmount/remount usually, but here we might need to reset state if we kept it
        },
        onError: (error: unknown) => {
          const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create requirement";
          message.error(errorMessage);
        },
      }
    );
  };

  // Handle Note Creation
  const handleCreateNote = async (noteData: any) => {
    try {
      await createNoteMutation.mutateAsync(noteData);
      message.success("Note created successfully");
      setShowNoteDialog(false);
    } catch (error) {
      // Error handling is managed by the mutation or global handler usually, but here distinct
      message.error("Failed to create note");
    }
  };

  // Dropdown Items Configuration - Filtered based on role
  const addMenuItems = useMemo<MenuProps['items']>(() => {
    const isEmployee = mappedRole === 'Employee';

    const children = [
      // Only show Requirement and Workspace if NOT an employee
      ...(!isEmployee ? [
        {
          key: 'req',
          label: 'Requirement',
          icon: <ScrollText className="w-4 h-4" />,
          onClick: () => setShowRequirementDialog(true),
          className: "font-medium"
        },
        {
          key: 'workspace',
          label: 'Workspace',
          icon: <Briefcase className="w-4 h-4" />,
          onClick: () => setShowWorkspaceDialog(true),
          className: "font-medium"
        },
      ] : []),
      {
        key: 'task',
        label: 'Task',
        icon: <ListTodo className="w-4 h-4" />,
        onClick: () => setShowTaskDialog(true),
        className: "font-medium"
      },
      {
        key: 'calendar',
        label: 'Schedule Meeting',
        icon: <CalendarDays className="w-4 h-4" />,
        onClick: () => setShowMeetingDialog(true),
        className: "font-medium"
      },
      {
        key: 'leave',
        label: 'Apply Leave',
        icon: <CalendarOff className="w-4 h-4" />,
        onClick: () => setShowLeaveDialog(true),
        className: "font-medium"
      },
      {
        key: 'notes',
        label: 'Add Note',
        icon: <NotebookPen className="w-4 h-4" />,
        onClick: () => setShowNoteDialog(true),
        className: "font-medium"
      },
    ];

    return [
      {
        key: 'create-new',
        type: 'group',
        label: <span className="text-[0.6875rem] text-[#999999] uppercase tracking-wider font-medium">Create New</span>,
        children
      }
    ];
  }, [mappedRole]);

  // Account type is now handled by useAccountType hook above


  const isDeveloper = useMemo(() => {
    const userData = userDetailsData?.result || {};
    return isSuperAdmin(userData);
  }, [userDetailsData]);

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'account',
      type: 'group',
      label: (
        <span className="text-[#111111] font-bold font-bold text-sm">
          {isIndividual ? 'Personal Account' : 'Organization Account'}
        </span>
      ),
      children: [
        {
          key: 'settings',
          label: isIndividual ? 'Settings' : 'Company Settings',
          icon: <Settings className="w-4 h-4" />,
          onClick: () => router.push(isIndividual ? '/dashboard/profile' : '/dashboard/settings'),
        },
        {
          key: 'profile',
          label: 'Profile',
          icon: <UserCog className="w-4 h-4" />,
          onClick: () => router.push('/dashboard/profile'),
        },
        ...(isDeveloper ? [
          {
            key: 'feedbacks',
            label: 'Feedbacks',
            icon: <MessageCircle className="w-4 h-4" />,
            onClick: () => router.push('/dashboard/feedback'),
          }
        ] : []),
      ],
    },
    { type: 'divider', key: 'profile-divider' },
    {
      key: 'logout',
      label: <span className="text-[#ff3b3b]">Log out</span>,
      icon: <LogOut className="w-4 h-4 text-[#ff3b3b]" />,
      onClick: handleLogout,
    },
  ];


  return (
    <>
      <div className="bg-white rounded-full px-4 py-2 w-full">
        <div className="flex flex-row items-center justify-between w-full">
          {/* Left: Mobile menu button (below lg) + Greeting text */}
          <div className="flex flex-col font-normal font-normal justify-center not-italic text-[#111111] text-nowrap">
            <div className="flex items-center gap-3">
              {isNarrow && (
                <button
                  type="button"
                  onClick={openMobileSidebar}
                  className="w-10 h-10 min-w-[40px] rounded-full bg-[#F7F7F7] hover:bg-[#EEEEEE] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Open menu"
                  aria-label="Open menu"
                >
                  <img src="/favicon.png" alt="Menu" className="w-5 h-5" />
                </button>
              )}
              {isLoadingUserDetails ? (
                <>
                  <Skeleton className="h-7 w-48 rounded-lg hidden md:block" />
                  <Skeleton className="h-5 w-16 rounded-full hidden md:block" />
                </>
              ) : (
                <>
                  <p className="leading-[normal] text-xl whitespace-pre hidden md:block">
                    <span className="font-normal">{`👋 ${greeting}! `}</span>
                    <span className="font-semibold">{firstName}</span>
                  </p>
                  <div className="hidden md:block">
                    <AccessBadge role={mappedRole || userRole} color={roleColor} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: CTAs, icons & profile section */}
          <div className="flex flex-row gap-2 md:gap-6 items-center">
            {/* Add Button with Dropdown */}
            <Dropdown menu={{ items: addMenuItems }} placement="bottomRight" trigger={['click']}>
              <Button
                className="!w-9 !h-9 !min-w-[36px] rounded-full !bg-[#ff3b3b] hover:!bg-[#ff6b6b] !flex !items-center !justify-center !p-0 !border-none !shadow-none"
                type="primary"
                shape="circle"
              >
                <Add24Filled className="w-5 h-5 text-white" />
              </Button>
            </Dropdown>

            {/* AI Assistant Toggle */}
            {/* <button
              onClick={() => setAiDrawerOpen(true)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#cc2f2f] hover:shadow-lg flex items-center justify-center transition-all cursor-pointer border border-transparent hover:scale-105 active:scale-95"
              title="AI Assistant"
            >
              <Sparkle24Filled className="w-5 h-5 text-white" />
            </button> */}

            {/* Feedback Toggle */}
            <button
              onClick={() => setShowFeedbackDialog(true)}
              className="hidden md:flex w-9 h-9 min-w-[36px] rounded-full bg-[#ff3b3b] hover:bg-[#ff6b6b] items-center justify-center transition-all cursor-pointer border-none shadow-none"
              title="Give Feedback"
            >
              <MessageSquareShare className="w-5 h-5 text-white" />
            </button>

            {/* Notification icon */}
            <>
              <button
                onClick={() => setNotificationDrawerOpen(true)}
                className="relative w-9 h-9 rounded-full bg-[#F7F7F7] hover:bg-[#EEEEEE] flex items-center justify-center transition-colors cursor-pointer"
                title="Notifications"
              >
                <Alert24Filled className="w-5 h-5 text-[#111111]" />
                {/* Notification Badge */}
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#ff3b3b] rounded-full border-[1.5px] border-white flex items-center justify-center translate-x-1 -translate-y-1">
                    <span className="text-[0.5rem] font-bold text-white leading-none">{unreadCount}</span>
                  </span>
                )}
              </button>
              <NotificationPanel
                open={notificationDrawerOpen}
                onClose={() => setNotificationDrawerOpen(false)}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllRead={handleClearAllNotifications}
              />
            </>

            {/* Profile photo & Role Switcher */}
            <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight" trigger={['click']}>
              <div className="relative shrink-0 size-[32px] rounded-full ring-2 ring-transparent hover:ring-[#ff3b3b]/20 transition-all cursor-pointer">
                {isLoadingUserDetails ? (
                  <Skeleton className="w-[32px] h-[32px] rounded-full" />
                ) : (
                  <Avatar
                    size={32}
                    src={user?.profile_pic || undefined}
                    alt={user?.name || 'User'}
                    style={{ backgroundColor: '#E5E5E5', color: '#666666' }}
                  >
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                )}
              </div>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Workspace Modal */}
      <WorkspaceForm
        open={showWorkspaceDialog}
        onCancel={() => setShowWorkspaceDialog(false)}
        onSuccess={() => setShowWorkspaceDialog(false)}
      />

      {/* Task Modal */}
      <Modal
        open={showTaskDialog}
        onCancel={() => setShowTaskDialog(false)}
        footer={null}
        width="min(600px, 95vw)"
        centered
        destroyOnHidden={true} // Ensure form resets on close (replaced deprecated destroyOnClose)
        className="rounded-[16px] overflow-hidden"
        styles={{
          body: {
            padding: 0,
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <TaskForm
          onSubmit={(data: CreateTaskRequestDto) => {
            if (!data.start_date) {
              message.error("Start Date is required");
              return;
            }
            // data is already CreateTaskRequestDto, so no need to map 'title' -> 'name' if TaskForm outputs 'name'
            // TaskForm constructs backendData with 'name', so 'data.name' is correct.
            const formattedData: CreateTaskRequestDto = {
              ...data,
              start_date: data.start_date, // redundant but safe
            };
            return createTaskMutation.mutateAsync(formattedData, {
              onSuccess: () => {
                setShowTaskDialog(false);
                message.success("Task created successfully");
                // Redirect to tasks page to show the new task
                router.push('/dashboard/tasks?tab=all');
              },
              onError: (error: unknown) => {
                const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as { message?: string })?.message || "Failed to create task";
                message.error(errorMessage);
              }
            });
          }}
          onCancel={() => setShowTaskDialog(false)}
          users={usersDropdown}
          requirements={(() => {
            // requirementsDropdown is already filtered by status in useEffect

            return requirementsDropdown;
          })()}
          workspaces={workspacesData?.result?.workspaces?.map((p) => ({
            id: p.id,
            name: p.name,
            company_name: p.company_name || p.client?.name || undefined,
            partner_name: p.partner_name,
            in_house: p.in_house
          })) || []}
        />
      </Modal>

      <RequirementsForm
        open={showRequirementDialog}
        onSubmit={handleCreateRequirement}
        onCancel={() => setShowRequirementDialog(false)}
        workspaces={workspacesData?.result?.workspaces?.map((w) => ({
          id: w.id,
          name: w.name,
          company_name: w.company_name || w.client?.name || undefined,
          partner_name: w.partner_name,
          in_house: w.in_house
        })) || []}
        isLoading={createRequirementMutation.isPending}
      />

      {/* Note Composer Modal */}
      <NoteComposerModal
        open={showNoteDialog}
        onClose={() => setShowNoteDialog(false)}
        onSave={handleCreateNote}
      />

      {/* Feedback Modal */}
      <FeedbackWidget
        open={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
      />

      {/* Meeting Modal */}
      <MeetingCreateModal
        open={showMeetingDialog}
        onCancel={() => setShowMeetingDialog(false)}
        companyTimeZone={userDetailsData?.result?.timezone || 'UTC'}
      />

      {/* Leave Modal */}
      <LeaveApplyModal
        open={showLeaveDialog}
        onCancel={() => setShowLeaveDialog(false)}
        availableLeaveTypes={availableLeaveTypes}
      />

      {/* <AIAssistantDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
      /> */}
      <style jsx global>{`
        /* Gray background for all Select dropdowns (default) */
        .employee-form-select .ant-select-selector {
          background-color: #F9FAFB !important;
          border-color: #EEEEEE !important;
        }
        .employee-form-select .ant-select-selector:hover {
          border-color: #EEEEEE !important;
        }
        .employee-form-select.ant-select-focused .ant-select-selector {
          border-color: #EEEEEE !important;
          box-shadow: none !important;
        }
        
        /* White background for filled Select dropdowns */
        .employee-form-select-filled .ant-select-selector {
          background-color: white !important;
        }
        
        /* Remove extra borders on Input focus */
        .ant-input:focus {
          border-color: #EEEEEE !important;
          box-shadow: none !important;
        }

        /* Notification popover - remove default AntD background/shadow */
        .notification-popover .ant-popover-inner {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .notification-popover .ant-popover-content {
          padding: 0 !important;
        }
      `}</style>
    </>
  );
}