import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Task } from '@/types/domain';
import { GanttTask } from './types';
import {
    addDays,
    differenceInDays,
    startOfDay,
    subDays,
    min as fnsMin
} from 'date-fns';

interface GanttContextType {
    // State
    tasks: GanttTask[];
    allTasksMap: Record<string, GanttTask>;
    viewMode: 'week' | 'month';
    columnWidth: number;
    sidebarWidth: number;
    dateRange: { start: Date; end: Date };
    baseDate: Date;
    totalWidth: number;
    visibleDate: Date;
    workingDayNumbers: Set<number>; // 0=Sun,1=Mon,...,6=Sat

    // Actions
    setViewMode: (mode: 'week' | 'month') => void;
    setSidebarWidth: (width: number) => void;
    toggleRow: (taskId: string) => void;
    updateTaskDates: (taskId: string, start: Date, end: Date) => void;
    onNext: () => void;
    onPrev: () => void;
    goToToday: () => void;
    setVisibleDate: (date: Date) => void;

    // Helpers
    getDateX: (date: Date) => number;
    getDateFromX: (x: number) => Date;
}

const GanttContext = createContext<GanttContextType | null>(null);

export const useGantt = () => {
    const context = useContext(GanttContext);
    if (!context) throw new Error('useGantt must be used within a GanttProvider');
    return context;
};

// Map day name strings to JS getDay() numbers (0=Sun...6=Sat)
const DAY_NAME_TO_NUMBER: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
};

const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function toWorkingDayNumbers(days: string[]): Set<number> {
    return new Set(days.map(d => DAY_NAME_TO_NUMBER[d.toLowerCase()]).filter(n => n !== undefined));
}

interface GanttProviderProps {
    initialTasks: Task[];
    workingDays?: string[];
    children: React.ReactNode;
}

