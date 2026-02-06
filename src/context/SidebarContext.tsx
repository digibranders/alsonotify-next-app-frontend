'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  // Prevent hydration mismatch by returning null or a consistent state until initialized?
  // Actually, for layout it's better to just render defaulting to expanded (false) and then snap to collapsed if needed, 
  // or use 'useLayoutEffect' if possible, but Next.js SSR prefers useEffect.
  // We'll proceed with rendering children immediately to avoid layout thrashing visibility, 
  // although there might be a split-second jump if preference is 'collapsed'.

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setCollapsed }}>
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
