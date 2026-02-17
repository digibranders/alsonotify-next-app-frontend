import React from 'react';
import { GanttProvider, useGantt } from './GanttContext';
import { GanttSplitLayout } from './GanttSplitLayout';
import { GanttSidebar } from './GanttSidebar';
import { GanttTimeline } from './GanttTimeline';
import { GanttControls } from './GanttControls';
import { Task } from '@/types/domain';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GanttMainProps {
    tasks: Task[];
    workingDays?: string[];
}

const GanttToolbar: React.FC = () => {
    const { visibleDate, onNext, onPrev } = useGantt();

    return (
        <div className="px-4 py-3 border-b border-[#EEEEEE] bg-white flex items-center justify-between flex-shrink-0">
            {/* Left: Time scale controls */}
            <GanttControls />

            {/* Right: Month navigation */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onPrev}
                    className="p-1.5 hover:bg-[#F5F5F5] rounded-[6px] transition-colors"
                    title="Previous Month"
                >
                    <ChevronLeft className="w-4 h-4 text-[#444444]" />
                </button>

                <span className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#111111] uppercase tracking-[0.15em] min-w-[130px] text-center">
                    {format(visibleDate, 'MMMM yyyy')}
                </span>

                <button
                    onClick={onNext}
                    className="p-1.5 hover:bg-[#F5F5F5] rounded-[6px] transition-colors"
                    title="Next Month"
                >
                    <ChevronRight className="w-4 h-4 text-[#444444]" />
                </button>
            </div>
        </div>
    );
};

export const GanttMain: React.FC<GanttMainProps> = ({ tasks, workingDays }) => {
    return (
        <GanttProvider initialTasks={tasks} workingDays={workingDays}>
            <div className="flex flex-col w-full h-full min-h-[560px] bg-white">
                <GanttToolbar />

                <div className="flex-grow relative overflow-hidden">
                    <GanttSplitLayout
                        sidebar={<GanttSidebar />}
                        timeline={<GanttTimeline />}
                    />
                </div>
            </div>
        </GanttProvider>
    );
};
