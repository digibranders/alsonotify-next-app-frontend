import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock headers storage with vi.hoisted to make it available before vi.mock hoisting
const { mockResponseUse } = vi.hoisted(() => ({
  mockResponseUse: vi.fn(),
}));

// Mock axios before importing
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      defaults: {
        headers: { common: {} },
      },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: mockResponseUse },
      },
    })),
  },
}));

// Mock cookies service
vi.mock('../services/cookies', () => ({
  clearAuthFlag: vi.fn(),
}));

describe('axios config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create axios instance with withCredentials', async () => {
    const axios = await import('axios');
    // Re-import to trigger module execution
    vi.resetModules();
    await import('./axios');

    expect(axios.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        withCredentials: true,
      })
    );
  });

  it('should register a response interceptor', async () => {
    vi.resetModules();
    await import('./axios');

    expect(mockResponseUse).toHaveBeenCalled();
  });
});
