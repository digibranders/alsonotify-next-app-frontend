import { describe, it, expect } from 'vitest';
import { getCurrencySymbol } from './currencyUtils';

describe('currencyUtils', () => {
  describe('getCurrencySymbol', () => {
    it('should return correct symbols for known currencies', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('INR')).toBe('₹');
      expect(getCurrencySymbol('JPY')).toBe('¥');
      expect(getCurrencySymbol('AUD')).toBe('A$');
      expect(getCurrencySymbol('CAD')).toBe('C$');
      expect(getCurrencySymbol('CNY')).toBe('¥');
    });

    it('should return the code itself for unknown currencies', () => {
      expect(getCurrencySymbol('XYZ')).toBe('XYZ');
      expect(getCurrencySymbol('BTC')).toBe('BTC');
      expect(getCurrencySymbol('')).toBe('');
    });
  });
});
