import axiosApi, { setAuthToken } from "../config/axios";
import { ApiResponse } from "../constants/constants";

import { LoginResponseDTO, GenericSuccessDTO, RegisterCompleteResponseDTO, VerifyTokenResponseDTO } from "../types/dto/auth.dto";

export const doLogin = async (params: { email: string; password: string; turnstileToken?: string | null }): Promise<ApiResponse<LoginResponseDTO>> => {
    const { data } = await axiosApi.post<ApiResponse<LoginResponseDTO>>("/auth/login", params);
    return data;
};

export const doSignup = async (
  firstName: string,
  lastName: string,
  email: string,
  password?: string,
  token?: string | null,
  accountType?: string,
  turnstileToken?: string | null
): Promise<ApiResponse<RegisterCompleteResponseDTO>> => {
    const { data } = await axiosApi.post<ApiResponse<RegisterCompleteResponseDTO>>("/auth/register", {
      firstName,
      lastName,
      email,
      password,
      token,
      accountType,
      turnstileToken,
    });
    // If registration immediately logs in, set token
    if (data.success && data.result?.token) {
        setAuthToken(data.result.token);
    }
    return data;
};

export const doCompleteSignup = async (
  registerToken: string | null,
  companyName: string,
  businessType: string,
  accountType: string,
  country: string,
  timezone: string,
  firstName?: string,
  lastName?: string,
  phone?: string
  ): Promise<ApiResponse<RegisterCompleteResponseDTO>> => {
    const { data } = await axiosApi.post<ApiResponse<RegisterCompleteResponseDTO>>("/auth/register/complete", {
      registerToken,
      companyName,
      businessType,
      accountType,
      country,
      timezone,
      firstName,
      lastName,
      phone
    });
    setAuthToken(data.result.token);
    return data;
};

export const verifyRegisterToken = async (registerToken: string): Promise<ApiResponse<VerifyTokenResponseDTO>> => {
    const { data } = await axiosApi.get<ApiResponse<VerifyTokenResponseDTO>>(`/auth/register/verify-token?registerToken=${registerToken}`);
    return data;
};

export const forgetPassword = async (email: string): Promise<ApiResponse<GenericSuccessDTO>> => {
    const { data } = await axiosApi.post<ApiResponse<GenericSuccessDTO>>("/auth/password/forgot", {
      email: email,
    });
    return data;
};

export const resetPassword = async (reset_token: string, password: string): Promise<ApiResponse<GenericSuccessDTO>> => {
    const { data } = await axiosApi.post<ApiResponse<GenericSuccessDTO>>("/auth/password/reset", {
      reset_token,
      password,
    });
    return data;
};

export const resendVerificationEmail = async (email: string): Promise<ApiResponse<GenericSuccessDTO>> => {
    const { data } = await axiosApi.post<ApiResponse<GenericSuccessDTO>>("/auth/resend-verification", {
      email,
    });
    return data;
};

