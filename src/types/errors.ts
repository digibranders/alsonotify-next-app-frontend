/**
 * Error types for better error handling throughout the application
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
}

/**
 * Type guard to check if error is an axios error
 */
export function isAxiosError(error: unknown): error is {
  response?: {
    status: number;
    data?: unknown;
  };
  message: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    'message' in error
  );
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Detect network errors first (no response from server)
  if (isAxiosError(error) && !error.response) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof NetworkError) {
    return error.message;
  }

  if (isAxiosError(error)) {
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as { message?: string; error?: string };
      return data.message || data.error || 'An error occurred';
    }
    return error.message || 'Network request failed';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

