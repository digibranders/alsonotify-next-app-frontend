'use client';

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Users, AlertTriangle } from 'lucide-react';
import { Tooltip } from 'antd';
import { Task, Requirement } from '@/types/domain';

interface PnLTabProps {
  requirement: Requirement;
  tasks: Task[];

}

interface TaskPnLData {
  id: string | number;
  name: string;
  assigneeName: string;
  assigneeRole: string;
  hourlyRate: number;
  estimatedHours: number;
  actualHours: number;
  extraHours: number;
  resourceCost: number;
  profitLoss: number;
  status: string;
}

export function PnLTab({ requirement, tasks }: PnLTabProps) {
  // Calculate P&L data from real task data
  const pnlData = useMemo((): TaskPnLData[] => {
    return tasks.map((task) => {
      // Get assignee info
      const assignee = task.member_user || task.task_members?.[0]?.user;
      const assigneeName = assignee?.name || 'Unassigned';

      // Get hourly rate from task member or use default
      const hourlyRate = 25; // Default rate, should come from employee data

      // Calculate hours
      const estimatedSeconds = (Number(task.estimated_time) || 0) * 3600;
      const actualSeconds = task.total_seconds_spent || task.totalSecondsSpent || 0;

      const estimatedHours = estimatedSeconds / 3600;
      const actualHours = actualSeconds / 3600;
      const extraHours = Math.max(0, actualHours - estimatedHours);

      // Calculate costs
      const resourceCost = actualHours * hourlyRate;
      const budgetedCost = estimatedHours * hourlyRate;
      const profitLoss = budgetedCost - resourceCost;

      return {
        id: task.id,
        name: task.name || 'Untitled Task',
        assigneeName,
        assigneeRole: 'Team Member',
        hourlyRate,
        estimatedHours: Math.round(estimatedHours * 10) / 10,
        actualHours: Math.round(actualHours * 10) / 10,
        extraHours: Math.round(extraHours * 10) / 10,
        resourceCost: Math.round(resourceCost * 100) / 100,
        profitLoss: Math.round(profitLoss * 100) / 100,
        status: task.status || 'Pending'
      };
    });
  }, [tasks]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalEstimatedHours = pnlData.reduce((sum, t) => sum + t.estimatedHours, 0);
    const totalActualHours = pnlData.reduce((sum, t) => sum + t.actualHours, 0);
    const totalResourceCost = pnlData.reduce((sum, t) => sum + t.resourceCost, 0);
    const totalExtraHours = pnlData.reduce((sum, t) => sum + t.extraHours, 0);

    const quotedPrice = Number(requirement.quoted_price) || 0;
    const netProfit = quotedPrice - totalResourceCost;
    const profitMargin = quotedPrice > 0 ? (netProfit / quotedPrice) * 100 : 0;

    return {
      quotedPrice,
      totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
      totalActualHours: Math.round(totalActualHours * 10) / 10,
      totalExtraHours: Math.round(totalExtraHours * 10) / 10,
      totalResourceCost: Math.round(totalResourceCost * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      profitMargin: Math.round(profitMargin * 10) / 10,
      taskCount: pnlData.length,
      overBudgetTasks: pnlData.filter(t => t.profitLoss < 0).length
    };
  }, [pnlData, requirement]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours * 10) / 10}h`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quoted Price */}
        <div className="bg-white rounded-[16px] p-5 border border-[#EEEEEE] shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#0F9D58]" />
            </div>
            <span className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Quoted Price</span>
          </div>
          <p className="text-[24px] font-['Manrope:Bold',sans-serif] text-[#111111]">
            {formatCurrency(summary.quotedPrice)}
          </p>
          <p className="text-[11px] text-[#666666] mt-1">Requirement budget</p>
        </div>

        {/* Resource Cost */}
        <div className="bg-white rounded-[16px] p-5 border border-[#EEEEEE] shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center">
              <Users className="w-5 h-5 text-[#ff3b3b]" />
            </div>
            <span className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Resource Cost</span>
          </div>
          <p className="text-[24px] font-['Manrope:Bold',sans-serif] text-[#111111]">
            {formatCurrency(summary.totalResourceCost)}
          </p>
          <p className="text-[11px] text-[#666666] mt-1">
            {summary.totalActualHours}h @ avg rate
          </p>
        </div>

        {/* Net Profit/Loss */}
        <div className={`bg-white rounded-[16px] p-5 border shadow-sm ${summary.netProfit >= 0 ? 'border-[#0F9D58]' : 'border-[#DC2626]'
          }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${summary.netProfit >= 0 ? 'bg-[#E8F5E9]' : 'bg-[#FEE2E2]'
              }`}>
              {summary.netProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-[#0F9D58]" />
              ) : (
                <TrendingDown className="w-5 h-5 text-[#DC2626]" />
              )}
            </div>
            <span className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">
              Net {summary.netProfit >= 0 ? 'Profit' : 'Loss'}
            </span>
          </div>
          <p className={`text-[24px] font-['Manrope:Bold',sans-serif] ${summary.netProfit >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'
            }`}>
            {summary.netProfit >= 0 ? '+' : ''}{formatCurrency(summary.netProfit)}
          </p>
          <p className="text-[11px] text-[#666666] mt-1">
            {summary.profitMargin}% margin
          </p>
        </div>

        {/* Hours Summary */}
        <div className="bg-white rounded-[16px] p-5 border border-[#EEEEEE] shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#2F80ED]" />
            </div>
            <span className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wide">Hours</span>
          </div>
          <p className="text-[24px] font-['Manrope:Bold',sans-serif] text-[#111111]">
            {summary.totalActualHours}h
          </p>
          <p className="text-[11px] text-[#666666] mt-1">
            of {summary.totalEstimatedHours}h estimated
            {summary.totalExtraHours > 0 && (
              <span className="text-[#DC2626] ml-1">(+{summary.totalExtraHours}h over)</span>
            )}
          </p>
        </div>
      </div>

      {/* Alert for over-budget tasks */}
      {summary.overBudgetTasks > 0 && (
        <div className="bg-[#FFF5F5] border border-[#FECACA] rounded-[12px] p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-['Manrope:SemiBold',sans-serif] text-[#DC2626]">
              {summary.overBudgetTasks} task{summary.overBudgetTasks > 1 ? 's' : ''} over budget
            </p>
            <p className="text-[12px] text-[#991B1B] mt-0.5">
              Some tasks have exceeded their estimated time allocation. Review the details below.
            </p>
          </div>
        </div>
      )}

      {/* Task Details Table */}
      <div className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#EEEEEE]">
          <h3 className="text-[16px] font-['Manrope:Bold',sans-serif] text-[#111111] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#ff3b3b]" />
            Task-wise P&L Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F7F7F7] border-b border-[#EEEEEE]">
              <tr>
                <th className="px-5 py-4 text-[11px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase tracking-wider">Task</th>
                <th className="px-5 py-4 text-[11px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase tracking-wider">Assignee</th>
                <th className="px-5 py-4 text-[11px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase tracking-wider text-right">Est. Hours</th>
                <th className="px-5 py-4 text-[11px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase tracking-wider text-right">Actual</th>
                <th className="px-5 py-4 text-[11px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase tracking-wider text-right">Over/Under</th>
                <th className="px-5 py-4 text-[11px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase tracking-wider text-right">
                  <Tooltip title="Actual hours × hourly rate">
                    <span className="cursor-help">Cost</span>
                  </Tooltip>
                </th>
                <th className="px-5 py-4 text-[11px] font-['Manrope:Bold',sans-serif] text-[#666666] uppercase tracking-wider text-right">P/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE]">
              {pnlData.length > 0 ? pnlData.map((task) => (
                <tr key={task.id} className="bg-white hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#F7F7F7] text-[#999999]">
                        #{task.id}
                      </span>
                      <span className="text-[13px] font-['Manrope:SemiBold',sans-serif] text-[#111111] truncate max-w-[200px]">
                        {task.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center shadow-sm">
                        <span className="text-[9px] text-white font-['Manrope:Bold',sans-serif]">
                          {task.assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[12px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">{task.assigneeName}</p>
                        <p className="text-[10px] text-[#999999]">${task.hourlyRate}/hr</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[13px] font-['Inter:Medium',sans-serif] text-[#666666]">
                      {formatHours(task.estimatedHours)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[13px] font-['Inter:Medium',sans-serif] text-[#111111]">
                      {formatHours(task.actualHours)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {task.extraHours > 0 ? (
                      <span className="text-[13px] font-['Inter:Bold',sans-serif] text-[#DC2626]">
                        +{formatHours(task.extraHours)}
                      </span>
                    ) : task.actualHours < task.estimatedHours ? (
                      <span className="text-[13px] font-['Inter:Bold',sans-serif] text-[#0F9D58]">
                        -{formatHours(task.estimatedHours - task.actualHours)}
                      </span>
                    ) : (
                      <span className="text-[13px] font-['Inter:Medium',sans-serif] text-[#999999]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[13px] font-['Inter:Medium',sans-serif] text-[#111111]">
                      {formatCurrency(task.resourceCost)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1 ${task.profitLoss >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'
                      }`}>
                      {task.profitLoss >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[13px] font-['Manrope:Bold',sans-serif]">
                        {task.profitLoss >= 0 ? '+' : ''}{formatCurrency(task.profitLoss)}
                      </span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 text-[#DDDDDD]" />
                    <p className="text-[14px] text-[#999999] font-['Inter:Regular',sans-serif]">
                      No tasks with time data available for P&L analysis
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
            {pnlData.length > 0 && (
              <tfoot className="bg-[#F7F7F7] border-t-2 border-[#EEEEEE]">
                <tr>
                  <td colSpan={2} className="px-5 py-4">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">
                      Total ({summary.taskCount} tasks)
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#666666]">
                      {formatHours(summary.totalEstimatedHours)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">
                      {formatHours(summary.totalActualHours)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {summary.totalExtraHours > 0 ? (
                      <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#DC2626]">
                        +{formatHours(summary.totalExtraHours)}
                      </span>
                    ) : (
                      <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#0F9D58]">
                        On Budget
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[13px] font-['Manrope:Bold',sans-serif] text-[#111111]">
                      {formatCurrency(summary.totalResourceCost)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1 ${summary.netProfit >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'
                      }`}>
                      {summary.netProfit >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-[14px] font-['Manrope:Bold',sans-serif]">
                        {summary.netProfit >= 0 ? '+' : ''}{formatCurrency(summary.netProfit)}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
