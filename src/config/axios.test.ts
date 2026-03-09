import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock headers storage with vi.hoisted to make it available before vi.mock hoisting
const { mockHeaders } = vi.hoisted(() => ({
  mockHeaders: {
    common: {} as Record<string, string | undefined>,
  },
}));

// Mock axios before importing
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      defaults: {
        headers: mockHeaders,
      },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

// Mock universal-cookie with vi.hoisted
vi.mock('universal-cookie', () => ({
  default: class MockCookies {
    get = vi.fn().mockReturnValue('');
    remove = vi.fn();
  },
}));

// Import after mocking
import { setAuthToken } from './axios';

describe('axios config', () => {
  beforeEach(() => {
    // Clear headers before each test
    mockHeaders.common = {};
  });

  describe('setAuthToken', () => {
    it('should set Authorization header when token is provided', () => {
      setAuthToken('test-bearer-token');

      expect(mockHeaders.common['Authorization']).toBe('Bearer test-bearer-token');
    });

    it('should set header to the token value', () => {
      const token = 'Bearer xyz123';
      setAuthToken(token);

      expect(mockHeaders.common['Authorization']).toBe(`Bearer ${token}`);
    });

    it('should remove Authorization header when token is null', () => {
      // First set the headers
      mockHeaders.common['Authorization'] = 'existing-token';

      setAuthToken(null);

      expect(mockHeaders.common['Authorization']).toBeUndefined();
    });

    it('should handle empty string token by removing headers', () => {
      mockHeaders.common['Authorization'] = 'existing-token';

      // Empty string is falsy, so should remove headers
      setAuthToken('');

      expect(mockHeaders.common['Authorization']).toBeUndefined();
    });

    it('should preserve token format exactly as provided', () => {
      const rawToken = 'raw-token-no-bearer-prefix';
      setAuthToken(rawToken);

      expect(mockHeaders.common['Authorization']).toBe(`Bearer ${rawToken}`);
    });
  });
});
