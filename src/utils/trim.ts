/**
 * Trim string for form payloads. Use when building submit payloads only;
 * do not trim controlled input value during typing (preserves paste/typing behavior).
 * @param s - Value that may be string, undefined, or null
 * @returns Trimmed string, or empty string if null/undefined
 */
export function trimStr(s: string | undefined | null): string {
  if (s == null) return '';
  return String(s).trim();
}
