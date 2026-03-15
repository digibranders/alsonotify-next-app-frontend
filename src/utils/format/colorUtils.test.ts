import { describe, it, expect } from 'vitest';
import { hexToRgba, DEFAULT_NOTE_COLOR } from './colorUtils';

describe('colorUtils', () => {
  describe('hexToRgba', () => {
    it('should convert 6-digit hex to rgba', () => {
      expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(hexToRgba('00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
    });

    it('should convert 3-digit hex to rgba', () => {
      expect(hexToRgba('#f00', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(hexToRgba('0f0', 1)).toBe('rgba(0, 255, 0, 1)');
    });

    it('should fallback to default color for invalid hex', () => {
       // Implementation falls back to red (255, 59, 59)
       // The colorUtils implementation returns rgba(255, 59, 59, 0.5)
       expect(hexToRgba('invalid', 0.5)).toBe('rgba(255, 59, 59, 0.5)');
       expect(hexToRgba('#xy,', 0.5)).toBe('rgba(255, 59, 59, 0.5)');
    });
  });

  describe('Constants', () => {
      it('should have a valid DEFAULT_NOTE_COLOR', () => {
          expect(DEFAULT_NOTE_COLOR).toBe('#ff3b3b');
      });
  });
});
