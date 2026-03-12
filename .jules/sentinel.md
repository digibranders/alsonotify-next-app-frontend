## 2024-03-09 - Global DOMPurify Singleton Mutation
**Vulnerability:** Multiple `MailPage` components imported `DOMPurify` directly, added local hooks (`afterSanitizeAttributes`), and subsequently called `DOMPurify.removeAllHooks()`.
**Learning:** `DOMPurify` operates as a global singleton. Calling `removeAllHooks()` locally in a component globally strips all registered hooks across the application. This silently removes application-wide security policies, such as the hook in `src/utils/sanitizeHtml.ts` that enforces `target="_blank"` and `rel="noopener noreferrer"` to prevent reverse tabnabbing.
**Prevention:** Never instantiate or mutate `DOMPurify` directly inside UI components. Always rely on a centralized utility (`src/utils/sanitizeHtml.ts`) that safely encapsulates and returns a properly configured sanitizer instance.
## 2024-05-18 - [Sanitize Document Preview HTML]
**Vulnerability:** XSS/Malicious Injection risk in Document Preview Modal.
**Learning:** The application was loading potentially untrusted `.html` files and rendering them directly into an iframe using the `srcDoc` attribute without any sanitization. Even though the iframe had a `sandbox` attribute that didn't explicitly allow scripts, it's still best practice to sanitize HTML to prevent other forms of attacks like phishing overlays or CSS exfiltration.
**Prevention:** Always sanitize untrusted HTML content before rendering it, even when using sandboxed iframes. Used `DOMPurify` (via the existing `sanitizeEmailHtml` utility) to clean the content before setting it in `srcDoc`.
