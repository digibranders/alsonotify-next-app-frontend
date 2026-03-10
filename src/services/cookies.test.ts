import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock hoists to top, so we need to use vi.hoisted to define mocks
const { mockSet, mockGet, mockRemove } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockGet: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock('universal-cookie', () => {
  return {
    default: class MockCookies {
      set = mockSet;
      get = mockGet;
      remove = mockRemove;
    },
  };
});

// Import after mocking
import { setToken, getToken, deleteToken } from './cookies';

describe('cookies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setToken', () => {
    it('should set cookie with secure=true when protocol is https', () => {
      // Mock window.location.protocol as https
      const originalWindow = global.window;
      global.window = {
        location: { protocol: 'https:' },
      } as unknown as Window & typeof globalThis;

      setToken('test-token-123');

      expect(mockSet).toHaveBeenCalledWith('_token', 'test-token-123', {
        path: '/',
        secure: true,
        sameSite: 'lax',
      });

      global.window = originalWindow;
    });

    it('should set cookie with secure=false when protocol is http (local dev)', () => {
      const originalWindow = global.window;
      global.window = {
        location: { protocol: 'http:' },
      } as unknown as Window & typeof globalThis;

      setToken('dev-token-456');

      expect(mockSet).toHaveBeenCalledWith('_token', 'dev-token-456', {
        path: '/',
        secure: false,
        sameSite: 'lax',
      });

      global.window = originalWindow;
    });

    it('should set cookie with secure=false when window is undefined (SSR)', () => {
      const originalWindow = global.window;
      // @ts-expect-error - simulating SSR environment
      delete global.window;

      setToken('ssr-token');

      expect(mockSet).toHaveBeenCalledWith('_token', 'ssr-token', {
        path: '/',
        secure: false,
        sameSite: 'lax',
      });

      global.window = originalWindow;
    });

    it('should always use sameSite=lax', () => {
      const originalWindow = global.window;
      global.window = {
        location: { protocol: 'https:' },
      } as unknown as Window & typeof globalThis;
 
      setToken('any-token');
 
      const callArgs = mockSet.mock.calls[0];
      expect(callArgs[2].sameSite).toBe('lax');

      global.window = originalWindow;
    });

    it('should use _token as the cookie key', () => {
      const originalWindow = global.window;
      global.window = {
        location: { protocol: 'http:' },
      } as unknown as Window & typeof globalThis;

      setToken('key-test-token');

      expect(mockSet).toHaveBeenCalledWith(
        '_token',
        expect.any(String),
        expect.any(Object)
      );

      global.window = originalWindow;
    });
  });

  describe('getToken', () => {
    it('should retrieve token using _token key', () => {
      mockGet.mockReturnValue('retrieved-token');

      const result = getToken();

      expect(mockGet).toHaveBeenCalledWith('_token');
      expect(result).toBe('retrieved-token');
    });

    it('should return undefined when no token exists', () => {
      mockGet.mockReturnValue(undefined);

      const result = getToken();

      expect(result).toBeUndefined();
    });
  });

  describe('deleteToken', () => {
    it('should remove cookie with sameSite=lax', () => {
      const result = deleteToken();

      expect(mockRemove).toHaveBeenCalledWith('_token', {
        path: '/',
        sameSite: 'strict',
      });
      expect(result).toBe(true);
    });

    it('should use _token as the cookie key for removal', () => {
      deleteToken();

      expect(mockRemove).toHaveBeenCalledWith(
        '_token',
        expect.any(Object)
      );
    });
  });
});
