'use client';

import { Checkbox } from 'antd';
import { TaskStatusBadge } from './TaskStatusBadge';

interface StepRowProps {
  step: any;
  selected?: boolean;
  onSelect?: () => void;
}

export function StepRow({
  step,
  selected = false,
  onSelect
}: StepRowProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        group bg-white border rounded-[16px] p-4 transition-all duration-300 cursor-pointer relative z-10
        ${selected
          ? 'border-[#ff3b3b] shadow-[0_0_0_1px_#ff3b3b] bg-[#FFF5F5]'
          : 'border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-lg'
        }
      `}
    >
      <div className="grid grid-cols-[40px_1fr_1.5fr_1fr_1fr] gap-4 items-center">
        {/* Checkbox */}
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onChange={onSelect}
            className="border-[#DDDDDD] [&.ant-checkbox-checked]:bg-[#ff3b3b] [&.ant-checkbox-checked]:border-[#ff3b3b]"
          />
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center">
            <span className="text-[0.6875rem] text-white font-bold">
              {step.assignee ? step.assignee.charAt(0) : 'U'}
            </span>
          </div>
          <span className="text-[0.8125rem] font-semibold text-[#111111]">{step.assignee || 'Unassigned'}</span>
        </div>

        {/* Role */}
        <div>
          <span className="text-[0.8125rem] text-[#666666] font-medium">{step.role || 'N/A'}</span>
        </div>

        {/* Hours */}
        <div className="flex justify-center">
          <span className="text-[0.8125rem] text-[#111111] font-medium">{step.estHours || 0} hrs</span>
        </div>

        {/* Status */}
        <div className="flex justify-center">
          <TaskStatusBadge status={step.status || 'todo'} />
        </div>
      </div>
    </div>
  );
}
