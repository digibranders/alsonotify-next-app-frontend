'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Run once on mount to hydrate from localStorage; toggle/setCollapsed are source of truth afterward.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) {
        const isActuallyCollapsed = JSON.parse(saved);
        const timer = setTimeout(() => {
          setIsCollapsed(isActuallyCollapsed);
        }, 0);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
    } catch {
      // Ignore storage errors
    }
  };

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsed));
    } catch {
      // Ignore
    }
  };

  const openMobileSidebar = useCallback(() => setMobileOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);
  const toggleMobileSidebar = useCallback(() => setMobileOpen((prev) => !prev), []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleSidebar,
        setCollapsed,
        mobileOpen,
        openMobileSidebar,
        closeMobileSidebar,
        toggleMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
