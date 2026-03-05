## 2024-05-24 - Misleading Security Comments vs. Implementation
**Vulnerability:** The function `sanitizeRichText` was documented as "Ensures links open in new tab and have noopener noreferrer", but the implementation merely *allowed* the `target` and `rel` attributes in `DOMPurify` configuration without enforcing them. This meant user-provided HTML could contain links opening in the same tab (phishing risk) or malicious `target="_blank"` links without `noopener` (tabnabbing risk).
**Learning:** Security comments can drift from implementation or be wishful thinking. Always verify security claims with tests (e.g., unit tests asserting the presence of security attributes) rather than trusting documentation.
**Prevention:** Use automated tests to verify security invariants. For HTML sanitization, use hooks or post-processing to *enforce* secure attributes rather than just allowing them.

## 2024-05-24 - Missing ARIA Labels for Active Tabs
**Learning:** Found multiple tab components in `TabBar.tsx` and `PageLayout.tsx` that did not have `aria-current="page"` for the active tab state. This means screen readers could not determine which tab was currently selected.
**Action:** Added `aria-current={activeTab === tab.id ? 'page' : undefined}` to all tab buttons. Always remember to provide a programmatic state for visually active elements like tabs and pagination.

## 2024-05-24 - Inaccessible Hover-Only Actions on Dashboard Cards
**Learning:** In widget cards like `NotesWidget` and `TodoWidget`, action buttons (e.g., delete, archive, menu) were completely hidden (`opacity-0`) until the parent card was hovered (`group-hover:opacity-100`). While this looks clean visually, it made these actions entirely inaccessible to keyboard users because they couldn't see the buttons when tabbing through the interface, and the screen reader focus wouldn't trigger the hover state. Furthermore, these icon-only buttons lacked `aria-label` attributes.
**Action:** Fixed by combining `focus-within:opacity-100` (or `focus-visible:opacity-100`) with the existing hover states to ensure buttons become visible when a user tabs into them. Additionally added missing `aria-label`s and `focus-visible:ring-2` to make the keyboard focus state obvious.
