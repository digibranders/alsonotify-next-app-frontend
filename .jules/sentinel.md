## 2024-05-24 - Misleading Security Comments vs. Implementation
**Vulnerability:** The function `sanitizeRichText` was documented as "Ensures links open in new tab and have noopener noreferrer", but the implementation merely *allowed* the `target` and `rel` attributes in `DOMPurify` configuration without enforcing them. This meant user-provided HTML could contain links opening in the same tab (phishing risk) or malicious `target="_blank"` links without `noopener` (tabnabbing risk).
**Learning:** Security comments can drift from implementation or be wishful thinking. Always verify security claims with tests (e.g., unit tests asserting the presence of security attributes) rather than trusting documentation.
**Prevention:** Use automated tests to verify security invariants. For HTML sanitization, use hooks or post-processing to *enforce* secure attributes rather than just allowing them.


## 2026-02-28 - [DOMPurify HTML Sanitization with Link Security Hooks]
**Vulnerability:** XSS and Link security issues when processing HTML for display.
**Learning:** `dangerouslySetInnerHTML` combined with manual HTML string reconstruction using `DOMParser().parseFromString()` to modify `a` tags bypasses proper sanitization and exposes mXSS vectors, even if `DOMPurify.sanitize` was initially used.
**Prevention:** Instead of using `DOMParser` after `DOMPurify`, leverage `DOMPurify.addHook('afterSanitizeAttributes', ...)` to safely mutate and enforce safe link behaviors (like `target="_blank"` and `rel="noopener noreferrer"`) directly during the sanitization phase, and then clear the hooks using `DOMPurify.removeAllHooks()`.
