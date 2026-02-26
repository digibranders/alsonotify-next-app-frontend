import { useState, useCallback, useEffect } from 'react';

interface UseResizableProps {
    initialWidth: number;
    minWidth?: number;
    maxWidth?: number;
    direction?: 'left' | 'right'; // 'left' means handle is on the left (panel on right), 'right' means handle is on the right (panel on left)
}

export function useResizable({
    initialWidth,
    minWidth = 300,
    maxWidth = 800,
    direction = 'left',
}: UseResizableProps) {
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (e: MouseEvent) => {
            if (isResizing) {
                let newWidth: number;
                if (direction === 'left') {
                    // Panel is on the right, handle is on the left
                    // newWidth = window.innerWidth - mouseX
                    newWidth = window.innerWidth - e.clientX;
                } else {
                    // Panel is on the left, handle is on the right
                    // newWidth = mouseX - panelLeft (usually 0)
                    newWidth = e.clientX;
                }

                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    setWidth(newWidth);
                }
            }
        },
        [isResizing, minWidth, maxWidth, direction]
    );

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    return {
        width,
        isResizing,
        startResizing,
        setWidth,
    };
}
