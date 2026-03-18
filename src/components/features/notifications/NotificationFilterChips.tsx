'use client';

import { FILTER_CHIPS } from './constants';

interface FilterChipsProps {
  activeTab: string;
  activeFilter: string | null;
  onToggleFilter: (filterKey: string) => void;
}

export function NotificationFilterChips({ activeTab, activeFilter, onToggleFilter }: FilterChipsProps) {
  const chips = FILTER_CHIPS[activeTab];
  if (!chips || chips.length === 0) return null;

  return (
    <div className="px-4 md:px-5 py-2 shrink-0 overflow-x-auto scrollbar-none">
      <div className="flex gap-1.5">
        {chips.map((chip) => {
          const isActive = activeFilter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => onToggleFilter(chip.key)}
              className={`h-6 px-2.5 rounded-full text-2xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F7F7F7] text-[#666666] hover:bg-[#EEEEEE] hover:text-[#444444]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
