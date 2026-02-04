import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { doLogin, doSignup, forgetPassword, doCompleteSignup, verifyRegisterToken } from "../services/auth";
import { setToken, deleteToken, getToken } from "../services/cookies";
import { setAuthToken } from "../config/axios";
import { getUserDetails } from "../services/user";
import { queryKeys } from "../lib/queryKeys";
import { useUserDetails } from "./useUser";

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: { email: string; password: string; redirect?: string }) => doLogin(credentials),
    onSuccess: (data, variables) => {
      if (data.success && data.result.token) {
        setToken(data.result.token);
        setAuthToken(data.result.token);
        if (data.result.user) {
          // Invalidate to fetch full details (including access rights) instead of setting partial data
          queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
        }

        const redirect = variables.redirect || "/dashboard";
        router.push(redirect);
      }
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (params: { firstName: string; lastName: string; email: string; password: string; token: string | null; accountType: string }) =>
      doSignup(params.firstName, params.lastName, params.email, params.password, params.token, params.accountType),
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email: string) => forgetPassword(email),
  });
};

export const useResendVerificationEmail = () => {
  return useMutation({
    mutationFn: (email: string) => import("../services/auth").then(mod => mod.resendVerificationEmail(email)),
  });
};

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    deleteToken();
    setAuthToken(null);
    queryClient.clear();
    // Clear profile completion banner dismissal so it shows again on next login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('profileCompletionBannerDismissed');
      localStorage.removeItem('user');
    }
    router.push("/login");
  };
};

export const useUser = () => {
  const token = getToken();

  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: getUserDetails,
    enabled: !!token,
    retry: false,
  });
};

export const useVerifyToken = (token: string | null) => {
  return useQuery({
    queryKey: queryKeys.auth.verifyToken(token),
    queryFn: () => verifyRegisterToken(token!),
    enabled: !!token,
    retry: false,
  });
};

export const useCompleteSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      registerToken: string | null;
      companyName: string;
      businessType: string;
      accountType: string;
      country: string;
      timezone: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    }) =>
      doCompleteSignup(
        params.registerToken,
        params.companyName,
        params.businessType,
        params.accountType,
        params.country,
        params.timezone,
        params.firstName,
        params.lastName,
        params.phone
      ),
    onSuccess: (data) => {
      if (data.success && data.result.token) {
        setToken(data.result.token);
        setAuthToken(data.result.token);
        if (data.result.user) {
          // Invalidate to fetch full details
          queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
        }
        // Redirect handled by component
      }
    },
  });
};

export const useAuth = () => {
  const token = getToken();
  const { data: userDetails } = useUserDetails();
  return { token, user: userDetails?.result };
};
