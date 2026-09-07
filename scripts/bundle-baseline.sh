#!/usr/bin/env bash
# Snapshot shipped JS size. Run before and after each optimisation task, so
# every claim in a perf commit is a measurement rather than an estimate.
#
# Usage: bash scripts/bundle-baseline.sh <label>
#
# WHICH NUMBER MATTERS
# --------------------
# The total across all chunks is the WRONG metric for code-splitting: moving a
# library behind next/dynamic leaves the total unchanged (it actually grows
# slightly, from the extra loader chunk) while cutting what a given route
# downloads before it can paint. So this reports per-route FIRST-LOAD JS as the
# headline, with the total kept only as a check on genuinely removed code.
#
# Next 16 with Turbopack does not print per-route sizes, but statically
# prerendered routes list their own scripts in the emitted HTML, which is
# exactly the first-load set.
set -euo pipefail
cd "$(dirname "$0")/.."

LABEL="${1:-baseline}"
OUT="bundle-report-${LABEL}.txt"

echo "Building..."
pnpm run build > "/tmp/bundle-build-${LABEL}.log" 2>&1 || {
  echo "BUILD FAILED — see /tmp/bundle-build-${LABEL}.log" >&2
  tail -30 "/tmp/bundle-build-${LABEL}.log" >&2
  exit 1
}

{
  echo "=== Bundle report: ${LABEL} ==="
  echo
  echo "--- First-load JS per route (gzipped) ---"
  python3 - <<'PY'
import re, gzip, os, glob

ROUTES = [
    ('/', '.next/server/app/index.html'),
    ('/login', '.next/server/app/login.html'),
    ('/register', '.next/server/app/register.html'),
    ('/dashboard', '.next/server/app/dashboard.html'),
    ('/dashboard/finance/pnl', '.next/server/app/dashboard/finance/pnl.html'),
    ('/dashboard/requirements', '.next/server/app/dashboard/requirements.html'),
]

for label, path in ROUTES:
    if not os.path.exists(path):
        print(f'  {label:32s} (not prerendered)')
        continue
    html = open(path, encoding='utf8').read()
    srcs = sorted(set(re.findall(r'/_next/(static/[^"\']+?\.js)', html)))
    raw = gz = 0
    for s in srcs:
        f = os.path.join('.next', s)
        if not os.path.exists(f):
            continue
        b = open(f, 'rb').read()
        raw += len(b)
        gz += len(gzip.compress(b, 6))
    print(f'  {label:32s} {gz/1024:8.1f} KB gz  ({raw/1024:7.1f} KB raw, {len(srcs)} files)')
PY

  echo
  echo "--- Total JS emitted (all chunks, gzipped) ---"
  find .next/static/chunks -name '*.js' -exec sh -c 'gzip -c "$1" | wc -c' _ {} \; \
    | awk '{s+=$1} END {printf "  %.1f KB\n", s/1024}'

  echo
  echo "--- Total JS emitted (all chunks, uncompressed) ---"
  find .next/static/chunks -name '*.js' -exec cat {} + | wc -c \
    | awk '{printf "  %.1f KB\n", $1/1024}'

  echo
  echo "--- 15 largest chunks (KB, uncompressed) ---"
  find .next/static/chunks -name '*.js' -exec du -k {} + | sort -rn | head -15

  echo
  echo "--- Chunk count ---"
  find .next/static/chunks -name '*.js' | wc -l | tr -d ' '
} | tee "$OUT"

echo
echo "Saved to ${OUT}"
