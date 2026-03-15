import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from './sanitizeUrl';

describe('sanitizeUrl', () => {
  it('should allow basic safe protocols', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('should block javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl(' javascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('java\nscript:alert(1)')).toBe('about:blank');
  });

  it('should block vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('about:blank');
  });

  it('should block data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('about:blank');
  });

  it('should allow relative paths', () => {
    expect(sanitizeUrl('/path/to/resource')).toBe('/path/to/resource');
    expect(sanitizeUrl('#section')).toBe('#section');
    expect(sanitizeUrl('?query=val')).toBe('?query=val');
  });

  it('should handle blob: protocol which is required for preview', () => {
    expect(sanitizeUrl('blob:http://localhost:3000/1234-5678')).toBe('blob:http://localhost:3000/1234-5678');
  });

  it('should return undefined for empty or null input', () => {
    expect(sanitizeUrl(null)).toBe(undefined);
    expect(sanitizeUrl(undefined)).toBe(undefined);
    expect(sanitizeUrl('')).toBe(undefined);
    expect(sanitizeUrl('   ')).toBe(undefined);
  });
});
