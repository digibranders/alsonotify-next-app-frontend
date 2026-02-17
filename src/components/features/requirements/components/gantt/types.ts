import { Task } from '@/types/domain';

export type GanttViewMode = 'week' | 'month';

export interface GanttTask extends Task {
    // Enhanced fields for Gantt internal logic
    _depth: number;
    _isExpanded: boolean;
    _hasChildren: boolean;
    _index: number;
    _visible: boolean;
    parentId?: string | number | null;

    // Mock fields for demonstration
    dependencies?: string[]; // IDs of tasks waiting on
    progress?: number;
    color?: string;
    isMilestone?: boolean;
}

export interface GanttState {
    viewMode: GanttViewMode;
    columnWidth: number;
    sidebarWidth: number;
    dateRange: {
        start: Date;
        end: Date;
    };
}
