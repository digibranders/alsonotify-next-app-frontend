import { describe, it, expect } from 'vitest';
import { isStaleActionError } from './notificationCacheUtils';

describe('notificationCacheUtils', () => {
  describe('isStaleActionError', () => {
    it('should return true for 403 error', () => {
      const error = { response: { status: 403 } };
      expect(isStaleActionError(error)).toBe(true);
    });

    it('should return true for 409 error', () => {
      const error = { response: { status: 409 } };
      expect(isStaleActionError(error)).toBe(true);
    });

    it('should return true for 400 error', () => {
      const error = { response: { status: 400 } };
      expect(isStaleActionError(error)).toBe(true);
    });

    it('should return false for 500 error', () => {
      const error = { response: { status: 500 } };
      expect(isStaleActionError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isStaleActionError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isStaleActionError(undefined)).toBe(false);
    });

    it('should return false for error without response', () => {
      expect(isStaleActionError(new Error('network'))).toBe(false);
    });
  });
});
