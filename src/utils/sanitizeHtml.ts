import DOMPurify from 'dompurify';

/**
 * Configuration for rich text sanitization.
 * Enforces a strict allowlist of tags and attributes to prevent XSS.
 * Preserves styling and structure needed for the RichTextEditor.
 */

const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'u', 'strong', 'em', 's', 'strike', 
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
  'ul', 'ol', 'li', 'blockquote', 
  'code', 'pre', 
  'span', 'div', // Needed for layout and checklist items
  'img', 'a'
];

const ALLOWED_ATTRIBUTES = [
  'href', 'target', 'rel', 
  'src', 'alt', 
  'style', // Required for editor styles (indentation, list markers)
  'class', // Allow classes for now, but we might want to restrict this later
  'type', // For input elements if any, or list types
  'checked', // For checklist representation if using input (legacy/backend format compatibility)
  'data-placeholder' // For editor placeholder
];

const SHARED_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i, // Default DOMPurify is good, but being explicit. Blocks javascript: layout: etc.
  ADD_ATTR: ['target'], // Ensure we can force target
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'], // Explicitly forbid dangerous tags even if not in allowlist
  FORBID_ATTR: ['on*', 'form*', 'action', 'formaction'], // Explicitly forbid event handlers
};

let sanitizerInstance: any = null;

function getSanitizer() {
    if (sanitizerInstance) return sanitizerInstance;

    if (typeof window === 'undefined') {
        // Server-side
        try {
            // Use jsdom if available (e.g. during build or if installed in deps)
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { JSDOM } = require('jsdom');
            const window = new JSDOM('').window;
            sanitizerInstance = DOMPurify(window);
        } catch (e) {
            console.warn('DOMPurify: jsdom not available on server, HTML sanitization skipped (returning empty string for safety).');
            // Safe fallback: return empty string sanitizer
            return { sanitize: () => '' };
        }
    } else {
        // Client-side
        sanitizerInstance = DOMPurify;
        // If DOMPurify is a factory function (common in some bundlers/envs), initialize it
        if (typeof sanitizerInstance === 'function') {
            sanitizerInstance = sanitizerInstance(window);
        }
    }

    // Add a hook to enforce target="_blank" and rel="noopener noreferrer" on links
    // Only add if supported (instance)
    if (sanitizerInstance && typeof sanitizerInstance.addHook === 'function') {
        sanitizerInstance.addHook('afterSanitizeAttributes', (node: any) => {
            if ('target' in node) {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }

    return sanitizerInstance;
}

/**
 * Sanitizes HTML content for general display.
 * Ensures links open in new tab and have noopener noreferrer.
 */
export function sanitizeRichText(html: string): string {
  if (!html) return '';

  return getSanitizer().sanitize(html, {
    ...SHARED_CONFIG,
    ADD_ATTR: ['target', 'rel'],
  });
}

/**
 * Sanitizes HTML content for use inside the editor.
 * Similar to sanitizeRichText but might be slightly more permissive if editor needs internal markers.
 * Currently uses the same strict config.
 */
export function sanitizeRichTextForEditor(html: string): string {
    if (!html) return '';
    return getSanitizer().sanitize(html, {
        ...SHARED_CONFIG,
    });
}
