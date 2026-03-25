import { describe, it, expect } from 'vitest';
import { isRecord, getString, getNumber, getArray, getBoolean } from './guards';

describe('isRecord', () => {
  it('should return true for plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('should return false for arrays', () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2])).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isRecord('string')).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});

describe('getString', () => {
  it('should return string value for string properties', () => {
    expect(getString({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('should return undefined for non-string properties', () => {
    expect(getString({ count: 42 }, 'count')).toBeUndefined();
  });

  it('should return undefined for missing keys', () => {
    expect(getString({}, 'missing')).toBeUndefined();
  });
});

describe('getNumber', () => {
  it('should return number value for number properties', () => {
    expect(getNumber({ count: 42 }, 'count')).toBe(42);
  });

  it('should return undefined for non-number properties', () => {
    expect(getNumber({ name: 'Alice' }, 'name')).toBeUndefined();
  });

  it('should return undefined for missing keys', () => {
    expect(getNumber({}, 'missing')).toBeUndefined();
  });
});

describe('getArray', () => {
  it('should return array value for array properties', () => {
    expect(getArray({ items: [1, 2, 3] }, 'items')).toEqual([1, 2, 3]);
  });

  it('should return undefined for non-array properties', () => {
    expect(getArray({ name: 'Alice' }, 'name')).toBeUndefined();
  });

  it('should return undefined for missing keys', () => {
    expect(getArray({}, 'missing')).toBeUndefined();
  });

  it('should return empty array for empty array property', () => {
    expect(getArray({ items: [] }, 'items')).toEqual([]);
  });
});

describe('getBoolean', () => {
  it('should return boolean value for boolean properties', () => {
    expect(getBoolean({ active: true }, 'active')).toBe(true);
    expect(getBoolean({ active: false }, 'active')).toBe(false);
  });

  it('should return undefined for non-boolean properties', () => {
    expect(getBoolean({ name: 'Alice' }, 'name')).toBeUndefined();
  });

  it('should return undefined for missing keys', () => {
    expect(getBoolean({}, 'missing')).toBeUndefined();
  });
});
