import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const authApi = createApi({
  //This gives our API service a name.
  reducerPath: "authApi",

  //This is the common URL of our authentication backend.
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000/api/auth",
  }),

  endpoints: (builder) => ({

    //Register API
    register: builder.mutation({
      query: (data) => ({
        url: "/register",
        method: "POST",
        body: data,
      }),
    }),

    //Verify email API
    verifyEmail: builder.mutation({
      query: (data) => ({
        url: "/verify-email",
        method: "POST",
        body: data,
      }),
    }),

    //Login API
    login: builder.mutation({
      query: (data) => ({
        url: "/login",
        method: "POST",
        body: data,
      }),
    }),

    //Resend OTP API
    resendOTP: builder.mutation({
      query: (data) => ({
        url: "/resend-otp",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

//These hooks will be used inside our React pages.
export const {
  useRegisterMutation,
  useVerifyEmailMutation,
  useLoginMutation,
  useResendOTPMutation,
} = authApi;