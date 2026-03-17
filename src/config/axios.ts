import { API_BASE_URL } from "../constants/constants";
import axios, { AxiosError, AxiosResponse } from "axios";
import { clearAuthFlag } from "../services/cookies";

const axiosApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Auto-send httpOnly cookies on every request
});

// Critical endpoints that require authentication - 401 on these means auth failure
const CRITICAL_AUTH_ENDPOINTS = [
  '/user/details',
  '/user',
  '/user/user-dropdown',
  '/workspace',
  '/auth/register/complete',
];

// Response interceptor to handle network errors and 401s
axiosApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Detect network-level failures (no response received from server)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timed out. Please check your connection and try again.';
      } else if (error.code === 'ERR_NETWORK' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        error.message = 'Unable to connect. Please check your internet connection and try again.';
      } else {
        error.message = 'Unable to reach the server. Please try again in a moment.';
      }
      (error as AxiosError & { _isNetworkError: boolean })._isNetworkError = true;
    }

    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isCriticalEndpoint = CRITICAL_AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint));

      // Only redirect on 401 for critical authentication endpoints
      // Optional endpoints (like /calendar/events) can fail with 401 without meaning auth failure
      if (isCriticalEndpoint) {
        clearAuthFlag();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosApi;
