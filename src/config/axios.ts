import { API_BASE_URL } from "../constants/constants";
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "universal-cookie";

const cookies = new Cookies();
const axiosApi = axios.create({
  baseURL: API_BASE_URL,
});

// Helper to set auth token consistently — prefixes Bearer per RFC 6750
export const setAuthToken = (token: string | null) => {
  if (token) {
    axiosApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axiosApi.defaults.headers.common["Authorization"];
  }
};

// Set token from cookies on initialization
const initialToken = cookies.get("_token") || "";
if (initialToken) {
  setAuthToken(initialToken);
}

// Request interceptor to add token to every request — Bearer prefix per RFC 6750
axiosApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = cookies.get("_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

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
        // Clear token and redirect to login
        cookies.remove("_token", { path: "/", sameSite: "strict" });
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosApi;
