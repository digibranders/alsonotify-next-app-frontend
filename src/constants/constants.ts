// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Re-export specific types if needed, or consumers should migrate to @/types/api
export type { ApiResponse } from '../types/api';

