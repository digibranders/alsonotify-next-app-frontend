'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { getCurrentActiveTimer } from "../services/task";
import { startWorkLog, updateWorklog } from "../services/task";

type TimerState = {
    isRunning: boolean;
    taskId: number | null;
    taskName: string | null;
    projectName: string | null;
    worklogId: number | null;
    startTime: Date | null;
    elapsedSeconds: number;
};

type TimerContextType = {
    timerState: TimerState;
    startTimer: (taskId: number, taskName: string, projectName: string) => Promise<void>;
    stopTimer: (description?: string) => Promise<void>;
    isLoading: boolean;
};

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const [timerState, setTimerState] = useState<TimerState>({
        isRunning: false,
        taskId: null,
        taskName: null,
        projectName: null,
        worklogId: null,
        startTime: null,
        elapsedSeconds: 0,
    });

    const [isLoading, setIsLoading] = useState(true);
    // Silent sync state if needed for UI indicators later (optional)
    const [isSyncing, setIsSyncing] = useState(false);

    // Debounce for Remote Stop to prevent "blips"
    const consecutiveNullsRef = useRef(0);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Pending stop when user stops before start returns (worklogId === -1)
    const pendingStopRef = useRef<{ taskId: number; startTime: Date; description?: string } | null>(null);

    // Core Sync Logic - Stable Reference
    // This function is the "Single Source of Truth" enforcer.
    const syncTimer = async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        else setIsSyncing(true);

        const source = isBackground ? 'Background/Event' : 'Manual/Initial';

        try {
            const { result } = await getCurrentActiveTimer();

            if (result && (result as any).worklog_id) {
                const timer = result as any; // Treat result as the timer object directly
                const start = new Date(timer.start_datetime || "");
                const now = new Date();

                // Found active timer -> Reset debounce
                consecutiveNullsRef.current = 0;

                setTimerState(prev => {
                    const localElapsed = Math.floor((now.getTime() - start.getTime()) / 1000);

                    // Avoid unnecessary re-renders if state matches, but update elapsed
                    if (prev.worklogId === timer.worklog_id && prev.isRunning) {
                        return {
                            ...prev,
                            isRunning: true,
                            taskId: timer.task_id,
                            taskName: timer.task_name || null,
                            projectName: timer.project_name || timer.workspace_name || null,
                            worklogId: timer.worklog_id,
                            startTime: start,
                            elapsedSeconds: localElapsed,
                        };
                    }

                    return {
                        isRunning: true,
                        taskId: timer.task_id,
                        taskName: timer.task_name || null,
                        projectName: timer.project_name || timer.workspace_name || null,
                        worklogId: timer.worklog_id,
                        startTime: start,
                        elapsedSeconds: localElapsed,
                    };
                });
            } else {
                // REMOTE STOP DETECTED
                setTimerState(prev => {
                    // CRITICAL FIX: If we are in optimistic start state (worklogId === -1), 
                    // DO NOT stop just because server hasn't caught up yet.
                    if (prev.worklogId === -1) {
                        return prev;
                    }

                    if (prev.isRunning) {
                        // DEBOUNCE LOGIC: Only stop if we see 2 consecutive nulls
                        consecutiveNullsRef.current += 1;
                        if (consecutiveNullsRef.current < 2) {
                            console.warn(`[${new Date().toISOString()}] Potential Remote Stop ignored (Debounce ${consecutiveNullsRef.current}/2). Verifying...`);
                            return prev;
                        }

                        return {
                            isRunning: false,
                            taskId: null,
                            taskName: null,
                            projectName: null,
                            worklogId: null,
                            startTime: null,
                            elapsedSeconds: 0,
                        };
                    }
                    return prev;
                });
            }
        } catch (err) {
            console.error("Failed to sync timer", err);
            // Optional: Set an error state or keeping the local state as 'optimistic' 
            // until net comes back. For now, we log and do not force-stop to allow offline continuity 
            // until re-sync happens.
        } finally {
            if (!isBackground) setIsLoading(false);
            else setIsSyncing(false);
        }
    };

    // Initial Sync & Event Listeners
    useEffect(() => {
        // 1. Initial Load
        syncTimer(false);

        // 2. Event Handlers
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                syncTimer(true);
            }
        };

        const handleOnline = () => {
            syncTimer(true);
        };

        // 3. Polling (Heartbeat - 60s)
        const pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                syncTimer(true);
            }
        }, 60000);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleVisibilityChange); // Redundant but safe for some browsers

        return () => {
            clearInterval(pollInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('focus', handleVisibilityChange);
            pendingStopRef.current = null;
        };
    }, []);

    // Local Ticking using Date delta to prevent drift
    useEffect(() => {
        if (timerState.isRunning && timerState.startTime) {
            intervalRef.current = setInterval(() => {
                const now = new Date();
                const start = new Date(timerState.startTime!);
                const diffSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);

                setTimerState((prev) => ({
                    ...prev,
                    elapsedSeconds: diffSeconds,
                }));
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [timerState.isRunning, timerState.startTime]);

    const startTimer = async (taskId: number, taskName: string, projectName: string) => {
        // Optimistic Update
        const now = new Date();
        // Temporary ID until server responds, or we just trust the flow. 
        // We set isRunning true immediately for UI responsiveness.
        setTimerState({
            isRunning: true,
            taskId,
            taskName,
            projectName,
            worklogId: -1, // Temporary placeholder
            startTime: now,
            elapsedSeconds: 0,
        });

        // setIsLoading(true); // Don't block UI with loading
        try {
            const data = await startWorkLog(taskId, now.toISOString());

            const worklogId = data.result.id;

            // Apply pending stop if user stopped before start resolved
            const pending = pendingStopRef.current;
            if (pending && pending.taskId === taskId) {
                try {
                    await updateWorklog({
                        task_id: taskId,
                        start_datetime: pending.startTime.toISOString(),
                        end_datetime: new Date().toISOString(),
                        description: pending.description ?? "",
                    }, worklogId);
                    pendingStopRef.current = null;
                    setTimerState({
                        isRunning: false,
                        taskId: null,
                        taskName: null,
                        projectName: null,
                        worklogId: null,
                        startTime: null,
                        elapsedSeconds: 0,
                    });
                    return;
                } catch (pendingErr) {
                    console.error("Failed to apply pending stop", pendingErr);
                    pendingStopRef.current = null;
                    // Fall through to set worklogId so user can manually retry
                }
            }

            // Confirm with actual server ID
            setTimerState(prev => ({
                ...prev,
                worklogId,
            }));
        } catch (err) {
            console.error("Failed to start timer", err);
            pendingStopRef.current = null;
            setTimerState({
                isRunning: false,
                taskId: null,
                taskName: null,
                projectName: null,
                worklogId: null,
                startTime: null,
                elapsedSeconds: 0,
            });
            throw err;
        }
    };

    const stopTimer = async (description?: string) => {
        if (timerState.worklogId === null) return;

        const currentId = timerState.worklogId;
        const currentTaskId = timerState.taskId;
        const currentStart = timerState.startTime;

        // Optimistic Stop
        setTimerState({
            isRunning: false,
            taskId: null,
            taskName: null,
            projectName: null,
            worklogId: null,
            startTime: null,
            elapsedSeconds: 0,
        });

        // Handle worklogId === -1: queue pending stop, apply when start resolves
        if (currentId === -1 && currentTaskId !== null && currentStart !== null) {
            pendingStopRef.current = { taskId: currentTaskId, startTime: currentStart, description };
            return;
        }

        if (currentId <= 0 || currentTaskId === null || currentStart === null) return;

        try {
            const now = new Date();
            await updateWorklog({
                task_id: currentTaskId,
                start_datetime: currentStart.toISOString(),
                end_datetime: now.toISOString(),
                description: description ?? "",
            }, currentId);
        } catch (err) {
            console.error("Failed to stop timer", err);
            syncTimer(true);
        }
    };

    return (
        <TimerContext.Provider value={{ timerState, startTimer, stopTimer, isLoading }}>
            {children}
        </TimerContext.Provider>
    );
}

export function useTimer() {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error("useTimer must be used within a TimerProvider");
    }
    return context;
}
