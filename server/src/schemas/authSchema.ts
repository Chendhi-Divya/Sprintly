import { z } from "zod";

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters"),

    email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .refine(
      (email) => email.endsWith("@gmail.com"),
    "Please use a Gmail address"
  )
  .toLowerCase(),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /[A-Z]/,
        "Password must contain at least one uppercase letter"
      )
      .regex(
        /[0-9]/,
        "Password must contain at least one number"
      )
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),

    confirmPassword: z
      .string()
      .min(1, "Confirm password is required"),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase(),

  password: z
    .string()
    .min(1, "Password is required"),
});

export const verifyOTPSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase(),

  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(
      /^\d+$/,
      "OTP must contain only numbers"
    ),
});

export const resendOTPSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase(),
});