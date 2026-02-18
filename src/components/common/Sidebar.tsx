'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BrandLogo from '@/assets/images/logo.png';
import {
  LayoutDashboard,
  Users,
  Handshake,
  Briefcase,
  ScrollText,
  ListTodo,
  BarChart3,
  CalendarDays,
  CalendarOff,
  CircleDollarSign,
  NotebookPen,
  ChevronsLeft,
  ChevronsRight,
  Mail
} from 'lucide-react';
import React from "react";


interface SidebarProps {
  userRole: UserRole;
  permissions?: { Navigation?: Record<string, boolean> };
  collapsed?: boolean;
  /** When provided (e.g. in mobile drawer), the collapse button closes the drawer instead of toggling collapse. */
  onCloseDrawer?: () => void;
}

type NavItemConfig = {
  id: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
};

import { navPermissionMap } from '@/utils/navUtils';
import { UserRole } from '@/utils/roleUtils';

// Define navItems outside component to avoid recreation
const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR', 'Employee', 'Coordinator']
  },
  {
    id: 'employees',
    path: '/dashboard/employees',
    label: 'Employees',
    icon: <Users size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR'] // Employee & Coordinator excluded
  },
  {
    id: 'partners',
    path: '/dashboard/partners',
    label: 'Partners',
    icon: <Handshake size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'Coordinator']
  },
  {
    id: 'workspace',
    path: '/dashboard/workspace',
    label: 'Workspace',
    icon: <Briefcase size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR', 'Coordinator', 'Employee']
  },
  {
    id: 'requirements',
    path: '/dashboard/requirements',
    label: 'Requirements',
    icon: <ScrollText size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR', 'Employee', 'Coordinator']
  },
  {
    id: 'tasks',
    path: '/dashboard/tasks',
    label: 'Tasks',
    icon: <ListTodo size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR', 'Employee', 'Coordinator']
  },
  {
    id: 'reports',
    path: '/dashboard/reports',
    label: 'Reports',
    icon: <BarChart3 size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR', 'Coordinator']
  },

  {
    id: 'calendar',
    path: '/dashboard/calendar',
    label: 'Calendar',
    icon: <CalendarDays size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR', 'Employee', 'Coordinator']
  },
  {
    id: 'leaves',
    path: '/dashboard/leaves',
    label: 'Leaves',
    icon: <CalendarOff size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR', 'Employee', 'Coordinator']
  },
  {
    id: 'finance',
    path: '/dashboard/finance',
    label: 'Finance',
    icon: <CircleDollarSign size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance']
  },
  {
    id: 'mail',
    path: '/dashboard/mail',
    label: 'Mail',
    icon: <Mail size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR', 'Employee', 'Coordinator']
  },
  {
    id: 'notes',
    path: '/dashboard/notes',
    label: 'Notes',
    icon: <NotebookPen size={20} />,
    allowedRoles: ['Admin', 'Manager', 'Head', 'Finance', 'HR', 'Employee', 'Coordinator']
  },
];

import { useSidebar } from '@/context/SidebarContext';
import { useAccountType } from '@/utils/accountTypeUtils';

// ... existing imports ...

