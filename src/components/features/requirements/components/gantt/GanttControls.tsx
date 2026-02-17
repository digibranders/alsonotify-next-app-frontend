
import React from 'react';
import { useGantt } from './GanttContext';
import { BarChart2 } from 'lucide-react';

export const GanttControls: React.FC = () => {
  const { viewMode, setViewMode } = useGantt();

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-[#ff3b3b]" />
        <span className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase tracking-widest">Time Scale</span>
      </div>

      <div className="flex bg-[#F5F5F5] p-1 rounded-[8px] border border-[#EEEEEE]">
        {(['week', 'month'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-5 py-1.5 text-[11px] font-['Manrope:Bold',sans-serif] rounded-[6px] transition-all uppercase tracking-widest ${viewMode === mode
              ? 'bg-white text-[#ff3b3b] shadow-sm border border-[#EEEEEE]'
              : 'text-[#999999] hover:text-[#666666]'
              }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
};
