import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axiosApi from '../config/axios';
import {
  getCalendarEvents,
  getTeamsConnectionStatus,
  createCalendarEvent,
  disconnectMicrosoft,
} from './calendar';

vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('calendar service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getCalendarEvents ───────────────────────────────────────────────────────
  describe('getCalendarEvents', () => {
    it('calls GET /calendar/events with start and end params and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getCalendarEvents('2025-01-01T00:00:00Z', '2025-01-31T23:59:59Z');

      expect(axiosApi.get).toHaveBeenCalledWith('/calendar/events', {
        params: { start: '2025-01-01T00:00:00Z', end: '2025-01-31T23:59:59Z' },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getTeamsConnectionStatus ────────────────────────────────────────────────
  describe('getTeamsConnectionStatus', () => {
    it('calls GET /calendar/connection-status and returns data', async () => {
      const mockResponse = { data: { success: true, result: { connected: true } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getTeamsConnectionStatus();

      expect(axiosApi.get).toHaveBeenCalledWith('/calendar/connection-status');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── createCalendarEvent ─────────────────────────────────────────────────────
  describe('createCalendarEvent', () => {
    it('calls POST /calendar/events with payload and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 'evt-1' } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const payload = {
        subject: 'Team Standup',
        start: { dateTime: '2025-01-15T09:00:00', timeZone: 'UTC' },
        end: { dateTime: '2025-01-15T09:30:00', timeZone: 'UTC' },
      };
      const result = await createCalendarEvent(payload);

      expect(axiosApi.post).toHaveBeenCalledWith('/calendar/events', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── disconnectMicrosoft ─────────────────────────────────────────────────────
  describe('disconnectMicrosoft', () => {
    it('calls DELETE /calendar/connection and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.delete as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await disconnectMicrosoft();

      expect(axiosApi.delete).toHaveBeenCalledWith('/calendar/connection');
      expect(result).toEqual(mockResponse.data);
    });
  });
});
