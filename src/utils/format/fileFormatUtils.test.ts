import { describe, it, expect } from 'vitest';
import { formatBytes } from './fileFormatUtils';

describe('fileFormatUtils', () => {
  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toContain('0');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toContain('500');
    });

    it('should format kilobytes', () => {
      const result = formatBytes(1024);
      expect(result).toContain('KB');
    });

    it('should format megabytes', () => {
      const result = formatBytes(1048576);
      expect(result).toContain('MB');
    });

    it('should format gigabytes', () => {
      const result = formatBytes(1073741824);
      expect(result).toContain('GB');
    });
  });
});