export const GanttProvider: React.FC<GanttProviderProps> = ({ initialTasks, workingDays, children }) => {
    // --- View Configuration ---
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

    // Convert working day names to a Set of JS day numbers for fast lookup
    const workingDayNumbers = useMemo(() => {
        return toWorkingDayNumbers(workingDays?.length ? workingDays : DEFAULT_WORKING_DAYS);
    }, [workingDays]);

    // Compute an initial sidebar width that fits the longest task name.
    // Assumes ~7px per character at 12px font + 80px for indent/avatar/padding.
    const initialSidebarWidth = useMemo(() => {
        const longestName = initialTasks.reduce((max, t) => Math.max(max, (t.name || '').length), 0);
        const estimated = longestName * 7 + 100;
        return Math.max(180, Math.min(380, estimated));
    }, [initialTasks]);

    const [sidebarWidth, setSidebarWidth] = useState(initialSidebarWidth);

    // Initialize baseDate to the first task's start date if available, otherwise Today
    const initialBaseDate = useMemo(() => {
        const tasksWithDates = initialTasks.filter(t => t.start_date);
        if (tasksWithDates.length > 0) {
            const earliest = fnsMin(tasksWithDates.map(t => new Date(t.start_date!)));
            return earliest;
        }
        return new Date();
    }, [initialTasks]);

    const [baseDate, setBaseDate] = useState(initialBaseDate);
    const [visibleDate, setVisibleDate] = useState(initialBaseDate);

    const columnWidth = useMemo(() => {
        switch (viewMode) {
            case 'week': return 60;
            case 'month': return 25;
            default: return 40;
        }
    }, [viewMode]);

    // --- Task Processing & Hierarchy ---
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [localTasks, setLocalTasks] = useState<Task[]>(initialTasks);

    // Sync localTasks when initialTasks prop changes (e.g. after async data load)
    useEffect(() => {
        setLocalTasks(initialTasks);
    }, [initialTasks]);

    // Re-sync baseDate when tasks with dates first become available
    useEffect(() => {
        if (initialTasks.length > 0) {
            const tasksWithDates = initialTasks.filter(t => t.start_date);
            if (tasksWithDates.length > 0) {
                const earliest = fnsMin(tasksWithDates.map(t => new Date(t.start_date!)));
                setBaseDate(earliest);
                setVisibleDate(earliest);
            }
        }
    }, [initialTasks]);

    const { flatTasks, allTasksMap, dateRange } = useMemo(() => {
        // Create a massive buffer to simulate infinite scroll (+/- 2 years)
        const bufferStart = subDays(baseDate, 365);
        const bufferEnd = addDays(baseDate, 365);

        const taskMap: Record<string, GanttTask> = {};
        localTasks.forEach(t => {
            taskMap[t.id] = {
                ...t,
                _depth: 0,
                _isExpanded: expandedRows[t.id] ?? true,
                _hasChildren: localTasks.some(child => String(child.parent_id) === String(t.id)),
                _index: 0,
                _visible: true,
                parentId: t.parent_id ? String(t.parent_id) : null,
                color: getStatusColor(t.status),
                progress: (Number(t.id) % 10) * 10,
            };
        });

        const processedList: GanttTask[] = [];
        const addNode = (taskId: string, depth: number, parentVisible: boolean) => {
            const task = taskMap[taskId];
            if (!task) return;

            task._depth = depth;
            task._visible = parentVisible;
            processedList.push(task);

            if (task._isExpanded && task._hasChildren) {
                localTasks
                    .filter(child => String(child.parent_id) === taskId)
                    .forEach(child => addNode(String(child.id), depth + 1, parentVisible && task._isExpanded));
            }
        };

        localTasks
            .filter(t => !t.parent_id)
            .forEach(root => addNode(String(root.id), 0, true));

        return {
            flatTasks: processedList,
            allTasksMap: taskMap,
            dateRange: { start: bufferStart, end: bufferEnd }
        };
    }, [localTasks, expandedRows, baseDate]);

    const totalWidth = differenceInDays(dateRange.end, dateRange.start) * columnWidth;

    // --- Actions ---
    const onNext = useCallback(() => {
        setBaseDate((prev: Date) => addDays(prev, 30));
        setVisibleDate((prev: Date) => addDays(prev, 30));
    }, []);

    const onPrev = useCallback(() => {
        setBaseDate((prev: Date) => subDays(prev, 30));
        setVisibleDate((prev: Date) => subDays(prev, 30));
    }, []);

    const goToToday = useCallback(() => {
        setBaseDate(new Date());
        setVisibleDate(new Date());
    }, []);

    const toggleRow = useCallback((taskId: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
    }, []);

    const updateTaskDates = useCallback((taskId: string, start: Date, end: Date) => {
        setLocalTasks(prev => prev.map(t => {
            if (String(t.id) === taskId) {
                return {
                    ...t,
                    start_date: start.toISOString(),
                    end_date: end.toISOString()
                };
            }
            return t;
        }));
    }, []);

    const getDateX = useCallback((date: Date) => {
        const days = differenceInDays(startOfDay(date), startOfDay(dateRange.start));
        return days * columnWidth;
    }, [dateRange.start, columnWidth]);

    const getDateFromX = useCallback((x: number) => {
        const days = Math.floor(x / columnWidth);
        return addDays(dateRange.start, days);
    }, [dateRange.start, columnWidth]);

    const value = {
        tasks: flatTasks,
        allTasksMap,
        viewMode,
        columnWidth,
        sidebarWidth,
        dateRange,
        baseDate,
        totalWidth,
        visibleDate,
        workingDayNumbers,
        setViewMode,
        setSidebarWidth,
        toggleRow,
        updateTaskDates,
        onNext,
        onPrev,
        goToToday,
        setVisibleDate,
        getDateX,
        getDateFromX
    };

    return <GanttContext.Provider value={value}>{children}</GanttContext.Provider>;
};

function getStatusColor(status?: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('progress')) return '#2F80ED';
    if (s.includes('review')) return '#9C27B0';
    if (s.includes('complete') || s.includes('done')) return '#0F9D58';
    if (s.includes('delay')) return '#FF3B3B';
    return '#666666'; // Default for Assigned/To Do
}
