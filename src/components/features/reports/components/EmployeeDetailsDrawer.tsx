import React, { useState } from 'react';
import { Drawer, Tooltip, Badge } from 'antd';
import { Download, Loader2, Info } from 'lucide-react';
import { MemberWorklog, EmployeeReport } from '../../../../services/report';
import { useResizable } from '@/hooks/useResizable';
import Link from 'next/link';

interface EmployeeDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    member: (EmployeeReport & {
        totalWorkingHrs: number;
        actualEngagedHrs: number;
        costPerHour: number;
        billablePerHour: number;
    }) | null;
    worklogs: MemberWorklog[];
    isDownloading: boolean;
    onDownload: () => void;
}

const EmployeeDetailsDrawer: React.FC<EmployeeDetailsDrawerProps> = ({
    isOpen,
    onClose,
    member,
    worklogs,
    isDownloading,
    onDownload
}) => {
    const { width, isResizing, startResizing } = useResizable({
        initialWidth: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 600,
        minWidth: 400,
        maxWidth: typeof window !== 'undefined' ? window.innerWidth * 0.9 : 1200,
        direction: 'left'
    });

    const [taskColWidth, setTaskColWidth] = useState(140);
    const [detailsColWidth, setDetailsColWidth] = useState(250);

    const handleColumnResizeStart = (e: React.MouseEvent, column: 'task' | 'details') => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const initialWidth = column === 'task' ? taskColWidth : detailsColWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(100, initialWidth + deltaX);

            if (column === 'task') {
                setTaskColWidth(newWidth);
            } else {
                setDetailsColWidth(newWidth);
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    if (!member) return null;

    const getEfficiencyColor = (value: number) => {
        if (value >= 90) return 'text-[#7ccf00]';
        if (value >= 75) return 'text-[#2196F3]';
        return 'text-[#FF3B3B]';
    };

    return (
        <Drawer
            title={null}
            closable={false}
            onClose={onClose}
            open={isOpen}
            styles={{ body: { padding: 0 }, wrapper: { width: width } }}
            className="resizable-drawer"
        >
            {/* Resize Handle */}
            <div
                className={`absolute inset-y-0 left-0 w-1.5 hover:w-2 hover:bg-[#ff3b3b]/10 cursor-col-resize z-[1001] flex items-center justify-center transition-all group ${isResizing ? 'bg-[#ff3b3b]/5 w-2' : ''}`}
                onMouseDown={startResizing}
            >
                <div className={`h-8 w-0.5 rounded-full transition-colors ${isResizing ? 'bg-[#ff3b3b]' : 'bg-[#DDDDDD] group-hover:bg-[#ff3b3b]/50'}`} />
            </div>
            <div className="flex flex-col h-full bg-white">
                {/* Drawer Header */}
                <div className="p-6 border-b border-[#EEEEEE] sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center text-white text-lg font-bold shrink-0">
                                {member.member.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[#111111] m-0 flex items-center gap-2">
                                    {member.member}
                                    <span className="px-2 py-0.5 rounded text-[0.625rem] font-medium bg-[#F5F5F7] text-[#666666] border border-[#E5E5E5] uppercase tracking-wide">
                                        {member.role || 'Member'}
                                    </span>
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-[#666666] font-medium">
                                        {member.designation} <span className="text-[#E5E5E5] mx-1">|</span> {member.department}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-[#999999]/30"></span>
                                    <span className="px-2 py-0.5 rounded-full bg-[#7ccf00]/10 text-[#7ccf00] text-[0.6875rem] font-bold uppercase tracking-wide">
                                        Active
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onDownload}
                            disabled={isDownloading}
                            className="p-2 hover:bg-[#FAFAFA] rounded-full transition-colors text-[#666666]"
                            title="Download Report"
                        >
                            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Stats Cards - CTO Suggestion: 2x2 grid for drawer readability */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EEEEEE] flex flex-col items-center text-center">
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-[0.6875rem] font-bold text-[#666666] uppercase tracking-wide">Total Hours</span>
                                <Tooltip title="Total available working hours for the period." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                                    <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0 hover:text-[#666666] transition-colors" />
                                </Tooltip>
                            </div>
                            <span className="text-2xl font-bold text-[#111111]">{member.totalWorkingHrs}h</span>
                        </div>
                        <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EEEEEE] flex flex-col items-center text-center">
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-[0.6875rem] font-bold text-[#666666] uppercase tracking-wide">Engaged</span>
                                <Tooltip title="Total actual hours engaged in tasks." styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                                    <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0 hover:text-[#666666] transition-colors" />
                                </Tooltip>
                            </div>
                            <span className="text-2xl font-bold text-[#111111]">{member.actualEngagedHrs}h</span>
                        </div>
                        <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EEEEEE] flex flex-col items-center text-center">
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-[0.6875rem] font-bold text-[#666666] uppercase tracking-wide">Occupancy</span>
                                <Tooltip title="Engaged Hours vs Capacity" styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                                    <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0 hover:text-[#666666] transition-colors" />
                                </Tooltip>
                            </div>
                            <span className={`text-2xl font-bold ${getEfficiencyColor(member.utilization)}`}>
                                {member.utilization}%
                            </span>
                        </div>
                        <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EEEEEE] flex flex-col items-center text-center">
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-[0.6875rem] font-bold text-[#666666] uppercase tracking-wide">Efficiency</span>
                                <Tooltip title="Standard Hours vs Actual Hours (Completed Tasks)" styles={{ root: { maxWidth: 280 }, container: { fontSize: 11, lineHeight: '1.4' } }}>
                                    <Info className="w-3 h-3 text-[#AAAAAA] cursor-help flex-shrink-0 hover:text-[#666666] transition-colors" />
                                </Tooltip>
                            </div>
                            <span className={`text-2xl font-bold ${getEfficiencyColor(member.efficiency ?? 0)}`}>
                                {member.efficiency ?? 0}%
                            </span>
                        </div>
                    </div>

                    {/* Work History */}
                    <div>
                        <h3 className="text-[0.8125rem] font-bold text-[#111111] uppercase tracking-wide mb-3">Work History</h3>
                        <div className="border border-[#EEEEEE] rounded-lg overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[31.25rem]">
                                <thead className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                    <tr>
                                        <th className="py-2 px-3 text-[0.6875rem] font-bold text-[#666666] uppercase w-[5.625rem] text-center">Date</th>
                                        <th
                                            className="py-2 px-3 text-[0.6875rem] font-bold text-[#666666] uppercase text-center relative group"
                                            style={{ width: taskColWidth, minWidth: taskColWidth, maxWidth: taskColWidth }}
                                        >
                                            Task
                                            <div
                                                className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#111111]/10 z-10 transition-colors"
                                                onMouseDown={(e) => handleColumnResizeStart(e, 'task')}
                                            />
                                        </th>
                                        <th
                                            className="py-2 px-3 text-[0.6875rem] font-bold text-[#666666] uppercase text-center relative group"
                                            style={{ width: detailsColWidth, minWidth: detailsColWidth, maxWidth: detailsColWidth }}
                                        >
                                            Details
                                            <div
                                                className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#111111]/10 z-10 transition-colors"
                                                onMouseDown={(e) => handleColumnResizeStart(e, 'details')}
                                            />
                                        </th>
                                        <th className="py-2 px-3 text-[0.6875rem] font-bold text-[#666666] uppercase w-[6.875rem] text-center">Time</th>
                                        <th className="py-2 px-3 text-[0.6875rem] font-bold text-[#666666] uppercase w-[7.5rem] text-center">Status</th>
                                        <th className="py-2 px-3 text-[0.6875rem] font-bold text-[#666666] uppercase w-[4.375rem] text-center">Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {worklogs.map((log) => (
                                        <tr key={log.id} className="border-b border-[#EEEEEE] last:border-0 hover:bg-[#FAFAFA] transition-colors group h-9">
                                            <td className="px-3 text-xs font-medium text-[#111111] whitespace-nowrap text-left">{log.date}</td>
                                            <td className="px-3 text-xs font-medium text-[#111111] text-left" style={{ width: taskColWidth, minWidth: taskColWidth, maxWidth: taskColWidth }}>
                                                <Tooltip title={log.task} placement="topLeft">
                                                    {log.taskId ? (
                                                        <Link
                                                            href={`/dashboard/tasks/${log.taskId}`}
                                                            className="truncate cursor-pointer text-[#2196F3] hover:text-[#1976D2] hover:underline block"
                                                            style={{ maxWidth: taskColWidth - 24 }}
                                                        >
                                                            {log.task}
                                                        </Link>
                                                    ) : (
                                                        <div className="truncate cursor-help" style={{ maxWidth: taskColWidth - 24 }}>{log.task}</div>
                                                    )}
                                                </Tooltip>
                                            </td>
                                            <td className="px-3 text-xs text-[#666666] text-left" style={{ width: detailsColWidth, minWidth: detailsColWidth, maxWidth: detailsColWidth }}>
                                                <Tooltip title={log.details} placement="topLeft">
                                                    <div className="truncate cursor-help" style={{ maxWidth: detailsColWidth - 24 }}>{log.details === '-' ? '-' : log.details}</div>
                                                </Tooltip>
                                            </td>
                                            <td className="px-3 text-[0.6875rem] text-[#666666] whitespace-nowrap text-left">{log.startTime} - {log.endTime}</td>
                                            <td className="px-3 text-center">
                                                {log.sessionStatus ? (
                                                    <Badge
                                                        count={log.sessionStatus}
                                                        style={{
                                                            backgroundColor: log.sessionStatus === 'Completed' ? '#7ccf0020' : '#11111108',
                                                            color: log.sessionStatus === 'Completed' ? '#7ccf00' : '#666666',
                                                            fontSize: '0.625rem',
                                                            fontWeight: 'bold',
                                                            textTransform: 'uppercase',
                                                            padding: '0 6px',
                                                            height: '18px',
                                                            lineHeight: '18px',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${log.sessionStatus === 'Completed' ? '#7ccf0020' : '#11111110'}`
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-[#999999]">-</span>
                                                )}
                                            </td>
                                            <td className="px-3 text-left">
                                                <span className="text-[0.6875rem] font-bold text-[#111111] bg-[#EEEEEE] px-1.5 py-0.5 rounded group-hover:bg-white group-hover:shadow-sm transition-all">{log.engagedTime}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {worklogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-[0.8125rem] text-[#666666] italic">No work history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </Drawer>
    );
};

export default EmployeeDetailsDrawer;
