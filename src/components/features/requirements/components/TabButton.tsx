import React from 'react';

export function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 pb-3 relative transition-colors
        ${active ? 'text-[#ff3b3b]' : 'text-[#666666] hover:text-[#111111]'}
      `}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[0.8125rem] font-bold">{label}</span>
      {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff3b3b]" />}
    </button>
  );
}
