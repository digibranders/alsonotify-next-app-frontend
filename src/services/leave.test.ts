import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axiosApi from '../config/axios';
import {
  getLeaves,
  getLeaveById,
  getLeaveBalance,
  updateLeaveStatus,
  applyForLeave,
  getCompanyLeaves,
} from './leave';

vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('leave service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getLeaves ───────────────────────────────────────────────────────────────
  describe('getLeaves', () => {
    it('calls GET /leaves/requests? with options and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getLeaves('year=2025');

      expect(axiosApi.get).toHaveBeenCalledWith('/leaves/requests?year=2025');
      expect(result).toEqual(mockResponse.data);
    });

    it('defaults to empty options', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getLeaves();

      expect(axiosApi.get).toHaveBeenCalledWith('/leaves/requests?');
    });
  });

  // ── getLeaveById ────────────────────────────────────────────────────────────
  describe('getLeaveById', () => {
    it('calls GET /leaves/requests/:id and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 5 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getLeaveById(5);

      expect(axiosApi.get).toHaveBeenCalledWith('/leaves/requests/5');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getLeaveBalance ─────────────────────────────────────────────────────────
  describe('getLeaveBalance', () => {
    it('calls GET /leaves/balance and returns data', async () => {
      const mockResponse = { data: { success: true, result: [{ leave_type: 'PTO', used: 3 }] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getLeaveBalance();

      expect(axiosApi.get).toHaveBeenCalledWith('/leaves/balance');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── updateLeaveStatus ───────────────────────────────────────────────────────
  describe('updateLeaveStatus', () => {
    it('calls PATCH /leaves/:id/:status and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 2, status: 'APPROVED' } } };
      (axiosApi.patch as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await updateLeaveStatus(2, 'APPROVED');

      expect(axiosApi.patch).toHaveBeenCalledWith('/leaves/2/APPROVED');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── applyForLeave ───────────────────────────────────────────────────────────
  describe('applyForLeave', () => {
    it('calls POST /leaves with payload and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 10 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const payload = {
        start_date: '2025-03-01',
        end_date: '2025-03-03',
        leave_type: 'PTO',
        reason: 'Vacation',
      };
      const result = await applyForLeave(payload);

      expect(axiosApi.post).toHaveBeenCalledWith('/leaves', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getCompanyLeaves ────────────────────────────────────────────────────────
  describe('getCompanyLeaves', () => {
    it('calls GET /leaves/requests/company and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getCompanyLeaves();

      expect(axiosApi.get).toHaveBeenCalledWith('/leaves/requests/company');
      expect(result).toEqual(mockResponse.data);
    });
  });
});
