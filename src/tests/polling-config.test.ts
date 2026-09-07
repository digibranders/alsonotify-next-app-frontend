import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * TanStack Query keeps polling in a HIDDEN tab unless told not to. A
 * backgrounded dashboard therefore hit the API every 30s forever: battery drain
 * on mobile, and load the backend is doing nothing useful with.
 *
 * Query already refetches on window focus, so pausing while hidden costs
 * nothing — the user sees fresh data the moment they look at it again.
 *
 * This is a source-level guard rather than a runtime one because the failure is
 * invisible at runtime: nothing breaks, the app just quietly wastes requests.
 * A lint rule cannot express "these two options must appear together" either.
 */

const SRC = resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.next', 'tests']);

function collectSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectSources(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Comments discussing polling are not polling. MeetingsWidget, for one,
 * documents the intervals its hooks use, which would otherwise be counted as
 * two unguarded queries that do not exist.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** `refetchIntervalInBackground` contains `refetchInterval` as a substring. */
const countPolling = (src: string) =>
  (stripComments(src).match(/refetchInterval(?!InBackground)\s*[,:]/g) ?? []).length;

const countGuards = (src: string) =>
  (stripComments(src).match(/refetchIntervalInBackground\s*:/g) ?? []).length;

describe('polling configuration', () => {
  const files = collectSources(SRC);

  it('finds the polling queries at all (guards against a regex that matches nothing)', () => {
    const total = files.reduce((n, f) => n + countPolling(readFileSync(f, 'utf8')), 0);
    expect(total).toBeGreaterThan(0);
  });

  it('every query that polls also opts out of polling in a background tab', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const polls = countPolling(source);
      if (polls === 0) continue;

      const guarded = countGuards(source);
      if (polls > guarded) {
        offenders.push(`${file.replace(SRC, 'src')} (${polls} polling, ${guarded} guarded)`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
