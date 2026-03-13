import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import { getTaskActivities, createTaskActivity } from './task-activity';
import axiosApi from '../config/axios';

// Mock axiosApi
vi.mock('../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('Task Activity Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch task activities', async () => {
    const mockResponse = {
      data: {
        success: true,
        result: [{ id: 1, message: 'Test message' }]
      }
    };
    (axiosApi.get as unknown as MockInstance).mockResolvedValueOnce(mockResponse);

    const result = await getTaskActivities(123);

    expect(axiosApi.get).toHaveBeenCalledWith('/task/123/activity');
    expect(result).toEqual(mockResponse.data);
  });

  it('should create task activity', async () => {
    const mockRequest = {
      task_id: 123,
      message: 'Hello @user',
      type: 'CHAT' as const
    };
    const mockResponse = {
      data: {
        success: true,
        result: { id: 1, ...mockRequest }
      }
    };
    (axiosApi.post as unknown as MockInstance).mockResolvedValueOnce(mockResponse);

    const result = await createTaskActivity(mockRequest);

    expect(axiosApi.post).toHaveBeenCalledWith('/task/activity', mockRequest);
    expect(result).toEqual(mockResponse.data);
  });
});

