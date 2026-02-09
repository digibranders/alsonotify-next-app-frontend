'use client';

import { useEffect } from 'react';
import { initCalendarEmptyRowPolyfill } from '@/utils/calendarPolyfill';

/**
 * Prevent mouse wheel from changing value when focus is inside a number input.
 * Uses capture phase and passive: false only for this handler so preventDefault works.
 */
function preventWheelOnNumberInput(e: WheelEvent) {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    e.preventDefault();
  }
}

export function BrowserPolyfills() {
  useEffect(() => {
    const cleanup = initCalendarEmptyRowPolyfill();
    return cleanup;
  }, []);

  useEffect(() => {
    document.addEventListener('wheel', preventWheelOnNumberInput, { passive: false, capture: true });
    return () => {
      document.removeEventListener('wheel', preventWheelOnNumberInput, { capture: true });
    };
  }, []);

  return null;
}

export default BrowserPolyfills;
