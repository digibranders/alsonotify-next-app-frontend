import React from 'react';

export function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; icon?: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        pb-3 relative transition-colors
        ${active ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'}
      `}
    >
      <span className="text-sm font-bold">{label}</span>
      {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />}
    </button>
  );
}
