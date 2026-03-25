import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axiosApi from '../config/axios';
import {
  getPnLStatement,
  getRevenueSummary,
  getRevenueBreakdown,
  getARAgingReport,
  getDeferredRevenue,
  getCashFlow,
} from './finance';

vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('finance service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getPnLStatement ─────────────────────────────────────────────────────────
  describe('getPnLStatement', () => {
    it('calls GET /finance/pnl with date params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { grossRevenue: 1000 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getPnLStatement('2025-01-01', '2025-12-31');

      expect(axiosApi.get).toHaveBeenCalledWith('/finance/pnl', {
        params: { start_date: '2025-01-01', end_date: '2025-12-31' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('includes client_id when provided', async () => {
      const mockResponse = { data: { success: true, result: {} } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getPnLStatement('2025-01-01', '2025-12-31', 5);

      expect(axiosApi.get).toHaveBeenCalledWith('/finance/pnl', {
        params: { start_date: '2025-01-01', end_date: '2025-12-31', client_id: '5' },
      });
    });
  });

  // ── getRevenueSummary ───────────────────────────────────────────────────────
  describe('getRevenueSummary', () => {
    it('calls GET /finance/revenue/summary with date params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { netRevenue: 500 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getRevenueSummary('2025-01-01', '2025-06-30');

      expect(axiosApi.get).toHaveBeenCalledWith('/finance/revenue/summary', {
        params: { start_date: '2025-01-01', end_date: '2025-06-30' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('includes client_id when provided', async () => {
      const mockResponse = { data: { success: true, result: {} } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getRevenueSummary('2025-01-01', '2025-06-30', 3);

      expect(axiosApi.get).toHaveBeenCalledWith('/finance/revenue/summary', {
        params: { start_date: '2025-01-01', end_date: '2025-06-30', client_id: '3' },
      });
    });
  });

  // ── getRevenueBreakdown ─────────────────────────────────────────────────────
  describe('getRevenueBreakdown', () => {
    it('calls GET /finance/revenue/breakdown with date params and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getRevenueBreakdown('2025-01-01', '2025-12-31');

      expect(axiosApi.get).toHaveBeenCalledWith('/finance/revenue/breakdown', {
        params: { start_date: '2025-01-01', end_date: '2025-12-31' },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getARAgingReport ────────────────────────────────────────────────────────
  describe('getARAgingReport', () => {
    it('calls GET /finance/ar-aging and returns data', async () => {
      const mockResponse = { data: { success: true, result: { totalOutstanding: 2000, buckets: [] } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getARAgingReport();

      expect(axiosApi.get).toHaveBeenCalledWith('/finance/ar-aging');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getDeferredRevenue ──────────────────────────────────────────────────────
  describe('getDeferredRevenue', () => {
    it('calls GET /finance/deferred-revenue and returns data', async () => {
      const mockResponse = { data: { success: true, result: { total: 500, items: [] } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getDeferredRevenue();

      expect(axiosApi.get).toHaveBeenCalledWith('/finance/deferred-revenue');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getCashFlow ─────────────────────────────────────────────────────────────
  describe('getCashFlow', () => {
    it('calls GET /finance/cash-flow with date params and returns data', async () => {
      const mockResponse = { data: { success: true, result: { cashIn: 1000, cashOut: 500, netCashFlow: 500 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getCashFlow('2025-01-01', '2025-12-31');

      expect(axiosApi.get).toHaveBeenCalledWith('/finance/cash-flow', {
        params: { start_date: '2025-01-01', end_date: '2025-12-31' },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
});
