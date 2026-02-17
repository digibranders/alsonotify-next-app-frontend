import React from 'react';
import { GanttMain } from './gantt/GanttMain';
import { Task } from '@/types/domain';

interface GanttChartTabProps {
  tasks: Task[];
  workingDays?: string[];
}

export const GanttChartTab: React.FC<GanttChartTabProps> = ({ tasks, workingDays }) => {
  return (
    <div className="w-full h-[calc(100vh-260px)] min-h-[600px] flex flex-col">
      <div className="flex-grow bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden">
        <GanttMain tasks={tasks} workingDays={workingDays} />
      </div>
    </div>
  );
};

export default GanttChartTab;
