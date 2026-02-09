'use client';

import { useEffect, ReactNode, useMemo } from 'react';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Topbar';
import { ProfileCompletionBanner } from '../components/common/ProfileCompletionBanner';
import { useUserDetails } from '@/hooks/useUser';
import { getRoleFromUser, UserRole } from '@/utils/roleUtils';
import { TimerProvider } from '../context/TimerContext';
// FloatingProductivityWidget removed - using FloatingTimerBar as the sole floating timer
import { usePathname } from 'next/navigation';
import { navPermissionMap } from '@/utils/navUtils';
import { Shield24Regular } from '@fluentui/react-icons';
import { Button, Drawer } from 'antd';
import Link from 'next/link';
import { InvitationPopup } from '../components/common/InvitationPopup';
import { FloatingMenuProvider } from '../context/FloatingMenuContext';
import { FloatingTimerBar } from '../components/common/FloatingTimerBar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';

interface AlsonotifyLayoutWrapperProps {
  children: ReactNode;
}

export function AlsonotifyLayoutWrapper({ children }: Readonly<AlsonotifyLayoutWrapperProps>) {
  return (
    <SidebarProvider>
      <FloatingMenuProvider>
        <AlsonotifyLayoutContent>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </AlsonotifyLayoutContent>
      </FloatingMenuProvider>
    </SidebarProvider>
  );
}

function AlsonotifyLayoutContent({ children }: Readonly<AlsonotifyLayoutWrapperProps>) {
  const { isCollapsed, mobileOpen, closeMobileSidebar } = useSidebar();
  const { data: userDetailsData } = useUserDetails();
  // Derive role and color using shared utility.
  // Role/badge are derived from userDetailsData only. If flicker is observed on first load, add a client-only mounted guard.
  const { userRole, userRoleColor } = useMemo<{ userRole: UserRole; userRoleColor: string | undefined }>(() => {
    // useUserDetails now maps to a flattened Employee object, so use result directly.
    const user = userDetailsData?.result;

    return {
      userRole: getRoleFromUser(user),
      userRoleColor: user?.roleColor
    };
  }, [userDetailsData]);

  // Extract permissions
  const permissions = useMemo(() => userDetailsData?.result?.permissions || {}, [userDetailsData]);

  const pathname = usePathname();

  // Close mobile sidebar when route changes (e.g. after clicking a nav link)
  useEffect(() => {
    if (mobileOpen) {
      closeMobileSidebar();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps -- only close on route change

  // URL Access Protection Logic
  const accessState = useMemo(() => {
    // Admin always has access
    if (userRole === 'Admin') return { authorized: true };

    // Find if the current path matches any protected resource in navPermissionMap
    const currentPath = pathname || '';
    const protectedResource = Object.entries(navPermissionMap).find(([id]) => {
      // Check for exact match or child route match (e.g. /dashboard/tasks/1 matches /dashboard/tasks)
      const pathToCheck = `/dashboard/${id}`;
      return currentPath === pathToCheck || currentPath.startsWith(`${pathToCheck}/`);
    });

    if (protectedResource) {
      const [id, permissionKey] = protectedResource;
      const hasPermission = permissions?.Navigation?.[permissionKey];

      // If the permission is explicitly false, block access
      if (hasPermission === false) {
        return { authorized: false, resource: id.charAt(0).toUpperCase() + id.slice(1) };
      }
    }

    return { authorized: true };
  }, [pathname, permissions, userRole]);

  const renderContent = () => {
    if (!accessState.authorized) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[24px] shadow-sm p-8 text-center animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-[#FFF5F5] rounded-full flex items-center justify-center mb-6">
            <Shield24Regular className="w-10 h-10 text-[#FF3B3B]" />
          </div>
          <h2 className="text-[24px] font-['Manrope:Bold',sans-serif] text-[#111111] mb-2">
            Access Restricted
          </h2>
          <p className="text-[15px] text-[#666666] font-['Manrope:Medium',sans-serif] max-w-md mb-8">
            You don't have the necessary permissions to access the <span className="font-['Manrope:Bold',sans-serif] text-[#111111]">{accessState.resource}</span> module. Please contact your administrator if you believe this is an error.
          </p>
          <Link href="/dashboard">
            <Button
              type="primary"
              className="bg-[#111111] hover:bg-black text-white font-['Manrope:SemiBold',sans-serif] h-11 px-8 rounded-full transition-all active:scale-95"
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>
      );
    }

    return children;
  };



  return (
    <TimerProvider>
      <div
        className="w-full h-[100dvh] bg-[#F7F7F7] p-2 sm:p-5 flex overflow-hidden outline-none"
        tabIndex={-1}
      >
        {/* Main Layout - Visible on all screens */}
        <div className="flex gap-0 sm:gap-5 w-full h-full overflow-hidden relative">
          {/* Left Sidebar - Hidden on mobile, visible on lg+ */}
          <div
            className={`hidden lg:block shrink-0 h-full overflow-y-auto transition-all duration-300 ${isCollapsed ? 'w-[80px]' : 'w-[240px]'}`}
          >
            <Sidebar userRole={userRole} permissions={permissions} collapsed={isCollapsed} />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 flex flex-col gap-[10px] h-full overflow-hidden bg-transparent">
            {/* Header/Taskbar - Fixed Height; safe-area insets prevent clipping on notched devices */}
            <div
              className="shrink-0 px-4 sm:px-0 pt-3 sm:pt-0"
              style={{
                paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
                paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
              }}
            >
              <Header userRole={userRole} roleColor={userRoleColor} />
            </div>

            {/* Profile Completion Banner - Add margin for mobile */}
            <div className="px-4 sm:px-0">
              <ProfileCompletionBanner />
            </div>

            {/* Page Content - horizontal padding on mobile to match header and prevent card clipping */}
            <div className="flex-1 overflow-hidden relative flex flex-col px-4 sm:px-0">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
      {/* FloatingProductivityWidget removed - FloatingTimerBar handles all timer functionality */}
      {!pathname?.startsWith('/dashboard/mail') && <FloatingTimerBar />}
      <InvitationPopup />

      {/* Mobile sidebar drawer - same content as desktop sidebar; collapse button closes drawer */}
      <Drawer
        open={mobileOpen}
        onClose={closeMobileSidebar}
        placement="left"
        closable={false}
        className="lg:hidden"
        styles={{ body: { padding: 0, height: '100%' }, wrapper: { width: 220 } }}
        rootStyle={{ zIndex: 1100 }}
      >
        <div className="h-full overflow-y-auto">
          <Sidebar userRole={userRole} permissions={permissions} onCloseDrawer={closeMobileSidebar} />
        </div>
      </Drawer>
    </TimerProvider>
  );
}
