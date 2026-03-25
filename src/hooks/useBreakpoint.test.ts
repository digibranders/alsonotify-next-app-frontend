import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBreakpoint, useIsNarrow } from './useBreakpoint';

describe('useBreakpoint', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should return a boolean', () => {
    const { result } = renderHook(() => useBreakpoint());
    expect(typeof result.current).toBe('boolean');
  });

  it('should accept different breakpoint keys', () => {
    const { result: sm } = renderHook(() => useBreakpoint('sm'));
    const { result: lg } = renderHook(() => useBreakpoint('lg'));
    expect(typeof sm.current).toBe('boolean');
    expect(typeof lg.current).toBe('boolean');
  });
});

describe('useIsNarrow', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should return a boolean', () => {
    const { result } = renderHook(() => useIsNarrow());
    expect(typeof result.current).toBe('boolean');
  });
});
