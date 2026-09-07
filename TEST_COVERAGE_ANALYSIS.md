# Test Coverage Analysis

## Current State

_Regenerated from `pnpm vitest run --coverage` on 2026-09-07. The figures below
this line were previously 60 files / 623 tests, which had drifted._

- **Test files**: 73
- **Tests**: 806 (all passing)
- **Statement coverage**: 58.83%
- **Branch coverage**: 57.24%
- **Function coverage**: 51.77%
- **Line coverage**: 59.75%

All metrics **pass** the configured 30% thresholds.

### Previous State

- Test files: 23 → **73** (+50)
- Tests: 121 → **806** (+685)
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
| **Total** | **73** | 806 tests |

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
4. **The `<style>` handling in `sanitizeEmailHtml`** — see the section at the
   end of this document. Not a test gap: the code is unreachable.

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

### Found while writing those tests

`sanitizeHtml.ts:150-183` sets `ADD_TAGS: ['style']` with the comment *"Allow
`<style>` tags for email layout (Outlook/marketing emails depend on them)"*, and
then ~20 lines scope those blocks under `.mail-html`.

**That scoping code is unreachable.** DOMPurify with
`USE_PROFILES: { html: true }` removes the `<style>` element and its contents
regardless of `ADD_TAGS`, so the regex never has a block to rewrite:

```
sanitizeEmailHtml('<style>body{color:red}</style><p>x</p>', true) === '<p>x</p>'
```

Coverage confirms it — lines 169-183 are the only part of the function still
uncovered, because they cannot execute.

- **Security impact: none.** Stripping `<style>` is the safer direction.
- **Functional impact: real.** Marketing and Outlook emails that rely on
  `<style>` render unstyled, which is the opposite of the stated intent.

Not fixed here: making `<style>` survive is a behaviour change in the riskier
direction and belongs in its own task with its own review. The tests assert the
current behaviour and are written to fail if `<style>` ever starts surviving, so
the dead branch cannot come alive unnoticed.
