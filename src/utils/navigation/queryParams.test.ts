import { describe, it, expect } from 'vitest';
import { toQueryParams } from './queryParams';

describe('queryParams', () => {
  describe('toQueryParams', () => {
    it('should return empty string for empty object', () => {
      expect(toQueryParams({})).toBe('');
    });

    it('should convert simple params', () => {
      const result = toQueryParams({ page: 1, limit: 10 });
      expect(result).toContain('page=1');
      expect(result).toContain('limit=10');
    });

    it('should filter out null values', () => {
      const result = toQueryParams({ page: 1, status: null });
      expect(result).toContain('page=1');
      expect(result).not.toContain('status');
    });

    it('should filter out undefined values', () => {
      const result = toQueryParams({ page: 1, status: undefined });
      expect(result).not.toContain('status');
    });

    it('should filter out empty string values', () => {
      const result = toQueryParams({ page: 1, search: '' });
      expect(result).not.toContain('search');
    });

    it('should filter out All value', () => {
      const result = toQueryParams({ page: 1, status: 'All' });
      expect(result).not.toContain('status');
    });

    it('should handle string values', () => {
      const result = toQueryParams({ search: 'hello' });
      expect(result).toContain('search=hello');
    });
  });
});
