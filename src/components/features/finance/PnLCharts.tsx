'use client';

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

/**
 * The two recharts figures from PnLDashboard, isolated so recharts (~90KB
 * gzipped) is code-split off the /dashboard/finance/pnl first load.
 *
 * Moved verbatim — this is a bundling change, not a redesign. The formatter and
 * palette are passed in rather than duplicated, so there is one source of truth
 * for currency rendering.
 */

interface MonthlyDatum {
  period: string;
  revenue: number;
  costOfDelivery: number;
  grossMargin: number;
}

interface MonthlyPnLChartProps {
  monthly: MonthlyDatum[];
  currencySymbol: string;
  fmt: (value: number) => string;
}

export function MonthlyPnLChart({ monthly, currencySymbol, fmt }: MonthlyPnLChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthly} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
  );
}

interface RevenueByClientChartProps {
  revenueByClient: { clientName: string; revenue: number }[];
  pieColors: string[];
  fmt: (value: number) => string;
}

export function RevenueByClientChart({ revenueByClient, pieColors, fmt }: RevenueByClientChartProps) {
  return (
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
            <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => fmt(Number(value ?? 0))} />
      </PieChart>
    </ResponsiveContainer>
  );
}
