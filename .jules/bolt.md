## 2026-02-27 - [Memoize expensive Array filters in React components]
**Learning:** Found an expensive calculation running on every render in `PartnersPage.tsx` (`partners.filter(...)` with `.toLowerCase()`, `split()`, `map()`, etc. inside). It's a performance bottleneck for large datasets and re-runs even when only unrelated state changes.
**Action:** Use `useMemo` to cache the filtered array when doing expensive text-based searches and filters in components that have high render frequency.
