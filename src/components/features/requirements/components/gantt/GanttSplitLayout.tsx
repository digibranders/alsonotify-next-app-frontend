import React, { useRef, useCallback, useEffect } from 'react';
import { useGantt } from './GanttContext';

interface GanttSplitLayoutProps {
    sidebar: React.ReactNode;
    timeline: React.ReactNode;
}

export const GanttSplitLayout: React.FC<GanttSplitLayoutProps> = ({ sidebar, timeline }) => {
    const { sidebarWidth, setSidebarWidth } = useGantt();
    const isResizing = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const stopResizing = useCallback(() => {
        if (!isResizing.current) return;
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (!isResizing.current || !containerRef.current) return;
        const containerLeft = containerRef.current.getBoundingClientRect().left;
        const newWidth = Math.max(180, Math.min(600, e.clientX - containerLeft));
        setSidebarWidth(newWidth);
    }, [setSidebarWidth]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div ref={containerRef} className="flex w-full h-full overflow-hidden relative">
            {/* Sidebar Section */}
            <div
                style={{ width: `${sidebarWidth}px`, minWidth: '180px', maxWidth: '600px' }}
                className="h-full flex-shrink-0 flex flex-col overflow-hidden"
            >
                {sidebar}
            </div>

            {/* Resize Handle */}
            <div
                className="absolute top-0 bottom-0 z-10 w-1 cursor-col-resize group"
                style={{ left: `${sidebarWidth - 1}px` }}
                onMouseDown={startResizing}
            >
                {/* Visible hit area and hover indicator */}
                <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#ff3b3b]/30 transition-colors" />
                <div className="absolute inset-y-0 left-0 w-px bg-[#EEEEEE] group-hover:bg-[#ff3b3b] transition-colors" />
            </div>

            {/* Timeline Section */}
            <div className="flex-grow h-full overflow-hidden flex flex-col min-w-0">
                {timeline}
            </div>
        </div>
    );
};
