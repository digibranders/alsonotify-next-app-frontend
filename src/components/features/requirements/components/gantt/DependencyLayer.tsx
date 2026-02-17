import React, { useMemo } from 'react';
import { useGantt } from './GanttContext';

export const DependencyLayer: React.FC = () => {
    const { tasks, getDateX } = useGantt();

    // For the demonstration, we'll draw arrows between subtasks within the same parent
    // In a real system, this would use a 'dependencies' array from the backend
    const arrows = useMemo(() => {
        const paths: { d: string; color: string }[] = [];

        tasks.forEach((task, index) => {
            // Find the "next" task in the same group to show a Finish-to-Start connection
            const nextTask = tasks[index + 1];
            if (nextTask && nextTask.parentId === task.parentId && !task._hasChildren && !nextTask._hasChildren) {
                const startX = task.end_date ? getDateX(new Date(task.end_date)) : 0;
                const startY = (index * 40) + 20; // Row height 40, middle is 20

                const endX = nextTask.start_date ? getDateX(new Date(nextTask.start_date)) : 0;
                const endY = ((index + 1) * 40) + 20;

                // Only draw if it's a valid forward dependency
                if (endX >= startX) {
                    const cp1X = startX + 20;
                    const cp2X = endX - 20;

                    const path = `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`;
                    paths.push({ d: path, color: task.color || '#CBD5E1' });
                }
            }
        });

        return paths;
    }, [tasks, getDateX]);

    return (
        <svg
            className="absolute inset-0 pointer-events-none z-10 overflow-visible"
            style={{ width: '100%', height: tasks.length * 40 }}
        >
            <defs>
                <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
                </marker>
            </defs>
            {arrows.map((arrow, i) => (
                <path
                    key={i}
                    d={arrow.d}
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    markerEnd="url(#arrowhead)"
                    className="opacity-40 animate-pulse-slow"
                />
            ))}
        </svg>
    );
};
