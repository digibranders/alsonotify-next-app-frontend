import React from 'react';
import { Drawer } from 'antd';
import { Download, Loader2 } from 'lucide-react';
import { MemberWorklog, EmployeeReport } from '../../../../services/report';
import { useResizable } from '@/hooks/useResizable';

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

    if (!member) return null;

    const taskEfficiency = member.taskStats.assigned > 0
        ? Math.round((member.taskStats.completed / member.taskStats.assigned) * 100)
        : 0;

    const workEfficiency = member.utilization;

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
            width={width}
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
                            <div className="w-14 h-14 rounded-full bg-[#111111] flex items-center justify-center text-white text-lg font-['Manrope:Bold',sans-serif] shrink-0">
                                {member.member.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-['Manrope:Bold',sans-serif] text-[#111111] m-0 flex items-center gap-2">
                                    {member.member}
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F5F5F7] text-[#666666] border border-[#E5E5E5] uppercase tracking-wide">
                                        {member.role || 'Member'}
                                    </span>
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-[#666666] font-['Inter:Medium',sans-serif]">
                                        {member.designation} <span className="text-[#E5E5E5] mx-1">|</span> {member.department}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-[#999999]/30"></span>
                                    <span className="px-2 py-0.5 rounded-full bg-[#7ccf00]/10 text-[#7ccf00] text-[11px] font-bold uppercase tracking-wide">
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
                            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wide mb-1">Total Hours</span>
                            <span className="text-2xl font-['Manrope:Bold',sans-serif] text-[#111111]">{member.totalWorkingHrs}h</span>
                        </div>
                        <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EEEEEE] flex flex-col items-center text-center">
                            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wide mb-1">Engaged</span>
                            <span className="text-2xl font-['Manrope:Bold',sans-serif] text-[#111111]">{member.actualEngagedHrs}h</span>
                        </div>
                        <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EEEEEE] flex flex-col items-center text-center">
                            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wide mb-1" title="Completed vs Assigned Tasks">Task Yield</span>
                            <span className={`text-2xl font-['Manrope:Bold',sans-serif] ${getEfficiencyColor(taskEfficiency)}`}>
                                {taskEfficiency}%
                            </span>
                        </div>
                        <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EEEEEE] flex flex-col items-center text-center">
                            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wide mb-1" title="Engaged Hours vs Capacity">Work Efficiency</span>
                            <span className={`text-2xl font-['Manrope:Bold',sans-serif] ${getEfficiencyColor(workEfficiency)}`}>
                                {workEfficiency}%
                            </span>
                        </div>
                    </div>

                    {/* Work History */}
                    <div>
                        <h3 className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111] uppercase tracking-wide mb-3">Work History</h3>
                        <div className="border border-[#EEEEEE] rounded-lg overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                    <tr>
                                        <th className="py-2 px-3 text-[11px] font-bold text-[#666666] uppercase w-[100px]">Date</th>
                                        <th className="py-2 px-3 text-[11px] font-bold text-[#666666] uppercase w-[150px]">Task</th>
                                        <th className="py-2 px-3 text-[11px] font-bold text-[#666666] uppercase min-w-[200px]">Details</th>
                                        <th className="py-2 px-3 text-[11px] font-bold text-[#666666] uppercase w-[120px] text-right">Time</th>
                                        <th className="py-2 px-3 text-[11px] font-bold text-[#666666] uppercase w-[80px] text-right">Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {worklogs.map((log) => (
                                        <tr key={log.id} className="border-b border-[#EEEEEE] last:border-0 hover:bg-[#FAFAFA] transition-colors group h-9">
                                            <td className="px-3 text-[12px] font-medium text-[#111111] whitespace-nowrap">{log.date}</td>
                                            <td className="px-3 text-[12px] font-medium text-[#111111] truncate max-w-[150px]" title={log.task}>{log.task}</td>
                                            <td className="px-3 text-[12px] text-[#666666] truncate max-w-[250px]" title={log.details}>{log.details}</td>
                                            <td className="px-3 text-[11px] text-[#666666] text-right whitespace-nowrap">{log.startTime} - {log.endTime}</td>
                                            <td className="px-3 text-right">
                                                <span className="text-[11px] font-bold text-[#111111] bg-[#EEEEEE] px-1.5 py-0.5 rounded group-hover:bg-white group-hover:shadow-sm transition-all">{log.engagedTime}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {worklogs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-[13px] text-[#666666] italic">No work history found.</td>
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
