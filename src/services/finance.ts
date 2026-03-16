/**
 * Finance API service
 * Endpoints for P&L reporting, revenue recognition, AR aging, and cash flow.
 */

import axiosApi from '../config/axios';
import { ApiResponse } from '../types/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PnLStatement {
  period: { start: string; end: string };
  grossRevenue: number;
  creditNoteAdjustments: number;
  netRevenue: number;
  costOfDelivery: number;
  grossMargin: number;
  grossMarginPercent: number;
  invoiceCount: number;
  monthly: PnLMonthly[];
}

export interface PnLMonthly {
  period: string;
  revenue: number;
  costOfDelivery: number;
  grossMargin: number;
}

export interface RevenueSummary {
  period: { start: string; end: string };
  grossRevenue: number;
  creditNoteAdjustments: number;
  netRevenue: number;
  invoiceCount: number;
}

export interface RevenueByClient {
  clientId: number;
  clientName: string;
  revenue: number;
  invoiceCount: number;
}

export interface ARAgingBucket {
  key: string;
  label: string;
  total: number;
  count: number;
  invoices: ARAgingInvoice[];
}

export interface ARAgingInvoice {
  id: number;
  invoice_number: string;
  client: string;
  outstanding: number;
  status: string;
}

export interface ARAgingReport {
  totalOutstanding: number;
  buckets: ARAgingBucket[];
}

export interface DeferredRevenueItem {
  invoice_id: number;
  invoice_number: string;
  type: 'ADVANCE_PAYMENT' | 'UNRECOGNIZED_PAYMENT';
  amount: number;
  requirement: string;
  requirement_status: string;
}

export interface DeferredRevenueReport {
  total: number;
  items: DeferredRevenueItem[];
}

export interface CashFlowSummary {
  period: { start: string; end: string };
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export const getPnLStatement = async (
  startDate: string,
  endDate: string,
  clientId?: number,
): Promise<ApiResponse<PnLStatement>> => {
  const params: Record<string, string> = { start_date: startDate, end_date: endDate };
  if (clientId) params.client_id = String(clientId);
  const { data } = await axiosApi.get<ApiResponse<PnLStatement>>('/finance/pnl', { params });
  return data;
};

export const getRevenueSummary = async (
  startDate: string,
  endDate: string,
  clientId?: number,
): Promise<ApiResponse<RevenueSummary>> => {
  const params: Record<string, string> = { start_date: startDate, end_date: endDate };
  if (clientId) params.client_id = String(clientId);
  const { data } = await axiosApi.get<ApiResponse<RevenueSummary>>('/finance/revenue/summary', { params });
  return data;
};

export const getRevenueBreakdown = async (
  startDate: string,
  endDate: string,
): Promise<ApiResponse<RevenueByClient[]>> => {
  const { data } = await axiosApi.get<ApiResponse<RevenueByClient[]>>('/finance/revenue/breakdown', {
    params: { start_date: startDate, end_date: endDate },
  });
  return data;
};

export const getARAgingReport = async (): Promise<ApiResponse<ARAgingReport>> => {
  const { data } = await axiosApi.get<ApiResponse<ARAgingReport>>('/finance/ar-aging');
  return data;
};

export const getDeferredRevenue = async (): Promise<ApiResponse<DeferredRevenueReport>> => {
  const { data } = await axiosApi.get<ApiResponse<DeferredRevenueReport>>('/finance/deferred-revenue');
  return data;
};

export const getCashFlow = async (
  startDate: string,
  endDate: string,
): Promise<ApiResponse<CashFlowSummary>> => {
  const { data } = await axiosApi.get<ApiResponse<CashFlowSummary>>('/finance/cash-flow', {
    params: { start_date: startDate, end_date: endDate },
  });
  return data;
};

export const recognizeInvoiceRevenue = async (invoiceId: number): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosApi.post<ApiResponse<unknown>>(`/finance/invoice/${invoiceId}/recognize-revenue`);
  return data;
};

export const unrecognizeInvoiceRevenue = async (invoiceId: number): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosApi.post<ApiResponse<unknown>>(`/finance/invoice/${invoiceId}/unrecognize-revenue`);
  return data;
};
