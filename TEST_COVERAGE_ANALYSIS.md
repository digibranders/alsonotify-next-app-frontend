# Test Coverage Analysis

## Current State

- **Test files**: 23
- **Tests**: 121 (all passing)
- **Statement coverage**: 32.47%
- **Branch coverage**: 28.09% (below 30% threshold)
- **Function coverage**: 23.27% (below 30% threshold)
- **Line coverage**: 32.85%

Both branch and function coverage currently **fail** the configured 30% thresholds.

---

## What's Tested Today

| Category | Tested | Total | Coverage |
|----------|--------|-------|----------|
| Components | 8 | 170+ | ~5% |
| Hooks | 2 | 30 | ~7% |
| Services | 3 | 24 | ~13% |
| Context providers | 1 | 4 | 25% |
| Utilities | 10 | 28 | ~36% |
| Lib/validators | 1 | 16 | ~6% |
| Pages/routes | 0 | 35 | 0% |

### Tested files
- **Components**: PaginationBar, DebouncedSearchInput, FeedbackWidget, NotificationPanel, ProfileCompletionBanner, RichTextEditor, StepRow, TaskStatusBadge
- **Hooks**: useAuth, useTaskActivity
- **Services**: auth, cookies, task-activity
- **Context**: TimerContext
- **Utils**: colorUtils, currencyUtils, sanitizeHtml, sanitizeUrl, roleUtils, validation
- **Lib**: taxIdValidators
- **Config**: axios
- **Other**: security-headers

---

## Priority Areas for Test Improvement

### 1. Workflow Engine (Critical - 0-20% coverage)

The workflow system (`src/lib/workflow/`) drives requirement and task state machines, CTAs, and business rules. It has near-zero coverage despite being core business logic.

**Files to test:**
- `src/lib/workflow/requirement/requirementCTA.ts` — 0% coverage, 790 lines
- `src/lib/workflow/requirement/requirementWorkflow.ts` — 20% coverage
- `src/lib/workflow/requirement/requirementTab.ts` — 0% coverage
- `src/lib/workflow/requirement/requirementOverdue.ts` — 8% coverage
- `src/lib/workflow/requirement/requirementModal.ts` — 14% coverage
- `src/lib/workflow/task/taskCTA.ts` — 0% coverage
- `src/lib/workflow/task/taskWorkflow.ts` — 20% coverage
- `src/lib/workflow/rollup/statusRollup.ts` — 0% coverage

**Why**: These are pure functions with complex branching logic that determines what actions users can take. They are highly testable (no DOM, no network) and bugs here silently break UX. This is the single highest-ROI area to test.

**Estimated impact**: Adding tests here would significantly boost branch and function coverage thresholds past 30%.

---

### 2. Services Layer (21% statement coverage)

Most API service modules have zero tests. The auth and cookies services are tested, but the rest are not.

**High-priority files:**
- `src/services/task.ts` — 7% coverage, largest service file
- `src/services/user.ts` — 29% coverage
- `src/services/notification.ts` — 33% coverage
- `src/services/feedback.ts` — 50% coverage
- `src/services/calendar.ts` — 0%
- `src/services/invoice.ts` — 0%
- `src/services/leave.ts` — 0%
- `src/services/requirement-activity.ts` — 0%
- `src/services/workspace.ts` — 0%

**Why**: Services define the contract between frontend and backend. Testing them (with mocked axios) catches payload shape errors, URL construction bugs, and auth header issues before they reach production.

---

### 3. Custom Hooks (44% statement coverage, only 2 of 30 tested)

Most hooks contain React Query integration, state management, and derived data logic.

**High-priority files:**
- `src/hooks/useUser.ts` — 29% coverage, used widely
- `src/hooks/useNotification.ts` — 23% coverage
- `src/hooks/useBreakpoint.ts` — 12% coverage
- `src/hooks/useRequirement.ts` — 0%
- `src/hooks/useTask.ts` — 0%
- `src/hooks/useLeave.ts` — 0%
- `src/hooks/useCalendar.ts` — 0%
- `src/hooks/useWebSocket.ts` — 0%
- `src/hooks/useDebounce.ts` — 100% (only covered transitively, no dedicated test)

**Why**: Hooks orchestrate data fetching and mutations. Testing them ensures correct React Query key usage, optimistic updates, and error handling.

---

### 4. Date/Time Utilities (28% statement coverage)

- `src/utils/date/date.ts` — 21% coverage with many untested branches

**Why**: Date logic is notoriously bug-prone, especially with timezone handling. The `useTimezone` hook and date utility functions affect display throughout the app.

---

### 5. Security Utilities (55% statement coverage)

- `src/utils/security/sanitizeHtml.ts` — 43% coverage (lines 45-54, 109-152 uncovered)
- `src/utils/security/sanitizeUrl.ts` — 93% (nearly complete)

**Why**: Security-critical code should have near-100% coverage. The untested sanitizeHtml paths could allow XSS.

---

### 6. Query Keys (`src/lib/queryKeys.ts` — 5% coverage)

This file defines all React Query cache keys. While simple, incorrect keys cause stale data bugs that are hard to diagnose.

---

### 7. Notification Cache Utils (6% coverage)

`src/utils/notificationCacheUtils.ts` manages optimistic notification updates. Bugs here cause UI inconsistencies.

---

### 8. Mapper Utilities (79% via transitive coverage only)

`src/utils/mappers/` transforms API responses to domain models. Only `user.ts` has partial transitive coverage. The rest (task, requirement, workspace, note) have no dedicated tests.

**Why**: Mapper bugs silently corrupt data displayed to users.

---

## Recommended Action Plan

### Phase 1 — Meet the 30% thresholds (quick wins)
1. **Workflow engine tests** — Pure functions, no mocking needed. Focus on `requirementCTA.ts`, `taskCTA.ts`, `statusRollup.ts`
2. **Expand sanitizeHtml tests** — Cover the uncovered branches (lines 45-54, 109-152)
3. **Add mapper tests** — Simple input/output, high confidence

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

The current thresholds in `vitest.config.ts` are set to 30% for all metrics. Both branch (28.09%) and function (23.27%) coverage currently fail. The Phase 1 recommendations above should bring both metrics above 30%.
