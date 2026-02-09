'use client';

import { useState, useEffect } from 'react';

/**
 * Tailwind default breakpoints (min-width).
 * Use for JS-driven responsive behavior (e.g. showing hamburger when sidebar is hidden).
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Returns whether the viewport is at or above the given breakpoint (min-width).
 * Matches Tailwind's lg: (1024px) when breakpoint === 'lg'.
 * SSR-safe: defaults to true for 'lg' so desktop layout is used until client hydrates.
 */
export function useBreakpoint(breakpoint: BreakpointKey = 'lg'): boolean {
  const minWidth = BREAKPOINTS[breakpoint];

  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return breakpoint === 'lg';
    }
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const handler = () => setMatches(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [minWidth]);

  return matches;
}

/**
 * Returns true when viewport is below the given breakpoint (e.g. "narrow" / mobile).
 * Convenience for components that care about "mobile or not" (lg = 1024px).
 */
export function useIsNarrow(breakpoint: BreakpointKey = 'lg'): boolean {
  return !useBreakpoint(breakpoint);
}
