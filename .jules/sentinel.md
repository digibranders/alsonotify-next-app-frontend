## 2024-05-24 - Misleading Security Comments vs. Implementation
**Vulnerability:** The function `sanitizeRichText` was documented as "Ensures links open in new tab and have noopener noreferrer", but the implementation merely *allowed* the `target` and `rel` attributes in `DOMPurify` configuration without enforcing them. This meant user-provided HTML could contain links opening in the same tab (phishing risk) or malicious `target="_blank"` links without `noopener` (tabnabbing risk).
**Learning:** Security comments can drift from implementation or be wishful thinking. Always verify security claims with tests (e.g., unit tests asserting the presence of security attributes) rather than trusting documentation.
**Prevention:** Use automated tests to verify security invariants. For HTML sanitization, use hooks or post-processing to *enforce* secure attributes rather than just allowing them.


## 2026-02-28 - [DOMPurify HTML Sanitization with Link Security Hooks]
**Vulnerability:** XSS and Link security issues when processing HTML for display.
**Learning:** `dangerouslySetInnerHTML` combined with manual HTML string reconstruction using `DOMParser().parseFromString()` to modify `a` tags bypasses proper sanitization and exposes mXSS vectors, even if `DOMPurify.sanitize` was initially used.
**Prevention:** Instead of using `DOMParser` after `DOMPurify`, leverage `DOMPurify.addHook('afterSanitizeAttributes', ...)` to safely mutate and enforce safe link behaviors (like `target="_blank"` and `rel="noopener noreferrer"`) directly during the sanitization phase, and then clear the hooks using `DOMPurify.removeAllHooks()`.

## 2025-02-28 - [DOMPurify Configuration Drift Causing XSS]
**Vulnerability:** The email reading components used `DOMPurify` with `USE_PROFILES: { html: true }` but failed to explicitly forbid dangerous tags (`script`, `iframe`, `object`, etc.) and attributes (`on*`, `formaction`, etc.) that are typically blocked by default but might be permitted depending on the profile or context. This allowed potential Cross-Site Scripting (XSS) when rendering emails via `dangerouslySetInnerHTML`.
**Learning:** When using `dangerouslySetInnerHTML`, especially with complex configurations like `USE_PROFILES: { html: true }`, you must explicitly forbid dangerous tags and attributes (`FORBID_TAGS`, `FORBID_ATTR`) to maintain a defense-in-depth posture. Do not assume default profiles are sufficient for all use cases, especially when rendering untrusted third-party content like emails.
**Prevention:** Always explicitly define `FORBID_TAGS` and `FORBID_ATTR` with known dangerous elements when configuring `DOMPurify`, and ideally share a central strict configuration across the application instead of redefining it per component.
