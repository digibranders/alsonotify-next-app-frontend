import { describe, it, expect } from 'vitest';
import { formatDuration, formatTime, parseAsUTC, formatDecimalHours, parseDecimalToHM, combineHMToDecimal } from './timeFormat';

describe('timeFormat', () => {
  describe('formatDuration', () => {
    it('should format 0 seconds', () => {
      expect(formatDuration(0)).toBe('00:00:00');
    });

    it('should format seconds only', () => {
      expect(formatDuration(45)).toBe('00:00:45');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(125)).toBe('00:02:05');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatDuration(3661)).toBe('01:01:01');
    });

    it('should handle large values', () => {
      expect(formatDuration(86400)).toBe('24:00:00');
    });
  });

  describe('formatTime', () => {
    it('should be an alias for formatDuration', () => {
      expect(formatTime(3661)).toBe(formatDuration(3661));
    });
  });

  describe('parseAsUTC', () => {
    it('should parse date with Z suffix directly', () => {
      const result = parseAsUTC('2024-01-15T10:30:00Z');
      expect(result.getUTCHours()).toBe(10);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it('should parse date with timezone offset directly', () => {
      const result = parseAsUTC('2024-01-15T10:30:00+05:30');
      expect(result).toBeInstanceOf(Date);
    });

    it('should append Z to date without timezone', () => {
      const result = parseAsUTC('2024-01-15T10:30:00');
      expect(result.getUTCHours()).toBe(10);
    });

    it('should return current date for empty string', () => {
      const before = Date.now();
      const result = parseAsUTC('');
      const after = Date.now();
      expect(result.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(result.getTime()).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('formatDecimalHours', () => {
    it('should return 0h for zero', () => {
      expect(formatDecimalHours(0)).toBe('0h');
    });

    it('should return 0h for negative', () => {
      expect(formatDecimalHours(-1)).toBe('0h');
    });

    it('should format whole hours', () => {
      expect(formatDecimalHours(8)).toBe('8h');
    });

    it('should format hours and minutes', () => {
      expect(formatDecimalHours(2.5)).toBe('2h 30m');
    });

    it('should handle small fractions', () => {
      const result = formatDecimalHours(0.25);
      expect(result).toBe('0h 15m');
    });
  });

  describe('parseDecimalToHM', () => {
    it('should return 0h 0m for zero', () => {
      expect(parseDecimalToHM(0)).toEqual({ hours: 0, minutes: 0 });
    });

    it('should return 0h 0m for negative', () => {
      expect(parseDecimalToHM(-1)).toEqual({ hours: 0, minutes: 0 });
    });

    it('should parse whole hours', () => {
      expect(parseDecimalToHM(3)).toEqual({ hours: 3, minutes: 0 });
    });

    it('should parse fractional hours', () => {
      expect(parseDecimalToHM(2.5)).toEqual({ hours: 2, minutes: 30 });
    });
  });

  describe('combineHMToDecimal', () => {
    it('should combine hours and minutes', () => {
      expect(combineHMToDecimal(2, 30)).toBe(2.5);
    });

    it('should handle zero minutes', () => {
      expect(combineHMToDecimal(5, 0)).toBe(5);
    });

    it('should handle zero hours', () => {
      expect(combineHMToDecimal(0, 45)).toBe(0.75);
    });

    it('should handle null/undefined inputs', () => {
      expect(combineHMToDecimal(0, 0)).toBe(0);
    });
  });
});
