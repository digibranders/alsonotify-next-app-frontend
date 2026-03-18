'use client';

import { TABS } from './constants';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadCounts: Record<string, number>;
}

export function NotificationTabs({ activeTab, onTabChange, unreadCounts }: TabsProps) {
  return (
    <div className="px-4 md:px-5 py-2.5 bg-[#FAFAFA] border-b border-[#EEEEEE] shrink-0">
      <div className="bg-[#EEEEEE]/50 h-9 p-1 rounded-lg flex gap-1">
        {TABS.map((tab) => {
          const count = unreadCounts[tab.key] ?? 0;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex-1 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-white text-[#111111] shadow-sm'
                  : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`min-w-[16px] h-4 px-1 rounded-full text-[0.6rem] font-bold flex items-center justify-center leading-none ${
                  isActive ? 'bg-[#ff3b3b] text-white' : 'bg-[#CCCCCC] text-white'
                }`}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
