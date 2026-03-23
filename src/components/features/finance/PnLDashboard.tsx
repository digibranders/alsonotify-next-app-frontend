'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Clock,
  AlertTriangle,
  ChevronLeft,
  Users,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
dayjs.extend(quarterOfYear);
import {
  getPnLStatement,
  getRevenueBreakdown,
  getARAgingReport,
  getDeferredRevenue,
  getCashFlow,
  PnLStatement,
  RevenueByClient,
  ARAgingReport,
  DeferredRevenueReport,
  CashFlowSummary,
} from '@/services/finance';
import { getCurrencySymbol } from '@/utils/format/currencyUtils';

// ─── Date Range Presets ──────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: 'This Month', getRange: () => ({
    start: dayjs().startOf('month').format('YYYY-MM-DD'),
    end: dayjs().endOf('month').format('YYYY-MM-DD'),
  })},
  { label: 'Last Month', getRange: () => ({
    start: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
    end: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
  })},
  { label: 'This Quarter', getRange: () => ({
    start: dayjs().startOf('quarter').format('YYYY-MM-DD'),
    end: dayjs().endOf('quarter').format('YYYY-MM-DD'),
  })},
  { label: 'This Year', getRange: () => ({
    start: dayjs().startOf('year').format('YYYY-MM-DD'),
    end: dayjs().endOf('year').format('YYYY-MM-DD'),
  })},
  { label: 'Last Year', getRange: () => ({
    start: dayjs().subtract(1, 'year').startOf('year').format('YYYY-MM-DD'),
    end: dayjs().subtract(1, 'year').endOf('year').format('YYYY-MM-DD'),
  })},
];

const PIE_COLORS = ['#2F80ED', '#0F9D58', '#F9A825', '#DC2626', '#7C3AED', '#EC4899'];

