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

// Response interceptor to handle 401 errors
axiosApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
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
