import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface FloatingMenuContextType {
  expandedContent: ReactNode | null;
  setExpandedContent: (content: ReactNode | null) => void;
}

const FloatingMenuContext = createContext<FloatingMenuContextType | undefined>(undefined);

export function FloatingMenuProvider({ children }: { children: ReactNode }) {
  const [expandedContent, setExpandedContent] = useState<ReactNode | null>(null);

  const value = useMemo(() => ({
    expandedContent,
    setExpandedContent
  }), [expandedContent]);

  return (
    <FloatingMenuContext.Provider value={value}>
      {children}
    </FloatingMenuContext.Provider>
  );
}

export function useFloatingMenu() {
  const context = useContext(FloatingMenuContext);
  if (!context) {
    throw new Error('useFloatingMenu must be used within FloatingMenuProvider');
  }
  return context;
}
