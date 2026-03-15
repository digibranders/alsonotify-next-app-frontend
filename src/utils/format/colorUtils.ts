/**
 * Color utility functions for consistent color handling
 */

/**
 * Convert hex color to rgba with opacity
 */
export function hexToRgba(hex: string, opacity: number): string {
  // Normalize hex color
  let cleanHex = hex.replace('#', '');
  
  // Handle 3-digit hex
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  // Handle 6-digit hex
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  
  // Fallback to default color (red)
  return `rgba(255, 59, 59, ${opacity})`;
}

/**
 * Default note colors
 */
export const NOTE_COLORS = [
  '#ff3b3b',
  '#3b8eff',
  '#9b59b6',
  '#FFA500',
  '#2ecc71',
  '#e74c3c',
] as const;

export const DEFAULT_NOTE_COLOR = '#ff3b3b';

