import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import axiosApi from '../config/axios';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatusById,
  deleteTaskById,
  startWorkLog,
  updateTaskMemberStatus,
  getAssignedTasks,
  getCurrentActiveTimer,
} from './task';

vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('task service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createTask ──────────────────────────────────────────────────────────────
  describe('createTask', () => {
    it('calls POST /task/create with the payload and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 1, name: 'Test' } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const params = { name: 'Test', workspace_id: 1 } as any;
      const result = await createTask(params);

      expect(axiosApi.post).toHaveBeenCalledWith('/task/create', expect.objectContaining({ name: 'Test' }));
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getTasks ────────────────────────────────────────────────────────────────
  describe('getTasks', () => {
    it('calls GET /task? with options and returns data', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getTasks('status=open');

      expect(axiosApi.get).toHaveBeenCalledWith('/task?status=open');
      expect(result).toEqual(mockResponse.data);
    });

    it('defaults to empty options string', async () => {
      const mockResponse = { data: { success: true, result: [] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      await getTasks();

      expect(axiosApi.get).toHaveBeenCalledWith('/task?');
    });
  });

  // ── getTaskById ─────────────────────────────────────────────────────────────
  describe('getTaskById', () => {
    it('calls GET /task/:id and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 5, name: 'Task 5' } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getTaskById(5);

      expect(axiosApi.get).toHaveBeenCalledWith('/task/5');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── updateTaskStatusById ────────────────────────────────────────────────────
  describe('updateTaskStatusById', () => {
    it('calls POST /task/:id/update/:status with optional reviewer id', async () => {
      const mockResponse = { data: { success: true, result: { id: 1 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await updateTaskStatusById(1, 'In_Progress', 10);

      expect(axiosApi.post).toHaveBeenCalledWith('/task/1/update/In_Progress', { assigned_reviewer_id: 10 });
      expect(result).toEqual(mockResponse.data);
    });

    it('sends empty payload when no reviewer id provided', async () => {
      const mockResponse = { data: { success: true, result: { id: 1 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      await updateTaskStatusById(1, 'Done');

      expect(axiosApi.post).toHaveBeenCalledWith('/task/1/update/Done', {});
    });
  });

  // ── deleteTaskById ──────────────────────────────────────────────────────────
  describe('deleteTaskById', () => {
    it('calls DELETE /task/delete/:id and returns data', async () => {
      const mockResponse = { data: { success: true, result: { id: 3 } } };
      (axiosApi.delete as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await deleteTaskById(3);

      expect(axiosApi.delete).toHaveBeenCalledWith('/task/delete/3');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── startWorkLog ────────────────────────────────────────────────────────────
  describe('startWorkLog', () => {
    it('calls POST /task/worklog/create with task_id and start_datetime', async () => {
      const mockResponse = { data: { success: true, result: { id: 1 } } };
      (axiosApi.post as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await startWorkLog(5, '2025-01-01T00:00:00Z');

      expect(axiosApi.post).toHaveBeenCalledWith('/task/worklog/create', {
        task_id: 5,
        start_datetime: '2025-01-01T00:00:00Z',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── updateTaskMemberStatus ──────────────────────────────────────────────────
  describe('updateTaskMemberStatus', () => {
    it('calls PUT /task/:taskId/member-status/:status and returns data', async () => {
      const mockResponse = { data: { success: true, result: { computedStatus: 'active' } } };
      (axiosApi.put as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await updateTaskMemberStatus(7, 'completed');

      expect(axiosApi.put).toHaveBeenCalledWith('/task/7/member-status/completed');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getAssignedTasks ────────────────────────────────────────────────────────
  describe('getAssignedTasks', () => {
    it('calls GET /task/assigned and returns data', async () => {
      const mockResponse = { data: { success: true, result: [{ id: 1 }] } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getAssignedTasks();

      expect(axiosApi.get).toHaveBeenCalledWith('/task/assigned');
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── getCurrentActiveTimer ───────────────────────────────────────────────────
  describe('getCurrentActiveTimer', () => {
    it('calls GET /task/active-timer and returns data', async () => {
      const mockResponse = { data: { success: true, result: { task_id: 1 } } };
      (axiosApi.get as unknown as MockInstance).mockResolvedValue(mockResponse);

      const result = await getCurrentActiveTimer();

      expect(axiosApi.get).toHaveBeenCalledWith('/task/active-timer');
      expect(result).toEqual(mockResponse.data);
    });
  });
});
