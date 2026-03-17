/**
 * Shared API type utilities for consistent error handling and response typing
 */

/**
 * Common API error structure from Axios/fetch responses
 */
export interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

/**
 * Extract error message from unknown error (catch blocks)
 * @param error - The caught error (unknown type)
 * @param fallback - Default message if extraction fails
 */
export function getErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  if (!error) return fallback;

  // Detect network errors first (no response from server)
  const errWithCode = error as { response?: unknown; code?: string };
  if (!errWithCode?.response && errWithCode?.code) {
    if (errWithCode.code === 'ERR_NETWORK' || errWithCode.code === 'ECONNABORTED') {
      return 'Unable to connect. Please check your internet connection and try again.';
    }
  }

  const apiError = error as ApiError;
  return (
    apiError?.response?.data?.message ||
    apiError?.response?.data?.error ||
    apiError?.message ||
    fallback
  );
}

/**
 * Generic paginated API response wrapper
 */
export interface PaginatedResponse<T> {
  result: T[];
  total?: number;
  page?: number;
  limit?: number;
  success?: boolean;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponseWrapper<T> {
  success: boolean;
  result?: T;
  message?: string;
  error?: string;
}
