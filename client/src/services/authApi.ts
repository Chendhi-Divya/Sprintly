
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store/store";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  message: string;
  token?: string;
  user: AuthUser;
}

interface MessageResponse {
  message: string;
}

interface VerifyEmailResponse extends MessageResponse {
  token: string;
  user: AuthUser;
}

interface UpdateProfileResponse extends MessageResponse {
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

interface EmailChangeResponse extends MessageResponse {
  user: AuthUser;
}

export const authApi = createApi({
  reducerPath: "authApi",

  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL}/auth`,
    credentials: "include",

    prepareHeaders: (headers, { getState }) => {
      const reduxToken = (getState() as RootState).auth.token;

      const storedToken =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;

      const token = reduxToken || storedToken;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),

  tagTypes: ["Auth"],

  endpoints: (builder) => ({
    register: builder.mutation<
      MessageResponse,
      {
        name: string;
        email: string;
        password: string;
        confirmPassword: string;
      }
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
        body: {
          email: data.email.trim().toLowerCase(),
          password: data.password,
        },
      }),
      invalidatesTags: ["Auth"],
    }),

    getCurrentUser: builder.query<{ user: AuthUser }, void>({
      query: () => "/me",
      providesTags: ["Auth"],
    }),

    updateProfile: builder.mutation<
      UpdateProfileResponse,
      { name: string }
    >({
      query: (data) => ({
        url: "/profile",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),

    requestEmailChange: builder.mutation<
      MessageResponse,
      EmailRequest
    >({
      query: (data) => ({
        url: "/change-email",
        method: "POST",
        body: {
          email: data.email.trim().toLowerCase(),
        },
      }),
    }),

    verifyEmailChangeOTP: builder.mutation<
      EmailChangeResponse,
      VerifyEmailRequest
    >({
      query: (data) => ({
        url: "/verify-email-change",
        method: "POST",
        body: {
          email: data.email.trim().toLowerCase(),
          otp: data.otp,
        },
      }),
      invalidatesTags: ["Auth"],
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
  useUpdateProfileMutation,
  useRequestEmailChangeMutation,
  useVerifyEmailChangeOTPMutation,
  useLogoutMutation,
  useResendOTPMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
