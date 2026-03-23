/**
 * Sanitizes a URL to prevent XSS (Cross-Site Scripting) via javascript:, vbscript:, data:, etc.
 *
 * @param url The URL to sanitize
 * @returns The sanitized URL, or a safe fallback (e.g., "#" or "") if the original is potentially malicious
 */
export function sanitizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Remove control characters like tab, newline that could bypass URL parsing
  // eslint-disable-next-line no-control-regex
  const cleanedUrl = trimmed.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // Allowed protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'blob:'];

  try {
    // If it's a relative URL, URL() constructor will throw.
    // We can test if it starts with valid relative prefixes.
    if (cleanedUrl.startsWith('/') || cleanedUrl.startsWith('#') || cleanedUrl.startsWith('?')) {
      return cleanedUrl;
    }

    // Try parsing as an absolute URL
    const parsedUrl = new URL(cleanedUrl);

    // Check if the protocol is in our safe list
    if (safeProtocols.includes(parsedUrl.protocol)) {
      return cleanedUrl;
    }

    // Unsafe protocol (e.g. javascript:, vbscript:, data:)
    return 'about:blank';
  } catch (_e) {
    // Fail closed: If URL parsing fails, return 'about:blank'
    return 'about:blank';
  }
}
