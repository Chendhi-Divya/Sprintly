import { z } from "zod";

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .trim(),

    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email")
      .trim()
      .toLowerCase(),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain a special character"
      ),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email")
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(1, "Password is required"),
});

export const verifyOTPSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email")
    .trim()
    .toLowerCase(),

  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

export const resendOTPSchema = z.object({
    email: z
        .string()
        .email("Enter a valid email")
        .trim()
        .toLowerCase(),
});