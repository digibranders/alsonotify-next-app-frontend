import { describe, it, expect, vi, afterEach } from 'vitest';
import { cn, debounce } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should handle Tailwind conflicts', () => {
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
    });
  });

  describe('debounce', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should delay function execution', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 300);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 300);

      debounced();
      vi.advanceTimersByTime(200);
      debounced();
      vi.advanceTimersByTime(200);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should support cancel', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 300);

      debounced();
      debounced.cancel();
      vi.advanceTimersByTime(300);

      expect(fn).not.toHaveBeenCalled();
    });
  });
});
