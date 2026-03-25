import { describe, it, expect } from 'vitest';
import { trimStr } from './trim';

describe('trimStr', () => {
  it('should trim whitespace from string', () => {
    expect(trimStr('  hello  ')).toBe('hello');
  });

  it('should return empty string for null', () => {
    expect(trimStr(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(trimStr(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(trimStr('')).toBe('');
  });

  it('should return empty string for whitespace-only string', () => {
    expect(trimStr('   ')).toBe('');
  });

  it('should not modify already trimmed string', () => {
    expect(trimStr('hello')).toBe('hello');
  });
});
