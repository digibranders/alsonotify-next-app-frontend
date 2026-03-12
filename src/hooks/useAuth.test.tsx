import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLogin, useLogout, useRegister, useForgotPassword, useUser, useAuth } from './useAuth';
import * as AuthService from '@/services/auth';
import * as UserService from '@/services/user';
import * as CookieService from '@/services/cookies';
import * as AxiosConfig from '@/config/axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { LoginResponseDTO } from '@/types/dto/auth.dto';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock services
vi.mock('@/services/auth');
vi.mock('@/services/user');
vi.mock('@/services/cookies');
vi.mock('@/config/axios', () => ({
  default: { defaults: { headers: { common: {} } } },
  setAuthToken: vi.fn(),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('useAuth Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.clearAllMocks();
    mockPush.mockClear();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useLogin', () => {
    it('should call doLogin and set token on success', async () => {
      const mockResponse = {
        success: true,
        message: 'Login successful',
        result: {
          token: 'test-token-123',
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
        },
      };
      vi.spyOn(AuthService, 'doLogin').mockResolvedValue(mockResponse);
      vi.spyOn(CookieService, 'setToken').mockImplementation(() => { });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ email: 'test@example.com', password: 'password123', turnstileToken: null });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(AuthService.doLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        turnstileToken: null,
      });
      expect(CookieService.setToken).toHaveBeenCalledWith('test-token-123');
      expect(AxiosConfig.setAuthToken).toHaveBeenCalledWith('test-token-123');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should redirect to custom path when provided', async () => {
      const mockResponse = {
        success: true,
        message: 'Success',
        result: { token: 'test-token', user: { id: 1, name: 'Test', email: 'test@example.com' } },
      };
      vi.spyOn(AuthService, 'doLogin').mockResolvedValue(mockResponse);
      vi.spyOn(CookieService, 'setToken').mockImplementation(() => { });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          email: 'test@example.com',
          password: 'password123',
          redirect: '/dashboard/tasks',
          turnstileToken: null,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockPush).toHaveBeenCalledWith('/dashboard/tasks');
    });

    it('should not redirect on failed login', async () => {
      vi.spyOn(AuthService, 'doLogin').mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
        result: null as unknown as LoginResponseDTO,
      });

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ email: 'test@example.com', password: 'wrong', turnstileToken: null });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('useLogout', () => {
    it('should clear token and redirect to login', async () => {
      vi.spyOn(CookieService, 'deleteToken').mockImplementation(() => true);

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current();
      });

      expect(CookieService.deleteToken).toHaveBeenCalled();
      expect(AxiosConfig.setAuthToken).toHaveBeenCalledWith(null);
      expect(localStorage.removeItem).toHaveBeenCalledWith('profileCompletionBannerDismissed');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('useRegister', () => {
    it('should call doSignup with correct params', async () => {
      const mockResponse = { success: true, message: 'Signup success', result: { token: 'token', user: { id: 1, name: 'John', email: 'john@example.com' } } };
      vi.spyOn(AuthService, 'doSignup').mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'password123',
          token: null,
          accountType: 'ORGANIZATION',
          turnstileToken: 'mock-token'
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(AuthService.doSignup).toHaveBeenCalledWith(
        'John',
        'Doe',
        'john@example.com',
        'password123',
        null,
        'ORGANIZATION',
        'mock-token'
      );
    });
  });

  describe('useForgotPassword', () => {
    it('should call forgetPassword service', async () => {
      const mockResponse = { success: true, message: 'Email sent', result: { success: true } };
      vi.spyOn(AuthService, 'forgetPassword').mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useForgotPassword(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('test@example.com');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(AuthService.forgetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('useUser', () => {
    it('should fetch user details when token exists', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
      vi.spyOn(CookieService, 'getToken').mockReturnValue('valid-token');
      vi.spyOn(UserService, 'getUserDetails').mockResolvedValue({
        success: true,
        message: 'Success',
        result: { user: mockUser as any, access: {} },
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.result.user).toEqual(mockUser);
    });

    it('should not fetch when no token', () => {
      vi.spyOn(CookieService, 'getToken').mockReturnValue(null);

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useAuth', () => {
    it('should return token and user from context', async () => {
      vi.spyOn(CookieService, 'getToken').mockReturnValue('test-token');
      vi.spyOn(UserService, 'getUserDetails').mockResolvedValue({
        success: true,
        message: 'Success',
        result: { user: { id: 1, name: 'Test', email: 'test@example.com' } as any, access: {} },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.token).toBe('test-token');
    });
  });
});
