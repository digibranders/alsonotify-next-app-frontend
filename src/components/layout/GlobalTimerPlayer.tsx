'use client';

import { useTimer } from "../../context/TimerContext";

export function GlobalTimerPlayer() {
    const { timerState } = useTimer();

    if (!timerState.isRunning) return null;


    return null;
}