export function PnLDashboard() {
  const router = useRouter();
  const currency = 'INR'; // TODO: from company settings
  const currencySymbol = getCurrencySymbol(currency);

  // Date range state
  const [dateRange, setDateRange] = useState(() => DATE_PRESETS[2].getRange()); // This Quarter default
  const [activePreset, setActivePreset] = useState(2);

  // Data states
  const [pnl, setPnl] = useState<PnLStatement | null>(null);
  const [revenueByClient, setRevenueByClient] = useState<RevenueByClient[]>([]);
  const [arAging, setArAging] = useState<ARAgingReport | null>(null);
  const [deferred, setDeferred] = useState<DeferredRevenueReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [pnlRes, clientRes, arRes, deferredRes, cashRes] = await Promise.allSettled([
          getPnLStatement(dateRange.start, dateRange.end),
          getRevenueBreakdown(dateRange.start, dateRange.end),
          getARAgingReport(),
          getDeferredRevenue(),
          getCashFlow(dateRange.start, dateRange.end),
        ]);

        if (pnlRes.status === 'fulfilled' && pnlRes.value.success) setPnl(pnlRes.value.result);
        if (clientRes.status === 'fulfilled' && clientRes.value.success) setRevenueByClient(clientRes.value.result);
        if (arRes.status === 'fulfilled' && arRes.value.success) setArAging(arRes.value.result);
        if (deferredRes.status === 'fulfilled' && deferredRes.value.success) setDeferred(deferredRes.value.result);
        if (cashRes.status === 'fulfilled' && cashRes.value.success) setCashFlow(cashRes.value.result);
      } catch (err) {
        console.error('Failed to load P&L dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [dateRange]);

  const handlePreset = (idx: number) => {
    setActivePreset(idx);
    setDateRange(DATE_PRESETS[idx].getRange());
  };

  const fmt = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff3b3b] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/finance')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#666666]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111]">Profit & Loss</h1>
            <p className="text-xs sm:text-sm text-[#999999]">Revenue recognition & financial analysis (ASC 606 / IFRS 15)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pl-10 sm:pl-0">
          {DATE_PRESETS.map((preset, idx) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(idx)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activePreset === idx
                  ? 'bg-[#111111] text-white'
                  : 'bg-white border border-[#EEEEEE] text-[#666666] hover:bg-gray-50'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* P&L Summary Cards */}
      {pnl && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <KPICard icon={<DollarSign className="w-5 h-5 text-[#2F80ED]" />} label="Gross Revenue" value={fmt(pnl.grossRevenue)} bgColor="bg-[#E3F2FD]" />
          <KPICard icon={<FileText className="w-5 h-5 text-[#F9A825]" />} label="Credit Adjustments" value={`-${fmt(pnl.creditNoteAdjustments)}`} bgColor="bg-[#FFF8E1]" />
          <KPICard icon={<DollarSign className="w-5 h-5 text-[#0F9D58]" />} label="Net Revenue" value={fmt(pnl.netRevenue)} bgColor="bg-[#E8F5E9]" />
          <KPICard icon={<Users className="w-5 h-5 text-[#ff3b3b]" />} label="Cost of Delivery" value={fmt(pnl.costOfDelivery)} bgColor="bg-[#FFF5F5]" />
          <KPICard
            icon={pnl.grossMargin >= 0 ? <TrendingUp className="w-5 h-5 text-[#0F9D58]" /> : <TrendingDown className="w-5 h-5 text-[#DC2626]" />}
            label={`Gross Margin (${pnl.grossMarginPercent}%)`}
            value={fmt(pnl.grossMargin)}
            bgColor={pnl.grossMargin >= 0 ? 'bg-[#E8F5E9]' : 'bg-[#FEE2E2]'}
            valueColor={pnl.grossMargin >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'}
          />
        </div>
      )}

      {/* Monthly P&L Chart */}
      {pnl && pnl.monthly.length > 0 && (
        <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
          <h3 className="text-base font-bold text-[#111111] mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#ff3b3b]" />
            Monthly P&L Trend
          </h3>
          <div className="h-[280px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnl.monthly} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#999999', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#999999', fontSize: 12 }} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EEEEEE', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  formatter={(value, name) => [fmt(Number(value ?? 0)), String(name)]}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#2F80ED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costOfDelivery" name="Cost of Delivery" fill="#ff3b3b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="grossMargin" name="Gross Margin" fill="#0F9D58" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Two-column layout: Revenue by Client + AR Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Client */}
        {revenueByClient.length > 0 && (
          <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
            <h3 className="text-base font-bold text-[#111111] mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#ff3b3b]" />
              Revenue by Client
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByClient.map(c => ({ name: c.clientName, value: c.revenue }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    {revenueByClient.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => fmt(Number(value ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {revenueByClient.slice(0, 5).map((client, idx) => (
                <div key={client.clientId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-[#111111] font-medium">{client.clientName}</span>
                  </div>
                  <span className="text-[#666666] font-medium">{fmt(client.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AR Aging */}
        {arAging && (
          <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
            <h3 className="text-base font-bold text-[#111111] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#ff3b3b]" />
              Accounts Receivable Aging
            </h3>
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-[#111111]">{fmt(arAging.totalOutstanding)}</p>
              <p className="text-xs text-[#999999] mt-1">Total Outstanding</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {arAging.buckets.map((bucket) => (
                <div
                  key={bucket.key}
                  className={`text-center p-3 rounded-xl border ${
                    bucket.key === '90_plus' && bucket.total > 0
                      ? 'border-[#DC2626] bg-[#FEE2E2]'
                      : 'border-[#EEEEEE] bg-[#F9FAFB]'
                  }`}
                >
                  <p className="text-lg font-bold text-[#111111]">{fmt(bucket.total)}</p>
                  <p className="text-2xs text-[#999999] mt-0.5">{bucket.label}</p>
                  <p className="text-2xs text-[#666666]">{bucket.count} inv.</p>
                </div>
              ))}
            </div>
            {/* Top overdue invoices */}
            {arAging.buckets.some(b => b.invoices.length > 0) && (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-semibold text-[#111111]">Top Outstanding</p>
                {arAging.buckets
                  .flatMap(b => b.invoices)
                  .sort((a, b) => b.outstanding - a.outstanding)
                  .slice(0, 5)
                  .map(inv => (
                    <div key={inv.id} className="flex items-center justify-between text-xs py-1 border-b border-[#F0F0F0] last:border-0">
                      <div>
                        <span className="font-medium text-[#111111]">{inv.invoice_number}</span>
                        <span className="text-[#999999] ml-2">{inv.client}</span>
                      </div>
                      <span className={`font-semibold ${inv.status === 'overdue' ? 'text-[#DC2626]' : 'text-[#111111]'}`}>
                        {fmt(inv.outstanding)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two-column layout: Deferred Revenue + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deferred Revenue */}
        {deferred && (
          <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
            <h3 className="text-base font-bold text-[#111111] mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#F9A825]" />
              Deferred Revenue
            </h3>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-[#F9A825]">{fmt(deferred.total)}</p>
              <p className="text-xs text-[#999999] mt-1">Advance payments not yet recognized as revenue</p>
            </div>
            {deferred.items.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {deferred.items.map((item) => (
                  <div key={item.invoice_id} className="flex items-center justify-between text-xs py-2 border-b border-[#F0F0F0] last:border-0">
                    <div>
                      <p className="font-medium text-[#111111]">{item.invoice_number}</p>
                      <p className="text-[#999999]">{item.requirement} &middot; {item.type === 'ADVANCE_PAYMENT' ? 'Advance' : 'Unrecognized'}</p>
                    </div>
                    <span className="font-semibold text-[#F9A825]">{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#999999] text-center py-4">No deferred revenue items</p>
            )}
          </div>
        )}

        {/* Cash Flow */}
        {cashFlow && (
          <div className="bg-white rounded-[16px] p-6 border border-[#EEEEEE] shadow-sm">
            <h3 className="text-base font-bold text-[#111111] mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2F80ED]" />
              Cash Flow Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9]">
                <div>
                  <p className="text-xs font-medium text-[#0F9D58] uppercase tracking-wider">Cash In</p>
                  <p className="text-xs text-[#666666] mt-0.5">Payments received</p>
                </div>
                <p className="text-2xl font-bold text-[#0F9D58]">{fmt(cashFlow.cashIn)}</p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#FFF5F5] border border-[#FECACA]">
                <div>
                  <p className="text-xs font-medium text-[#DC2626] uppercase tracking-wider">Cash Out</p>
                  <p className="text-xs text-[#666666] mt-0.5">Resource costs</p>
                </div>
                <p className="text-2xl font-bold text-[#DC2626]">{fmt(cashFlow.cashOut)}</p>
              </div>
              <div className={`flex items-center justify-between p-4 rounded-xl border ${
                cashFlow.netCashFlow >= 0 ? 'bg-[#E8F5E9] border-[#C8E6C9]' : 'bg-[#FEE2E2] border-[#FECACA]'
              }`}>
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider ${cashFlow.netCashFlow >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'}`}>
                    Net Cash Flow
                  </p>
                </div>
                <p className={`text-2xl font-bold ${cashFlow.netCashFlow >= 0 ? 'text-[#0F9D58]' : 'text-[#DC2626]'}`}>
                  {cashFlow.netCashFlow >= 0 ? '+' : ''}{fmt(cashFlow.netCashFlow)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card Component ──────────────────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  bgColor,
  valueColor = 'text-[#111111]',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-[14px] px-5 py-4 border border-[#EEEEEE] shadow-sm flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5 truncate">{label}</p>
        <p className={`text-xl font-bold leading-tight ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}
