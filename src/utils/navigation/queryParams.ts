/**
 * Query parameter utilities
 */

/**
 * Convert a record of filter values to URL query params string.
 * Filters out null, empty, undefined, and 'All' values.
 * 
 * @param params - Object with key-value pairs to convert
 * @returns URL query string (e.g., "key1=value1&key2=value2")
 */
export function toQueryParams(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== null && value !== "" && value !== undefined && value !== 'All')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}
