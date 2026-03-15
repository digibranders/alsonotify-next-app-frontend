import React, { useState, useEffect, useMemo } from 'react';
import { Tooltip } from 'antd';
import { useTimer } from '@/context/TimerContext';
import { Task } from '@/types/domain';
import { formatDecimalHours } from '@/utils/date/timeFormat';

interface TaskLiveProgressProps {
  task: Task;
  currentUserId?: number;
}


export function TaskLiveProgress({ task, currentUserId }: TaskLiveProgressProps) {
  const { timerState } = useTimer();
  const { taskId: activeTaskId, elapsedSeconds, isRunning } = timerState;

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const hasActiveMembers = task.task_members?.some(m => m.active_worklog_start_time);
    const isContextActive = String(activeTaskId) === String(task.id);

    if (hasActiveMembers || (isContextActive && isRunning)) {
      const interval = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [task.task_members, activeTaskId, task.id, isRunning]);

  // Build live per-member data
  const liveMembers = useMemo(() => {
    return (task.task_members || []).map(m => {
      let liveSeconds = m.seconds_spent;
      const isCurrentUser = m.user_id === currentUserId;
      const isContextActive = String(activeTaskId) === String(task.id) && isRunning;

      if (isCurrentUser && isContextActive) {
        liveSeconds += elapsedSeconds;
      } else if (m.active_worklog_start_time) {
        const startTime = new Date(m.active_worklog_start_time).getTime();
        liveSeconds += Math.max(0, (now.getTime() - startTime) / 1000);
      }

      return {
        ...m,
        liveSeconds,
        loggedHours: liveSeconds / 3600,
        memberEstHours: m.estimated_time != null ? Number(m.estimated_time) : null,
        isWorking: (isCurrentUser && isContextActive) || !!m.active_worklog_start_time,
      };
    });
  }, [task.task_members, task.id, currentUserId, activeTaskId, isRunning, elapsedSeconds, now]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalLoggedHours = liveMembers.reduce((s, m) => s + m.loggedHours, 0);
  const taskEstHours = Number(task.estTime) || 0;          // task-level estimate bucket

  // Sum of per-member estimates (when available)
  const totalMemberEst = liveMembers.reduce(
    (s, m) => s + (m.memberEstHours ?? 0), 0
  );
  const hasMemberEst = totalMemberEst > 0;

  // Effective estimate: prefer sum-of-member estimates if richer; else task estimate
  const effectiveEst = Number(hasMemberEst ? totalMemberEst : taskEstHours);
  const hasEst = effectiveEst > 0;

  const remaining = effectiveEst - totalLoggedHours;
  const isBleeding = hasEst && totalLoggedHours > effectiveEst;
  const isWarning = !isBleeding && hasEst && totalLoggedHours >= effectiveEst * 0.8;

  // ── Segment bar logic ────────────────────────────────────────────────────
  const isMultiMember = liveMembers.length > 1;

  // Function to determine color based on status and overtime (from old implementation)
  const getSegmentColor = (m: any, ratio: number) => {
    const isOvertime = ratio > 1;
    const isMemberDelayed = m.status === 'Delayed';

    if (isMemberDelayed || isOvertime) {
      return '#FF3B3B'; // Red
    }
    if (m.status === 'Review') {
      return '#FBBF24'; // Amber-400
    }
    if (m.status === 'Completed') {
      return '#16A34A'; // Green
    }
    if (m.status === 'In_Progress' || m.liveSeconds > 0) {
      return '#2F80ED'; // Blue
    }
    return '#E0E0E0'; // Gray (Assigned/Pending)
  };

  // Per-member segment: width proportion from their share of the total member estimates
  const segments = liveMembers.map((m) => {
    const est = m.memberEstHours || 0;
    const spent = m.loggedHours;

    // Use totalMemberEst for width calculation. If a member has 0 estimate, they get 0% width.
    const widthPct = totalMemberEst > 0 ? (est / totalMemberEst) * 100 : 0;

    // Progress ratio for overlay (within their segment)
    const fillRatio = est > 0 ? Math.min(spent / est, 1) : 0;
    const progressRatio = est > 0 ? spent / est : 0;

    const color = getSegmentColor(m, progressRatio);

    return {
      ...m,
      color,
      widthPct,
      fillRatio,
      segEst: est,
      segBleeding: spent > est && est > 0,
      segWarning: spent >= est * 0.8 && spent <= est && est > 0,
    };
  });

  // ── Single-bar fallback (0 or 1 member) ─────────────────────────────────
  const singleMember = liveMembers[0];
  const singleFill = hasEst
    ? `${Math.min((totalLoggedHours / effectiveEst) * 100, 100).toFixed(1)}%`
    : '0%';

  // Use the same status-based color logic for single member
  const singleBarColorHex = singleMember
    ? getSegmentColor(singleMember, hasEst ? totalLoggedHours / effectiveEst : 0)
    : '#111111';

  const labelColor = 'text-[#111111]';

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const usedPct = hasEst
    ? Math.min(Math.round((totalLoggedHours / effectiveEst) * 100), 999)
    : null;

  // --- Tooltip content ---
  const summaryTooltip = (
    <div style={{ minWidth: 160 }}>
      <Row label="Total Logged" value={formatDecimalHours(totalLoggedHours)} bold />
      {hasEst && (
        <>
          <Row label="Total Estimated" value={formatDecimalHours(effectiveEst)} />
          <Row
            label="Used"
            value={`${usedPct}%`}
            color={isBleeding ? '#FF6B6B' : isWarning ? '#FF8A00' : '#4ADE80'}
          />
          <Row
            label={isBleeding ? 'Over budget' : 'Remaining'}
            value={isBleeding ? `+${formatDecimalHours(Math.abs(remaining))}` : formatDecimalHours(remaining)}
            color={isBleeding ? '#FF6B6B' : '#4ADE80'}
          />
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5 min-w-0 cursor-default">
      {/* Text row with Summary Tooltip */}
      <Tooltip
        title={summaryTooltip}
        placement="top"
        mouseEnterDelay={0.3}
        overlayInnerStyle={{
          background: '#1A1A1A',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '10px 12px',
        }}
      >
        <div className="flex items-center justify-between w-full">
          <span className={`font-medium task-row-sub whitespace-nowrap ${labelColor}`}>
            {formatDecimalHours(totalLoggedHours)}{hasEst ? `/${formatDecimalHours(effectiveEst)}` : ''}
          </span>
          {hasEst ? (
            <span className={`task-row-sub font-medium whitespace-nowrap ${isBleeding
              ? 'text-[#FF3B3B]'
              : isWarning
                ? 'text-[#EAB308]'
                : 'text-[#666666]'
              }`}>
              {isBleeding ? `+${formatDecimalHours(Math.abs(remaining))} over` : `${formatDecimalHours(remaining)} left`}
            </span>
          ) : (
            <span className="task-row-sub text-[#666666] font-medium whitespace-nowrap">No estimate</span>
          )}
        </div>
      </Tooltip>

      {/* Progress bar — segmented for multi-member, single for one */}
      {isMultiMember && totalMemberEst > 0 ? (
        <div className="h-[3px] w-full rounded-full overflow-hidden bg-[#F0F0F0] flex">
          {segments
            .filter((seg) => seg.widthPct > 0)
            .map((seg, i, arr) => {
              const overtime = seg.loggedHours > seg.segEst ? seg.loggedHours - seg.segEst : 0;
              const segmentTooltip = (
                <div className="text-center">
                  <div className="font-bold text-xs mb-0.5">{seg.user?.name || 'Unknown'}</div>
                  <div className="text-2xs opacity-70 mb-1">Status: {seg.status}</div>
                  <div className="text-xs font-medium">
                    {formatDecimalHours(seg.loggedHours)} / {formatDecimalHours(seg.segEst)}
                    {overtime > 0 && (
                      <span className="text-[#FF6B6B] font-bold ml-1.5">
                        (+{formatDecimalHours(overtime)})
                      </span>
                    )}
                  </div>
                </div>
              );

              return (
                <Tooltip
                  key={seg.id}
                  title={segmentTooltip}
                  placement="top"
                  mouseEnterDelay={0.1}
                  overlayInnerStyle={{
                    background: '#1A1A1A',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    padding: '8px 12px',
                  }}
                >
                  <div
                    style={{ width: `${seg.widthPct}%`, position: 'relative' }}
                    className={`h-full cursor-pointer hover:brightness-90 transition-all ${i !== arr.length - 1 ? 'border-r-[6px] border-white' : ''
                      }`}
                  >
                    {/* Track */}
                    <div className="h-full w-full bg-[#EBEBEB]" />
                    {/* Fill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${(seg.fillRatio * 100).toFixed(1)}%`,
                        backgroundColor: seg.color,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </Tooltip>
              );
            })}
        </div>
      ) : (
        <Tooltip
          title={summaryTooltip}
          placement="top"
          mouseEnterDelay={0.3}
          overlayInnerStyle={{
            background: '#1A1A1A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <div className="h-[3px] w-full rounded-full overflow-hidden bg-[#F0F0F0] cursor-pointer">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: singleFill, backgroundColor: singleBarColorHex }}
            />
          </div>
        </Tooltip>
      )}
    </div>
  );
}

// ── Tiny helper to keep tooltip rows DRY ─────────────────────────────────────
function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
      <span style={{ fontSize: 12, color: '#999' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: bold ? 700 : 600, color: color ?? '#FFF' }}>{value}</span>
    </div>
  );
}
