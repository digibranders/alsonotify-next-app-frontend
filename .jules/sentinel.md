## 2026-03-05 - Fix DOMPurify removeAllHooks bug in Mail Pages
**Vulnerability:** Reverse tabnabbing vulnerability via unescaped anchors when DOMPurify hooks were removed globally.
**Learning:** `DOMPurify.removeAllHooks()` clears all global DOMPurify hooks, which effectively disabled `target="_blank"` and `rel="noopener noreferrer"` appending behavior configured in `src/utils/sanitizeHtml.ts`. This applied XSS vulnerability app-wide to other parts rendering with `sanitizeRichText` after the mail page was visited.
**Prevention:** Rather than using the global DOMPurify singleton to modify hooks dynamically, generate a local, isolated DOMPurify instance `const localDOMPurify = DOMPurify(window);` when hooks are needed, ensuring they don't impact the entire application.
