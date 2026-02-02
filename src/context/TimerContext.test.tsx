import { renderHook, act, waitFor } from '@testing-library/react';
import { TimerProvider, useTimer } from './TimerContext';
import * as taskService from '@/services/task';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('TimerContext Verification', () => {
    let activeTimerSpy: any;
    let startWorkLogSpy: any;
    let updateWorklogSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();
        // vi.useFakeTimers(); // Moved to specific test

        // Spy on the imported module methods
        // This effectively mocks them while preserving the module structure
        activeTimerSpy = vi.spyOn(taskService, 'getCurrentActiveTimer');
        startWorkLogSpy = vi.spyOn(taskService, 'startWorkLog').mockResolvedValue({ success: true, message: 'started' } as any);
        updateWorklogSpy = vi.spyOn(taskService, 'updateWorklog').mockResolvedValue({ success: true, message: 'updated' } as any);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // Define mock factory to be used inside tests where Date is safe
    const createMockTimer = (override: any = {}) => ({
        success: true,
        message: 'Success',
        result: {
            // Flat structure matching Backend Service logic
            worklog_id: 101,
            user_id: 1,
            task_id: 5,
            task_name: 'Test Task',
            project_name: 'Test Project',
            start_datetime: new Date(Date.now() - 60000).toISOString(),
            workspace_name: 'Test Workspace',
            ...override
        }
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TimerProvider>{children}</TimerProvider>
    );

    it('should sync with server state on mount', async () => {
        // Now Date.now() uses the fake timer set in beforeEach
        activeTimerSpy.mockResolvedValue(createMockTimer());

        const { result } = renderHook(() => useTimer(), { wrapper });

        // Initial state should be loading
        expect(result.current.isLoading).toBe(true);

        // Wait for sync
        await waitFor(() => {
            expect(result.current.timerState.isRunning).toBe(true);
        }, { timeout: 3000 });

        expect(result.current.timerState.taskId).toBe(5);
        expect(result.current.timerState.elapsedSeconds).toBeGreaterThanOrEqual(60);
    });

    it('should handle Remote Stop (Server returns null)', async () => {
        // Initial: Return running timer
        activeTimerSpy.mockResolvedValue(createMockTimer());

        const { result } = renderHook(() => useTimer(), { wrapper });

        await waitFor(() => {
            expect(result.current.timerState.isRunning).toBe(true);
        }, { timeout: 3000 });

        // Update mock to return null (stopped)
        activeTimerSpy.mockResolvedValue({
            success: true,
            message: 'No timer',
            result: null
        });

        // 1. First "Null" Response (Debounce 1/2) - Should NOT stop yet
        // Trigger focus to force re-sync
        await act(async () => {
            window.dispatchEvent(new Event('focus'));
        });
        expect(result.current.timerState.isRunning).toBe(true); // Still running

        // 2. Second "Null" Response (Debounce 2/2) - Should STOP now
        activeTimerSpy.mockResolvedValue({
            success: true,
            message: 'No timer',
            result: { active_timer: null }
        });

        await act(async () => {
            window.dispatchEvent(new Event('focus'));
        });

        await waitFor(() => {
            expect(result.current.timerState.isRunning).toBe(false);
        }, { timeout: 3000 });

        expect(result.current.timerState.taskId).toBeNull();
    });

    it('should correct drift using Date delta', async () => {
        vi.useFakeTimers();
        const startTime = new Date();
        const mockTimer = createMockTimer({ start_datetime: startTime.toISOString() });

        activeTimerSpy.mockResolvedValue(mockTimer);

        const { result } = renderHook(() => useTimer(), { wrapper });

        // Manually advance timers until isRunning becomes true
        for (let i = 0; i < 50; i++) {
            if (result.current.timerState.isRunning) break;
            await act(async () => {
                await vi.advanceTimersByTimeAsync(100);
            });
        }

        expect(result.current.timerState.isRunning).toBe(true);

        // Advance system time (simulating 5 minutes of sleep)
        const jumpSeconds = 300;
        vi.setSystemTime(new Date(startTime.getTime() + jumpSeconds * 1000));

        // Advance timers to trigger the interval tick
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5000);
        });

        // Direct assertion
        expect(result.current.timerState.elapsedSeconds).toBeGreaterThanOrEqual(jumpSeconds);
    });

    it('should NOT stop timer if worklogId is -1 (optimistic state) even if server returns null', async () => {
        // 1. Start with an optimistic state (simulated by startTimer or manual mock)
        // We'll simulate the state transition that happens during startTimer

        // Mock server returning null (not yet started)
        activeTimerSpy.mockResolvedValue({
            success: true,
            message: 'No timer',
            result: null
        });

        const { result } = renderHook(() => useTimer(), { wrapper });

        // Manually trigger startTimer to enter optimistic state
        // We need to mock startWorkLog to NOT resolve immediately if we want to test the race?
        // Actually, startTimer sets state immediately.

        // Let's just mock startWorkLog to hang or return success, but we trigger a sync before that completes if possible,
        // or just verify that if we are in that state, a sync doesn't kill it.

        await act(async () => {
            // We ignore the promise here to check intermediate state if needed, 
            // but easier to just Mock the hook's internal state? We can't accessing internal state directly.
            // So we call startTimer.
            startWorkLogSpy.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ result: { id: 102 } }), 500))); // Delayed Server Response

            result.current.startTimer(99, 'Optimistic Task', 'Opt Project');
        });

        expect(result.current.timerState.worklogId).toBe(-1);
        expect(result.current.timerState.isRunning).toBe(true);

        // Now trigger a Sync (e.g. Focus Event)
        await act(async () => {
            window.dispatchEvent(new Event('focus'));
        });

        // Should still be running because worklogId is -1
        expect(result.current.timerState.isRunning).toBe(true);
        expect(result.current.timerState.taskId).toBe(99);
    });

    it('should debounce Remote Stop signals (ignore single null response)', async () => {
        // Setup: Running timer
        const mockTimer = createMockTimer();
        activeTimerSpy.mockResolvedValueOnce(mockTimer); // Initial load

        const { result } = renderHook(() => useTimer(), { wrapper });

        // Wait for initial sync
        await waitFor(() => expect(result.current.timerState.isRunning).toBe(true));

        // 1. First "Null" Response (Transient Failure)
        activeTimerSpy.mockResolvedValueOnce({
            success: true,
            message: 'No timer',
            result: null
        });

        await act(async () => {
            window.dispatchEvent(new Event('focus'));
        });

        // Should still be running (Debounce 1/2)
        expect(result.current.timerState.isRunning).toBe(true);

        // 2. Second "Null" Response (Confirmed Stop)
        activeTimerSpy.mockResolvedValueOnce({
            success: true,
            message: 'No timer',
            result: null
        });

        await act(async () => {
            window.dispatchEvent(new Event('focus'));
        });

        // Should now be stopped
        expect(result.current.timerState.isRunning).toBe(false);
    });

    it('pending stop (worklogId -1): applies stop when start resolves and calls updateWorklog once', async () => {
        activeTimerSpy.mockResolvedValue({ success: true, message: 'No timer', result: null });

        let resolveStart: (value: any) => void;
        const startPromise = new Promise<{ result: { id: number } }>((resolve) => {
            resolveStart = resolve;
        });
        startWorkLogSpy.mockReturnValue(startPromise);

        const { result } = renderHook(() => useTimer(), { wrapper });

        await act(async () => {
            result.current.startTimer(5, 'Task', 'Proj');
        });
        expect(result.current.timerState.worklogId).toBe(-1);
        expect(result.current.timerState.isRunning).toBe(true);

        await act(async () => {
            result.current.stopTimer();
        });
        expect(updateWorklogSpy).not.toHaveBeenCalled();
        expect(result.current.timerState.isRunning).toBe(false);

        await act(async () => {
            resolveStart!({ result: { id: 123 } });
        });

        await waitFor(() => {
            expect(updateWorklogSpy).toHaveBeenCalledTimes(1);
        }, { timeout: 2000 });
        expect(updateWorklogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                task_id: 5,
                start_datetime: expect.any(String),
                end_datetime: expect.any(String),
                description: '',
            }),
            123
        );
    });

    it('stopTimer(description) passes description to updateWorklog', async () => {
        activeTimerSpy.mockResolvedValue(createMockTimer());

        const { result } = renderHook(() => useTimer(), { wrapper });

        await waitFor(() => {
            expect(result.current.timerState.isRunning).toBe(true);
        }, { timeout: 3000 });
        expect(result.current.timerState.worklogId).toBe(101);

        await act(async () => {
            result.current.stopTimer('my note');
        });

        expect(updateWorklogSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                description: 'my note',
            }),
            101
        );
    });
});
