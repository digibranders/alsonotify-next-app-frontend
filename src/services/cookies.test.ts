import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAuthFlag, isAuthenticated, clearAuthFlag } from './cookies';

describe('cookies (auth flag)', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockStorage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] ?? null);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete mockStorage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setAuthFlag', () => {
    it('should set isAuthenticated flag in localStorage', () => {
      setAuthFlag();
      expect(localStorage.setItem).toHaveBeenCalledWith('isAuthenticated', '1');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when flag is set', () => {
      mockStorage['isAuthenticated'] = '1';
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when flag is not set', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when flag has unexpected value', () => {
      mockStorage['isAuthenticated'] = 'false';
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('clearAuthFlag', () => {
    it('should remove isAuthenticated flag from localStorage', () => {
      mockStorage['isAuthenticated'] = '1';
      clearAuthFlag();
      expect(localStorage.removeItem).toHaveBeenCalledWith('isAuthenticated');
    });
  });
});
