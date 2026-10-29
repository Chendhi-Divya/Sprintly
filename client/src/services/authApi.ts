
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

interface MessageResponse {
  message: string;
}

interface VerifyEmailResponse extends MessageResponse {
  token: string;
  user: AuthUser;
}

interface EmailRequest {
  email: string;
}

interface VerifyEmailRequest {
  email: string;
  otp: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export const authApi = createApi({
  reducerPath: "authApi",

  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000/api/auth",
    credentials: "include",
  }),

  tagTypes: ["Auth"],

  endpoints: (builder) => ({
    register: builder.mutation<
      MessageResponse,
      { name: string; email: string; password: string; confirmPassword: string }
    >({
      query: (data) => ({
        url: "/register",
        method: "POST",
        body: data,
      }),
    }),

    verifyEmail: builder.mutation<
      VerifyEmailResponse,
      VerifyEmailRequest
    >({
      query: (data) => ({
        url: "/verify-email",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),

    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (data) => ({
        url: "/login",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),

    getCurrentUser: builder.query<{ user: AuthUser }, void>({
      query: () => "/me",
      providesTags: ["Auth"],
    }),

    logout: builder.mutation<MessageResponse, void>({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),

    resendOTP: builder.mutation<MessageResponse, EmailRequest>({
      query: (data) => ({
        url: "/resend-otp",
        method: "POST",
        body: data,
      }),
    }),

    forgotPassword: builder.mutation<MessageResponse, EmailRequest>({
      query: (data) => ({
        url: "/forgot-password",
        method: "POST",
        body: data,
      }),
    }),

    resetPassword: builder.mutation<
      MessageResponse,
      ResetPasswordRequest
    >({
      query: (data) => ({
        url: "/reset-password",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useVerifyEmailMutation,
  useLoginMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
  useResendOTPMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
