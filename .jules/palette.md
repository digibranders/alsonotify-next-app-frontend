## 2024-05-24 - Misleading Security Comments vs. Implementation
**Vulnerability:** The function `sanitizeRichText` was documented as "Ensures links open in new tab and have noopener noreferrer", but the implementation merely *allowed* the `target` and `rel` attributes in `DOMPurify` configuration without enforcing them. This meant user-provided HTML could contain links opening in the same tab (phishing risk) or malicious `target="_blank"` links without `noopener` (tabnabbing risk).
**Learning:** Security comments can drift from implementation or be wishful thinking. Always verify security claims with tests (e.g., unit tests asserting the presence of security attributes) rather than trusting documentation.
**Prevention:** Use automated tests to verify security invariants. For HTML sanitization, use hooks or post-processing to *enforce* secure attributes rather than just allowing them.

## 2024-05-24 - Missing ARIA Labels for Active Tabs
**Learning:** Found multiple tab components in `TabBar.tsx` and `PageLayout.tsx` that did not have `aria-current="page"` for the active tab state. This means screen readers could not determine which tab was currently selected.
**Action:** Added `aria-current={activeTab === tab.id ? 'page' : undefined}` to all tab buttons. Always remember to provide a programmatic state for visually active elements like tabs and pagination.
