// API Configuration
// Relative path — requests are proxied to the backend via Next.js rewrites in next.config.mjs
// This eliminates CORS preflight (OPTIONS) overhead since requests stay same-origin.
export const API_BASE_URL = "/api/v1";

// Re-export specific types if needed, or consumers should migrate to @/types/api
export type { ApiResponse } from '../types/api';

