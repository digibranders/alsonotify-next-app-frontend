import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axiosApi from '../config/axios';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  archiveNotification,
  unarchiveNotification,
  deleteNotification,
  archiveAllRead,
  clearAllNotifications,
} from './notification';

vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── fetchNotifications ──────────────────────────────────────────────────────
  describe('fetchNotifications', () => {
    it('calls GET /notifications with tab param and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await fetchNotifications('unread');

      expect(axiosApi.get).toHaveBeenCalledWith('/notifications', { params: { tab: 'unread' } });
      expect(result).toEqual(mockResponse.data);
    });

    it('defaults tab to all', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await fetchNotifications();

      expect(axiosApi.get).toHaveBeenCalledWith('/notifications', { params: { tab: 'all' } });
    });
  });

  // ── markAllNotificationsRead ────────────────────────────────────────────────
  describe('markAllNotificationsRead', () => {
    it('calls POST /notifications/mark-read and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await markAllNotificationsRead();

      expect(axiosApi.post).toHaveBeenCalledWith('/notifications/mark-read');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── markNotificationRead ────────────────────────────────────────────────────
  describe('markNotificationRead', () => {
    it('calls POST /notifications/:id/read and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await markNotificationRead(42);

      expect(axiosApi.post).toHaveBeenCalledWith('/notifications/42/read');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── archiveNotification ─────────────────────────────────────────────────────
  describe('archiveNotification', () => {
    it('calls POST /notifications/:id/archive and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await archiveNotification(10);

      expect(axiosApi.post).toHaveBeenCalledWith('/notifications/10/archive');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── unarchiveNotification ───────────────────────────────────────────────────
  describe('unarchiveNotification', () => {
    it('calls POST /notifications/:id/unarchive and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await unarchiveNotification(10);

      expect(axiosApi.post).toHaveBeenCalledWith('/notifications/10/unarchive');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── deleteNotification ──────────────────────────────────────────────────────
  describe('deleteNotification', () => {
    it('calls DELETE /notifications/:id and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.delete as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await deleteNotification(7);

      expect(axiosApi.delete).toHaveBeenCalledWith('/notifications/7');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── archiveAllRead ──────────────────────────────────────────────────────────
  describe('archiveAllRead', () => {
    it('calls POST /notifications/archive-read and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await archiveAllRead();

      expect(axiosApi.post).toHaveBeenCalledWith('/notifications/archive-read');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── clearAllNotifications ───────────────────────────────────────────────────
  describe('clearAllNotifications', () => {
    it('calls DELETE /notifications/clear-all and returns data', async () => {
      const mockResponse = { data: { success: true } };
      (axiosApi.delete as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await clearAllNotifications();

      expect(axiosApi.delete).toHaveBeenCalledWith('/notifications/clear-all');
      expect(result).toEqual(mockResponse.data);
    });
  });
});
