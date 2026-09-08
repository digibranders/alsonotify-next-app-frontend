/**
 * The PDF export banded occupancy at >= 70 while EmployeeDetailsDrawer and
 * docs/kpi-calculations.html both use >= 90 Excellent / >= 75 Good / < 75 Low.
 * The same employee therefore read Low on screen and green in the PDF.
 */
import { describe, it, expect } from 'vitest';
import { kpiBand, KPI_THRESHOLDS } from './kpiThresholds';

describe('KPI banding', () => {
  it('matches the documented boundaries', () => {
    expect(KPI_THRESHOLDS.excellent).toBe(90);
    expect(KPI_THRESHOLDS.good).toBe(75);
  });

  it('bands 72 as low, the case that differed between PDF and screen', () => {
    expect(kpiBand(72)).toBe('low');
  });

  it('treats the boundary values as inclusive', () => {
    expect(kpiBand(90)).toBe('excellent');
    expect(kpiBand(75)).toBe('good');
    expect(kpiBand(74.9)).toBe('low');
  });

  it('bands the old PDF efficiency cutoffs consistently too', () => {
    // The PDF used >= 75 green / >= 50 blue / else red for efficiency, so 60
    // read blue there and low on screen.
    expect(kpiBand(60)).toBe('low');
    expect(kpiBand(95)).toBe('excellent');
  });

  it('handles the extremes without special-casing', () => {
    expect(kpiBand(0)).toBe('low');
    expect(kpiBand(100)).toBe('excellent');
  });
});

/**
 * EmployeeDetailsDrawer referenced var(--font-size-2xs), which is defined
 * nowhere — the real token is --text-2xs (styles/globals.css:8). An undefined
 * custom property silently falls back to the inherited size, so this kind of
 * typo produces no error and no visible failure in tests.
 */
describe('CSS custom properties referenced by the reports feature', () => {
  it('every var(--token) used in the feature is defined in globals.css', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');

    const root = resolve(__dirname, '../../..');
    const css = readFileSync(join(root, 'styles/globals.css'), 'utf8');
    const defined = new Set(
      [...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]),
    );

    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((e) => {
        const p = join(dir, e);
        return statSync(p).isDirectory()
          ? walk(p)
          // Exclude test files: this one mentions the bad token in its own
          // docblock and carries the matching regex as a literal.
          : /\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e) ? [p] : [];
      });

    const undefinedTokens: string[] = [];
    for (const file of walk(join(root, 'components/features/reports'))) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/var\((--[a-zA-Z0-9-]+)/g)) {
        if (!defined.has(m[1])) undefinedTokens.push(`${m[1]} in ${file.replace(root, 'src')}`);
      }
    }

    expect(undefinedTokens).toEqual([]);
  });
});
