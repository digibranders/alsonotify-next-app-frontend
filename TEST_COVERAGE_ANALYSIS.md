# Test Coverage Analysis

## Current State

_Regenerated from `pnpm vitest run --coverage` on 2026-09-07. The figures below
this line were previously 60 files / 623 tests, which had drifted._

- **Test files**: 73
- **Tests**: 813 (all passing)
- **Statement coverage**: 58.83%
- **Branch coverage**: 57.24%
- **Function coverage**: 51.77%
- **Line coverage**: 59.75%

All metrics **pass** the configured 30% thresholds.

### Previous State

- Test files: 23 → **73** (+50)
- Tests: 121 → **813** (+692)
- Statements: 32.47% → **58.83%**
- Branches: 28.09% → **57.24%**
- Functions: 23.27% → **51.77%**
- Lines: 32.85% → **59.75%**

_The middle column of this table used to read 60 / 623 / 56.68% etc. Those were
a real measurement, just an old one._

---

## What's Tested Today

| Category | Test files | Note |
|----------|-----------:|------|
| Components | 14 | |
| Hooks | 8 | |
| Services | 13 | |
| Context providers | 1 | |
| Utilities | 20 | includes 4 mapper suites |
| Lib | 11 | includes 8 workflow-engine suites |
| **Total** | **73** | 813 tests |

_Counted on disk 2026-09-07. The previous version of this table claimed 8
component, 2 hook and 3 service test files with "~5%" style percentages; those
were hand-maintained and had drifted badly. Counting files is verifiable; the
per-category percentages were not, so they are dropped rather than guessed at._

---

## Priority Areas for Test Improvement

_Rewritten 2026-09-07. Every gap this section previously named — the workflow
engine, `queryKeys` at 5%, `notificationCacheUtils` at 6%, four zero-coverage
services and four untested mappers — now has a dedicated test file. Those
entries are removed rather than left standing as open work that is done._

Remaining, in rough order of value:

1. **Pages and routes — still 0%.** 35 route files, none with tests. The
   highest-count gap by far, and the hardest, since they need router and
   provider scaffolding.
2. **`queryKeys.ts` — 33% statements.** It has a test file now, but the key
   factories at lines 58-93 are still unexercised. A wrong cache key produces
   stale UI with no error, so this is worth finishing.
3. **Modal and form components.** TaskForm, LeaveApplyModal, RequirementsForm —
   user-facing validation, currently untested.
4. ~~**The `<style>` handling in `sanitizeEmailHtml`**~~ — fixed 2026-09-07, see
   the section at the end of this document. It was unreachable code, not a test
   gap; it is now live and covered.

---

## Recommended Action Plan

### Phase 1 — Meet the 30% thresholds (quick wins)
_All three Phase 1 items are **done**, verified 2026-09-07 by the presence of the
test files and by coverage output:_

1. ~~**Workflow engine tests**~~ — done. `requirementCTA`, `requirementWorkflow`
   and the rest of `src/lib/workflow/` now have dedicated test files.
2. ~~**Expand sanitizeHtml tests**~~ — done. `sanitizeEmailHtml` had **zero**
   tests; it now has 13, taking the module from 53.44% to **70.68%** statements.
   (The old line references 45-54 / 109-152 were stale and pointed at the wrong
   functions.)
3. ~~**Add mapper tests**~~ — done. task, requirement, workspace and note
   mappers all have test files.

### Phase 2 — Protect critical paths
4. **Service layer tests** for `task.ts`, `user.ts`, `invoice.ts` with mocked axios
5. **Hook tests** for `useTask`, `useRequirement`, `useUser` with React Query test utils
6. **Date utility tests** covering timezone edge cases

### Phase 3 — Component coverage
7. **Modal/form components** — TaskForm, LeaveApplyModal, RequirementsForm (user-facing forms with validation)
8. **Feature page components** — TasksPage, LeavesPage, FinancePage (integration-style tests)
9. **Layout components** — AppShell, Sidebar, Topbar (navigation behavior)

---

## Coverage Configuration Note

The thresholds in `vitest.config.ts` are 30% for all metrics. **All four now
pass** — branch is 57.24% and function 51.77%, against the 28.09% / 23.27% this
document previously recorded as failing. Those figures were from before the
Phase 1 work landed.

---

## The one real remaining gap in this area

`sanitizeEmailHtml` feeds both the iframe `srcDoc` and the MailPage body. Until
2026-09-07 it had **no tests at all** while the rest of its module sat around
53%.

**Both recorded XSS findings against this module are genuinely fixed in the
code.** This was a *coverage* gap, not a live vulnerability — the sanitiser
strips scripts, `on*` handlers and `javascript:` URLs correctly, and the new
tests assert each of those. The risk was that a refactor could have reopened
them silently.

### Two bugs found and fixed while writing those tests

**1. The `<style>` handling never ran.** `sanitizeHtml.ts` set
`ADD_TAGS: ['style']` with the comment *"Allow `<style>` tags for email layout
(Outlook/marketing emails depend on them)"*, then spent ~20 lines scoping those
blocks under `.mail-html`. All of it was dead.

The cause was neither `ADD_TAGS` nor `USE_PROFILES`: without `FORCE_BODY`, the
HTML parser hoists a leading `<style>` into `<head>`, and DOMPurify returns only
body content — so the element was dropped before the scoping regex ever saw it.
Adding `FORCE_BODY: true` makes the documented intent real. Marketing and
Outlook emails now render with their styles, scoped so they cannot restyle the
app around them.

**2. Enabling it exposed a bug in the scoping regex.** The old pattern
`/([^\s@{}][^{}]*?)\{/g` excluded `@` only at the first character it tried, so
for `@media print {` it began matching one character later and emitted
`@.mail-html media print {` — invalid CSS that drops the whole block. The
at-rule guard never fired, because the captured selector was `media print`, not
`@media print`. The pattern now anchors the prelude to the start of the
stylesheet or a preceding brace and rejects one beginning with `@`, so at-rules
survive intact while the rules **nested inside them** are still scoped.

Both fixes are independently guarded: removing `FORCE_BODY` fails 6 tests,
reverting the regex fails 2. Because the style path is live now, its CSS
sanitising is covered too — `expression()`, `behavior:`, `-moz-binding`,
`@import`, `javascript:` URLs and cross-origin (including protocol-relative)
`url()` all have tests.

Module coverage went 53.44% → **82.75%** statements, **88.46%** lines. The
previously unreachable block at lines 169-183 is now exercised; the only
uncovered region left is the server-side jsdom fallback.
