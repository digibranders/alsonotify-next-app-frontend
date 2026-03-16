'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Clock, Users, AlertTriangle, Receipt, Percent } from 'lucide-react';
import { Tooltip } from 'antd';
import { Task, Requirement } from '@/types/domain';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { getRequirementPnLChart, PnLChartDataPoint, getRequirementTaskPnL, TaskPnLResult } from '@/services/workspace';
import { formatDecimalHours } from '@/utils/date/timeFormat';
import { getCurrencySymbol } from '@/utils/format/currencyUtils';

interface PnLTabProps {
  requirement: Requirement;
  tasks: Task[];
}

export function PnLTab({ requirement, tasks }: PnLTabProps) {
  const [chartData, setChartData] = useState<PnLChartDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [taskPnLData, setTaskPnLData] = useState<TaskPnLResult | null>(null);
  const [loadingTaskPnL, setLoadingTaskPnL] = useState(false);

  const currency = requirement.currency || 'INR';
  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    if (requirement.id) {
      const fetchChartData = async () => {
        setLoadingChart(true);
        try {
          const res = await getRequirementPnLChart(requirement.id);
          if (res.success && res.result) {
            setChartData(res.result);
          }
        } catch (err) {
          console.error("Failed to load P&L chart", err);
        } finally {
          setLoadingChart(false);
        }
      };

      const fetchTaskPnL = async () => {
        setLoadingTaskPnL(true);
        try {
          const res = await getRequirementTaskPnL(requirement.id);
          if (res.success && res.result) {
            setTaskPnLData(res.result);
          }
        } catch (err) {
          console.error("Failed to load task P&L", err);
        } finally {
          setLoadingTaskPnL(false);
        }
      };

      fetchChartData();
      fetchTaskPnL();
    }
  }, [requirement.id]);

  // Use backend data if available, fallback to local computation
  const summary = useMemo(() => {
    if (taskPnLData) {
      const totalEstimatedHours = taskPnLData.tasks.reduce((s, t) => s + t.estimatedHours, 0);
      const totalActualHours = taskPnLData.tasks.reduce((s, t) => s + t.actualHours, 0);
      const totalExtraHours = taskPnLData.tasks.reduce((s, t) => s + t.extraHours, 0);

      return {
        quotedPrice: taskPnLData.quotedPrice,
        totalResourceCost: taskPnLData.totalResourceCost,
        grossProfit: taskPnLData.grossProfit,
        profitMargin: taskPnLData.profitMargin,
        totalInvoiced: taskPnLData.totalInvoiced,
        totalCollected: taskPnLData.totalCollected,
        totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
        totalActualHours: Math.round(totalActualHours * 10) / 10,
        totalExtraHours: Math.round(totalExtraHours * 10) / 10,
        taskCount: taskPnLData.tasks.length,
        overBudgetTasks: taskPnLData.tasks.filter(t => t.costVariance < 0).length,
      };
    }

    // Fallback: compute locally (without real hourly rates)
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + ((Number(t.estimated_time) || 0)), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + ((t.total_seconds_spent || t.totalSecondsSpent || 0) / 3600), 0);
    const quotedPrice = Number(requirement.quoted_price) || 0;

    return {
      quotedPrice,
      totalResourceCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      totalInvoiced: 0,
      totalCollected: 0,
      totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
      totalActualHours: Math.round(totalActualHours * 10) / 10,
      totalExtraHours: Math.round(Math.max(0, totalActualHours - totalEstimatedHours) * 10) / 10,
      taskCount: tasks.length,
      overBudgetTasks: 0,
    };
  }, [taskPnLData, tasks, requirement]);

  const pnlTasks = taskPnLData?.tasks || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatHours = (hours: number) => {
    return formatDecimalHours(hours);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm overflow-hidden">
        <h3 className="text-base font-bold text-[#111111] mb-6 flex items-center gap-2">
           <TrendingUp className="w-5 h-5 text-[#ff3b3b]" />
           Profit & Loss Analysis
        </h3>

        {/* Summary Cards - Row 1: Financial */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Quoted Price */}
          <div className="bg-white rounded-[14px] px-5 py-4 border border-[#EEEEEE] shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-[#0F9D58]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5">Quoted Price</p>
              <p className="text-xl font-bold text-[#111111] leading-tight">{formatCurrency(summary.quotedPrice)}</p>
            </div>
          </div>

          {/* Resource Cost */}
          <div className="bg-white rounded-[14px] px-5 py-4 border border-[#EEEEEE] shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-[#ff3b3b]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5">Resource Cost</p>
              <p className="text-xl font-bold text-[#111111] leading-tight">{formatCurrency(summary.totalResourceCost)}</p>
            </div>
          </div>

          {/* Gross Profit / Loss */}
          <div className={`bg-white rounded-[14px] px-5 py-4 border shadow-sm flex items-center gap-4 ${summary.grossProfit >= 0 ? 'border-[#0F9D58]' : 'border-[#DC2626]'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${summary.grossProfit >= 0 ? 'bg-[#E8F5E9]' : 'bg-[#FEE2E2]'}`}>
              {summary.grossProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-[#0F9D58]" />
              ) : (
                <TrendingDown className="w-5 h-5 text-[#DC2626]" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5">
                Gross {summary.grossProfit >= 0 ? 'Profit' : 'Loss'}
              </p>
              <p className={`text-xl font-bold leading-tight ${summary.grossProfit >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'}`}>
                {summary.grossProfit >= 0 ? '+' : ''}{formatCurrency(summary.grossProfit)}
              </p>
            </div>
          </div>

          {/* Profit Margin */}
          <div className="bg-white rounded-[14px] px-5 py-4 border border-[#EEEEEE] shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${summary.profitMargin >= 20 ? 'bg-[#E8F5E9]' : summary.profitMargin >= 0 ? 'bg-[#FFF8E1]' : 'bg-[#FEE2E2]'}`}>
              <Percent className={`w-5 h-5 ${summary.profitMargin >= 20 ? 'text-[#0F9D58]' : summary.profitMargin >= 0 ? 'text-[#F9A825]' : 'text-[#DC2626]'}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5">Profit Margin</p>
              <p className={`text-xl font-bold leading-tight ${summary.profitMargin >= 20 ? 'text-[#0F9D58]' : summary.profitMargin >= 0 ? 'text-[#F9A825]' : 'text-[#DC2626]'}`}>
                {summary.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards - Row 2: Billing + Hours */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Invoiced */}
          <div className="bg-white rounded-[14px] px-5 py-4 border border-[#EEEEEE] shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5 text-[#2F80ED]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5">Total Invoiced</p>
              <p className="text-xl font-bold text-[#111111] leading-tight">{formatCurrency(summary.totalInvoiced)}</p>
            </div>
          </div>

          {/* Collected */}
          <div className="bg-white rounded-[14px] px-5 py-4 border border-[#EEEEEE] shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-[#0F9D58]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5">Collected</p>
              <p className="text-xl font-bold text-[#0F9D58] leading-tight">{formatCurrency(summary.totalCollected)}</p>
            </div>
          </div>

          {/* Hours */}
          <div className="bg-white rounded-[14px] px-5 py-4 border border-[#EEEEEE] shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-[#2F80ED]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5">Hours Spent</p>
              <p className="text-xl font-bold text-[#111111] leading-tight">{formatDecimalHours(summary.totalActualHours)}</p>
              <p className="text-2xs text-[#999999]">of {formatDecimalHours(summary.totalEstimatedHours)} est.</p>
            </div>
          </div>

          {/* Over Budget Tasks */}
          <div className="bg-white rounded-[14px] px-5 py-4 border border-[#EEEEEE] shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${summary.overBudgetTasks > 0 ? 'bg-[#FEE2E2]' : 'bg-[#E8F5E9]'}`}>
              <AlertTriangle className={`w-5 h-5 ${summary.overBudgetTasks > 0 ? 'text-[#DC2626]' : 'text-[#0F9D58]'}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5">Over Budget</p>
              <p className={`text-xl font-bold leading-tight ${summary.overBudgetTasks > 0 ? 'text-[#DC2626]' : 'text-[#0F9D58]'}`}>
                {summary.overBudgetTasks} / {summary.taskCount}
              </p>
            </div>
          </div>
        </div>

      {/* P&L Chart - Earned Value Management */}
      <div className="h-[400px] w-full mt-8">
        {loadingChart ? (
          <div className="w-full h-full flex items-center justify-center bg-[#F7F7F7] rounded-xl border border-[#EEEEEE]">
            <span className="text-gray-400">Loading Chart...</span>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3b3b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ff3b3b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111111" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#111111" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#999999', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#999999', fontSize: 12 }}
                tickFormatter={(value) => `${currencySymbol}${value.toLocaleString()}`}
              />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EEEEEE', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                itemStyle={{ fontSize: "var(--font-size-xs)", fontWeight: '500' }}
                formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, undefined]}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area
                type="monotone"
                dataKey="price"
                name="Planned Budget (Linear)"
                stroke="#ff3b3b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
              <Area
                type="monotone"
                dataKey="invested"
                name="Actual Cost (Cumulative)"
                stroke="#111111"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInvested)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
           <div className="w-full h-full flex items-center justify-center bg-[#F7F7F7] rounded-xl border border-[#EEEEEE]">
            <span className="text-gray-400">No chart data available</span>
          </div>
        )}
      </div>
      </div>

      {/* Alert for over-budget tasks */}
      {summary.overBudgetTasks > 0 && (
        <div className="bg-[#FFF5F5] border border-[#FECACA] rounded-[12px] p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#DC2626]">
              {summary.overBudgetTasks} task{summary.overBudgetTasks > 1 ? 's' : ''} over budget
            </p>
            <p className="text-xs text-[#991B1B] mt-0.5">
              Some tasks have exceeded their estimated time allocation. Review the details below.
            </p>
          </div>
        </div>
      )}

      {/* Task Details Table */}
      <div className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#EEEEEE]">
          <h3 className="text-base font-bold text-[#111111] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#ff3b3b]" />
            Task-wise P&L Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto">
          {loadingTaskPnL ? (
            <div className="text-center py-12 text-[#999999] text-sm">Loading task P&L data...</div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F7F7F7] border-b border-[#EEEEEE]">
              <tr>
                <th className="px-5 py-4 text-xs font-medium text-[#999999] uppercase tracking-wider">Task</th>
                <th className="px-5 py-4 text-xs font-medium text-[#999999] uppercase tracking-wider">Assignee</th>
                <th className="px-5 py-4 text-xs font-medium text-[#999999] uppercase tracking-wider text-right">Est. Hours</th>
                <th className="px-5 py-4 text-xs font-medium text-[#999999] uppercase tracking-wider text-right">Actual</th>
                <th className="px-5 py-4 text-xs font-medium text-[#999999] uppercase tracking-wider text-right">Over/Under</th>
                <th className="px-5 py-4 text-xs font-medium text-[#999999] uppercase tracking-wider text-right">
                  <Tooltip title="Actual hours × member hourly rate">
                    <span className="cursor-help">Cost</span>
                  </Tooltip>
                </th>
                <th className="px-5 py-4 text-xs font-medium text-[#999999] uppercase tracking-wider text-right">
                  <Tooltip title="Budget variance: (Est. hours × rate) − (Actual hours × rate)">
                    <span className="cursor-help">Variance</span>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE]">
              {pnlTasks.length > 0 ? pnlTasks.map((task) => (
                <tr key={task.id} className="bg-white hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xs px-1.5 py-0.5 rounded font-mono bg-[#F7F7F7] text-[#999999]">
                        #{task.id}
                      </span>
                      <span className="text-xs font-semibold text-[#111111] truncate max-w-[200px]">
                        {task.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b] flex items-center justify-center shadow-sm">
                        <span className="text-2xs text-white font-bold">
                          {task.assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#111111]">{task.assigneeName}</p>
                        <p className="text-xs text-[#999999]">{currencySymbol}{task.hourlyRate}/hr</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs font-medium text-[#666666]">
                      {formatHours(task.estimatedHours)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs font-medium text-[#111111]">
                      {formatHours(task.actualHours)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {task.extraHours > 0 ? (
                      <span className="text-xs font-bold text-[#DC2626]">
                        +{formatHours(task.extraHours)}
                      </span>
                    ) : task.actualHours < task.estimatedHours ? (
                      <span className="text-xs font-bold text-[#0F9D58]">
                        -{formatHours(task.estimatedHours - task.actualHours)}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-[#999999]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs font-medium text-[#111111]">
                      {formatCurrency(task.resourceCost)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1 ${task.costVariance >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'
                      }`}>
                      {task.costVariance >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      <span className="text-xs font-bold">
                        {task.costVariance >= 0 ? '+' : ''}{formatCurrency(task.costVariance)}
                      </span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 text-[#DDDDDD]" />
                    <p className="text-sm text-[#999999] font-medium">
                      No tasks with time data available for P&L analysis
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
            {pnlTasks.length > 0 && (
              <tfoot className="bg-[#F7F7F7] border-t-2 border-[#EEEEEE]">
                <tr>
                  <td colSpan={2} className="px-5 py-4">
                    <span className="text-xs font-bold text-[#111111]">
                      Total ({summary.taskCount} tasks)
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs font-bold text-[#666666]">
                      {formatHours(summary.totalEstimatedHours)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs font-bold text-[#111111]">
                      {formatHours(summary.totalActualHours)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {summary.totalExtraHours > 0 ? (
                      <span className="text-xs font-bold text-[#DC2626]">
                        +{formatHours(summary.totalExtraHours)}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-[#0F9D58]">
                        On Budget
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs font-bold text-[#111111]">
                      {formatCurrency(summary.totalResourceCost)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className={`flex items-center justify-end gap-1 ${summary.grossProfit >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'
                      }`}>
                      {summary.grossProfit >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-sm font-bold">
                        {summary.grossProfit >= 0 ? '+' : ''}{formatCurrency(summary.grossProfit)}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          )}
        </div>
      </div>
    </div>
  );
}
