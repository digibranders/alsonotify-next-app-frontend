import React from 'react';
import { Tooltip } from 'antd';

interface Member {
    id: number;
    user: { name: string | null | undefined };
    estimated_time: number | null;
    seconds_spent: number; // LIVE seconds (calculated in parent)
    status: string; // Member status or Task status context?
    // Ideally, we might need task-level status to know if "Blocked/Delayed" applies to everyone?
    // User says: "Red... If Task is Blocked/Delayed OR if that specific member is over..."
    // So we might need a prop `isTaskBlocked`?
}

interface SegmentedProgressBarProps {
    members: Member[];
    totalEstimate: number; // In hours (from Task)
    taskStatus: string; // To check Blocked/Delayed top-level
    executionMode: 'parallel' | 'sequential';
}

export function SegmentedProgressBar({ members, totalEstimate, taskStatus }: Readonly<SegmentedProgressBarProps>) {
    if (!totalEstimate || totalEstimate <= 0) {
        return (
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden" />
        );
    }

    // Helper to determine color
    const getSegmentColor = (member: Member, ratio: number) => {
        // 1. Red: Member Overtime OR specific block status
        // Note: We check member.status for specific blocks if available, or fallback to check if overtime.
        const isOvertime = ratio > 1; // spent > est
        const isMemberDelayed = member.status === 'Delayed';

        if (isMemberDelayed || isOvertime) {
            return 'bg-[#ff3b3b]'; // Red (Delayed/Overtime supersedes completion)
        }

        // 2. Task-level overrides for Review and Completed
        if (taskStatus === 'Completed' || member.status === 'Completed') {
            return 'bg-[#16a34a]'; // Green (Completed on time)
        }
        if (taskStatus === 'Review' || member.status === 'Review') {
            return 'bg-[#fbbf24]'; // Yellow (Review on time)
        }

        // 3. In Progress / Active: Blue
        // Check if actually worked on (seconds > 0) or marked In_Progress
        if (member.status === 'In_Progress' || member.seconds_spent > 0) {
            return 'bg-[#2F80ED]'; // Blue
        }

        // 4. Assigned/Pending: Gray
        return 'bg-[#E0E0E0]';
    };

    // Calculate total estimate from members for segmentation
    const sumMemberEstimates = members.reduce((sum, m) => sum + (Number(m.estimated_time) || 0), 0);
    const scale = sumMemberEstimates > 0 ? totalEstimate / sumMemberEstimates : 1;

    const segments = members.map((member) => {
        let est = Number(member.estimated_time || 0);

        // Scale the member's estimate so they collectively match totalEstimate
        if (sumMemberEstimates === 0) {
            est = totalEstimate / members.length;
        } else {
            est = est * scale;
        }

        const spent = Number(member.seconds_spent || 0) / 3600; // hours

        // Use totalEstimate for width calculation to ensure segments sum to 100%
        const widthPercent = (est / totalEstimate) * 100;

        // Progress ratio for overlay (relative to scaled estimate)
        const progressRatio = est > 0 ? spent / est : 0;
        const overlayPercent = Math.min(progressRatio * 100, 100);

        const colorClass = getSegmentColor(member, progressRatio);

        return {
            ...member,
            widthPercent,
            colorClass,
            overlayPercent,
            spentHours: spent,
            estimate: est
        };
    });

    return (
        <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-[#F3F3F3] border border-transparent">
            {segments.map((seg, idx) => {
                const estimate = seg.estimate;
                const overtime = seg.spentHours > estimate ? seg.spentHours - estimate : 0;

                return (
                    <Tooltip
                        key={seg.id || idx}
                        title={
                            <div className="text-center text-xs">
                                <div className="font-bold mb-1">{seg.user.name}</div>
                                <div className="text-[0.625rem] opacity-80 mb-1">Status: {seg.status}</div>
                                <div>
                                    {seg.spentHours.toFixed(2)}h / {estimate.toFixed(2)}h
                                    {overtime > 0 && (
                                        <span className="text-[#ff4d4f] font-bold ml-1">
                                            (+{overtime.toFixed(2)}h)
                                        </span>
                                    )}
                                </div>
                            </div>
                        }
                        mouseEnterDelay={0.1}
                    >
                        <div
                            className="h-full bg-[#E5E5E5]/50 relative border-r-2 border-white last:border-0 cursor-pointer hover:brightness-95 transition-all"
                            style={{
                                width: `${seg.widthPercent}%`,
                                minWidth: '2px' // Ensure tiny segments are visible/hoverable
                            }}
                        >
                            {/* Colored Progress Fill */}
                            {seg.overlayPercent > 0 && (
                                <div
                                    className={`h-full ${seg.colorClass} absolute left-0 top-0 transition-all duration-500`}
                                    style={{ width: `${seg.overlayPercent}%` }}
                                />
                            )}
                        </div>
                    </Tooltip>
                );
            })}
        </div>
    );
}
