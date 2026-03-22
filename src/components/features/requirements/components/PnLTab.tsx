'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Tooltip } from 'antd';
import { Task, Requirement } from '@/types/domain';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
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

  // Enriched chart data with forecast projection
  const enrichedChartData = useMemo(() => {
    if (chartData.length < 2) return chartData.map(p => ({ ...p, forecast: null as number | null }));

    const lastIdx = chartData.length - 1;
    const lastPoint = chartData[lastIdx];
    const prevPoint = chartData[lastIdx - 1];

    // Burn rate: change in cost per period
    const burnRate = (lastPoint.invested || 0) - (prevPoint.invested || 0);

    // Enrich existing data — forecast connects from last actual point
    const enriched: Array<{ name: string; price: number; invested: number | null; forecast: number | null }> = chartData.map((point, idx) => ({
      ...point,
      forecast: idx === lastIdx ? point.invested : null,
    }));

    // Only project if there's meaningful cost data and positive burn rate
    if ((lastPoint.invested || 0) > 0 && burnRate > 0) {
      const lastNameMatch = lastPoint.name?.match(/(\d+)/);
      const lastNum = lastNameMatch ? parseInt(lastNameMatch[1]) : chartData.length;
      const prefix = lastPoint.name?.replace(/\d+/, '').trim() || 'Week ';

      for (let i = 1; i <= 2; i++) {
        enriched.push({
          name: `${prefix}${lastNum + i}`,
          price: lastPoint.price,
          invested: null,
          forecast: (lastPoint.invested || 0) + burnRate * i,
        });
      }
    }

    return enriched;
  }, [chartData]);

  // Check if forecast exceeds budget
  const forecastExceedsBudget = useMemo(() => {
    const lastForecast = enrichedChartData.filter(d => d.forecast != null).pop();
    return lastForecast ? (lastForecast.forecast || 0) > summary.quotedPrice : false;
  }, [enrichedChartData, summary.quotedPrice]);

  // Projected final cost (for annotation)
  const projectedFinalCost = useMemo(() => {
    const forecastPoints = enrichedChartData.filter(d => d.forecast != null && d.invested == null);
    if (forecastPoints.length === 0) return null;
    return forecastPoints[forecastPoints.length - 1].forecast;
  }, [enrichedChartData]);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planned = payload.find((p: any) => p.dataKey === 'price')?.value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = payload.find((p: any) => p.dataKey === 'invested')?.value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const forecast = payload.find((p: any) => p.dataKey === 'forecast')?.value;

    const costValue = actual ?? forecast;
    const variance = planned != null && costValue != null ? planned - costValue : null;
    const budgetUsedPct = summary.quotedPrice > 0 && costValue != null
      ? (costValue / summary.quotedPrice) * 100
      : null;
    const isForecastPoint = actual == null && forecast != null;

    return (
      <div className="bg-white rounded-xl border border-[#EEEEEE] p-3 min-w-[200px]" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <p className="text-xs font-semibold text-[#111111] mb-2">{label}</p>
        {planned != null && (
          <div className="flex justify-between items-center gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff3b3b] inline-block" />
              <span className="text-xs text-[#999999]">Budget</span>
            </div>
            <span className="text-xs font-medium text-[#111111]">{currencySymbol}{Number(planned).toLocaleString()}</span>
          </div>
        )}
        {actual != null && (
          <div className="flex justify-between items-center gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#111111] inline-block" />
              <span className="text-xs text-[#999999]">Actual</span>
            </div>
            <span className="text-xs font-medium text-[#111111]">{currencySymbol}{Number(actual).toLocaleString()}</span>
          </div>
        )}
        {isForecastPoint && (
          <div className="flex justify-between items-center gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full inline-block ${forecastExceedsBudget ? 'bg-[#DC2626]' : 'bg-[#0F9D58]'}`} />
              <span className="text-xs text-[#999999]">Projected</span>
            </div>
            <span className={`text-xs font-medium italic ${forecastExceedsBudget ? 'text-[#DC2626]' : 'text-[#111111]'}`}>
              {currencySymbol}{Number(forecast).toLocaleString()}
            </span>
          </div>
        )}
        {variance != null && (
          <>
            <div className="border-t border-[#F0F0F0] my-1.5" />
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs text-[#999999]">Variance</span>
              <span className={`text-xs font-bold ${variance >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'}`}>
                {variance >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(variance).toLocaleString()}
              </span>
            </div>
          </>
        )}
        {budgetUsedPct != null && (
          <div className="flex justify-between items-center gap-4 mt-1">
            <span className="text-xs text-[#999999]">Budget used</span>
            <span className="text-xs font-medium text-[#666666]">{budgetUsedPct.toFixed(1)}%</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white rounded-[16px] p-5 border border-[#EEEEEE] shadow-sm overflow-hidden">
        <h3 className="text-sm font-bold text-[#111111] mb-4 flex items-center gap-2">
           <TrendingUp className="w-4 h-4 text-[#ff3b3b]" />
           Profit & Loss Analysis
        </h3>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {/* Quoted Price */}
          <div className="bg-[#FAFAFA] rounded-lg px-3 py-2.5 border border-[#EEEEEE]">
            <p className="text-2xs font-medium text-[#999999] uppercase tracking-wider mb-1">Quoted Price</p>
            <p className="text-sm sm:text-base font-bold text-[#111111] leading-tight">{formatCurrency(summary.quotedPrice)}</p>
            {summary.quotedPrice > 0 && (
              <div className="mt-1.5">
                <div className="w-full h-1 bg-[#EEEEEE] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (summary.totalResourceCost / summary.quotedPrice) * 100)}%`,
                      backgroundColor: (summary.totalResourceCost / summary.quotedPrice) >= 0.8 ? '#DC2626' :
                                        (summary.totalResourceCost / summary.quotedPrice) >= 0.5 ? '#F9A825' : '#0F9D58'
                    }}
                  />
                </div>
                <p className="text-2xs text-[#999999] mt-0.5">{Math.round((summary.totalResourceCost / summary.quotedPrice) * 100)}% used</p>
              </div>
            )}
          </div>

          {/* Resource Cost */}
          <div className="bg-[#FAFAFA] rounded-lg px-3 py-2.5 border border-[#EEEEEE]">
            <p className="text-2xs font-medium text-[#999999] uppercase tracking-wider mb-1">Resource Cost</p>
            <p className="text-sm sm:text-base font-bold text-[#111111] leading-tight">{formatCurrency(summary.totalResourceCost)}</p>
          </div>

          {/* Gross Profit / Loss */}
          <div className={`bg-[#FAFAFA] rounded-lg px-3 py-2.5 border ${summary.grossProfit >= 0 ? 'border-[#0F9D58]' : 'border-[#DC2626]'}`}>
            <p className="text-2xs font-medium text-[#999999] uppercase tracking-wider mb-1">
              Gross {summary.grossProfit >= 0 ? 'Profit' : 'Loss'}
            </p>
            <p className={`text-sm sm:text-base font-bold leading-tight ${summary.grossProfit >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'}`}>
              {summary.grossProfit >= 0 ? '+' : ''}{formatCurrency(summary.grossProfit)}
            </p>
          </div>

          {/* Profit Margin */}
          <div className="bg-[#FAFAFA] rounded-lg px-3 py-2.5 border border-[#EEEEEE]">
            <p className="text-2xs font-medium text-[#999999] uppercase tracking-wider mb-1">Profit Margin</p>
            <p className={`text-sm sm:text-base font-bold leading-tight ${summary.profitMargin >= 20 ? 'text-[#0F9D58]' : summary.profitMargin >= 0 ? 'text-[#F9A825]' : 'text-[#DC2626]'}`}>
              {summary.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

      {/* P&L Chart - Earned Value Management */}
      <div className="w-full mt-2">
        {loadingChart ? (
          <div className="w-full h-[280px] sm:h-[350px] lg:h-[400px] flex items-center justify-center bg-[#F7F7F7] rounded-xl border border-[#EEEEEE]">
            <span className="text-gray-400">Loading Chart...</span>
          </div>
        ) : chartData.length > 0 ? (
          <div className="space-y-4">
          <div className="h-[280px] sm:h-[350px] lg:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={enrichedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBudgetEnvelope" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3b3b" stopOpacity={0.06}/>
                  <stop offset="95%" stopColor="#ff3b3b" stopOpacity={0.01}/>
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
                content={<CustomTooltip />}
                cursor={{ stroke: '#CCCCCC', strokeDasharray: '4 4' }}
              />

              {/* Budget Ceiling — horizontal dashed reference line */}
              <ReferenceLine
                y={summary.quotedPrice}
                stroke="#DC2626"
                strokeDasharray="6 4"
                strokeWidth={1}
                label={{ value: `Budget Ceiling`, position: 'insideTopRight', fill: '#DC2626', fontSize: 11, fontWeight: 600 }}
              />

              {/* Planned Budget area (subtle fill = budget envelope) */}
              <Area
                type="monotone"
                dataKey="price"
                stroke="#ff3b3b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBudgetEnvelope)"
                dot={false}
                connectNulls
              />

              {/* Actual Cost line (no fill, solid line) */}
              <Area
                type="monotone"
                dataKey="invested"
                stroke="#111111"
                strokeWidth={2.5}
                fill="none"
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, stroke: '#111111', strokeWidth: 2, fill: '#fff' }}
              />

              {/* Forecast projection (dashed line, color indicates risk) */}
              <Area
                type="monotone"
                dataKey="forecast"
                stroke={forecastExceedsBudget ? '#DC2626' : '#0F9D58'}
                strokeWidth={2}
                strokeDasharray="6 4"
                fill="none"
                dot={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>

          {/* Inline Legend */}
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-[#ff3b3b] inline-block rounded" />
              <span className="text-xs text-[#999999]">Planned Budget</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-[#111111] inline-block rounded" style={{ height: '2.5px' }} />
              <span className="text-xs text-[#999999]">Actual Cost</span>
            </div>
            {projectedFinalCost != null && (
              <div className="flex items-center gap-1.5">
                <span className={`w-5 inline-block border-t-2 border-dashed ${forecastExceedsBudget ? 'border-[#DC2626]' : 'border-[#0F9D58]'}`} />
                <span className="text-xs text-[#999999]">
                  Projected → {currencySymbol}{Math.round(projectedFinalCost).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          </div>
        ) : (
           <div className="w-full h-[280px] sm:h-[350px] lg:h-[400px] flex items-center justify-center bg-[#F7F7F7] rounded-xl border border-[#EEEEEE]">
            <span className="text-gray-400">No chart data available</span>
          </div>
        )}
      </div>
      </div>

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
          <table className="w-full text-left border-collapse min-w-[700px]">
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