export const Sidebar = React.memo(function Sidebar({ userRole, permissions, collapsed: collapsedProp, onCloseDrawer }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed: contextCollapsed, toggleSidebar } = useSidebar();
  const isInDrawer = typeof onCloseDrawer === 'function';
  const isCollapsed = isInDrawer ? false : (collapsedProp ?? contextCollapsed);
  const { isIndividual } = useAccountType();

  const handleToggleOrClose = () => {
    if (isInDrawer) {
      onCloseDrawer?.();
    } else {
      toggleSidebar();
    }
  };

  const filteredNavItems = React.useMemo(() => NAV_ITEMS.filter(item => {
    // Filter out items for individual accounts
    // Hide Employees and Reports management
    if (isIndividual && ['employees', 'reports'].includes(item.id)) {
      return false;
    }

    const permissionKey = navPermissionMap[item.id];
    const hasPermission = permissions?.Navigation?.[permissionKey];

    // Force ALLOW Workspace for Employees (overriding DB permission if set to false)
    if (item.id === 'workspace' && userRole === 'Employee') {
      return true;
    }

    // If granular permission is explicitly defined, respect it
    if (hasPermission !== undefined) {
      // Force hide Workspace for Employees even if enabled in DB - REMOVED per request
      /* if (item.id === 'workspace' && userRole === 'Employee') {
        return false;
      } */
      return hasPermission;
    }

    // Otherwise fallback to role-based access
    return item.allowedRoles.includes(userRole);
  }), [permissions, userRole, isIndividual]);

  const isActive = React.useCallback((path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    // Special handling for Requirements inside Workspace context
    if (path === '/dashboard/requirements' && pathname.includes('/requirements/')) {
      return true;
    }
    if (path === '/dashboard/workspace' && pathname.includes('/requirements/')) {
      return false;
    }

    // For nested routes, check if pathname starts with the path
    return pathname.startsWith(path);
  }, [pathname]);

  return (
    <div
      className={`bg-white rounded-[24px] ${isCollapsed ? 'px-2' : 'px-6'} py-6 w-full flex flex-col transition-all duration-300 relative group/sidebar`}
      style={isInDrawer ? { height: '100%' } : { height: 'calc(100dvh - 40px)' }}
    >
      {/* Toggle Button - collapse on desktop; close drawer when in drawer */}
      <button
        onClick={handleToggleOrClose}
        className={`
            absolute top-6 
            ${isCollapsed ? 'left-1/2 -translate-x-1/2 mt-10' : 'right-4'} 
            w-8 h-8 flex items-center justify-center 
            text-[#999999] hover:text-[#111111] hover:bg-[#F7F7F7] 
            rounded-full transition-all z-10
            ${isInDrawer ? 'opacity-100' : !isCollapsed ? 'opacity-0 group-hover/sidebar:opacity-100' : ''}
          `}
        title={isInDrawer ? "Close menu" : isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
      </button>

      {/* Logo */}
      <div className={`flex items-center justify-center mb-6 h-8 overflow-hidden transition-all duration-300`}>
        {isCollapsed ? (
          <img
            src="/favicon.png"
            alt="Alsonotify"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            onError={(e) => {
              // Fallback if favicon doesn't load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <Image
            src={BrandLogo}
            alt="Alsonotify"
            width={120}
            height={29}
            className="h-[29px] w-auto object-contain"
            priority
          />
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[#EEEEEE] mb-6" />

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto scrollbar-hide items-center w-full">
        {filteredNavItems.map((item) => (
          <NavItem
            key={item.id}
            href={item.path}
            icon={item.icon}
            label={item.label}
            active={isActive(item.path)}
            collapsed={isCollapsed}
          />
        ))}
      </nav>


      {/* Premium Card at bottom - Hide when collapsed */}
      {!isCollapsed && (
        <div className="mt-6">
          <PremiumCard />
        </div>
      )}
    </div>
  );
});

const NavItem = React.memo(function NavItem({ href, icon, label, active = false, collapsed = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean; collapsed?: boolean }) {
  const iconColor = active ? '#ff3b3b' : '#434343';
  const iconWithColor = React.isValidElement(icon)
    ? React.cloneElement(icon as React.ReactElement<{ color: string; fill: string }>, {
      color: iconColor,
      fill: 'none'
    })
    : icon;

  return (
    <Link
      href={href}
      className={`  
        relative h-[32px] rounded-full transition-all group shrink-0
        flex items-center 
        ${collapsed ? 'justify-center w-[32px] px-0' : 'w-full gap-4 px-6'}
        ${active
          ? 'bg-[#FEF3F2] '
          : 'bg-white hover:bg-[#F7F7F7] '
        }
        cursor-pointer outline-none
        no-underline
      `}
      title={collapsed ? label : undefined}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {iconWithColor}
      </div>

      {/* Label */}
      {!collapsed && (
        <span className={`
            font-semibold text-sm leading-normal whitespace-nowrap
            ${active ? 'text-[#ff3b3b]' : 'text-[#434343]'}
        `}>
          {label}
        </span>
      )}
    </Link>
  );
});

function PremiumCard() {
  return (
    <div className="w-full">
      <button className="w-full bg-[#ff3b3b] hover:bg-[#e63535] active:bg-[#cc2f2f] text-white font-bold text-sm px-4 py-3 rounded-full transition-all transform active:scale-[0.98] shadow-sm">
        Upgrade Now
      </button>
    </div>
  );
}
