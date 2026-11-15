
import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useNavigate } from "react-router-dom";
import { useRegisterMutation } from "../services/authApi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

// Registration validation schema
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters"),

    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
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

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();

  const [inviteToken] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("invite") ?? ""
  );

  useEffect(() => {
    if (inviteToken && window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`
      );
    }
  }, [inviteToken]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [registerUser, { isLoading }] = useRegisterMutation();

  const [errorMessage, setErrorMessage] = useState("");

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch("password", "");

  const missingPasswordRequirements = [
    passwordValue.length >= 8 ? "" : "at least 8 characters",
    /[A-Z]/.test(passwordValue) ? "" : "one uppercase letter",
    /[a-z]/.test(passwordValue) ? "" : "one lowercase letter",
    /[0-9]/.test(passwordValue) ? "" : "one number",
    /[^A-Za-z0-9]/.test(passwordValue) ? "" : "one special character",
  ].filter(Boolean);

  // Continue with Google
  const handleGoogleRegister = () => {
    // Preserve invitation token during Google authentication.
    if (inviteToken) {
      sessionStorage.setItem(
        "organizationInvitationToken",
        inviteToken
      );
    }

    const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "");

    window.location.href = `${apiUrl}/auth/google`;
  };

  // Submit registration form
  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage("");

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
      }).unwrap();

      navigate("/verify-email", {
        state: {
          email: data.email,
          inviteToken,
        },
      });
    } catch (error: any) {
      if (error?.data?.fieldErrors) {
        const fieldErrors = error.data.fieldErrors;

        Object.keys(fieldErrors).forEach((field) => {
          setError(field as keyof RegisterFormData, {
            type: "server",
            message: fieldErrors[field][0],
          });
        });

        return;
      }

      const message = error?.data?.message;

      if (message) {
        setErrorMessage(message);
      } else if (error?.status === "FETCH_ERROR") {
        setErrorMessage(
          "Can't reach the server. Check your connection and try again."
        );
      } else if (error?.status === "TIMEOUT_ERROR") {
        setErrorMessage(
          "Registration is taking too long. Please try again."
        );
      } else {
        setErrorMessage(
          "Registration failed unexpectedly. Please try again."
        );
      }
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Validation errors:", errors);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Sprintly Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Sprintly
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your projects, tasks, and teams.
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">
              Create an account
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {inviteToken
                ? "Create your account using the email address that received the invitation."
                : "Enter your details to get started."}
            </p>
          </div>

          {/* Registration Form */}
          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="space-y-5"
          >

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>

              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                {...registerField("name")}
              />

              {errors.name && (
                <p className="text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...registerField("email")}
              />

              {errors.email && (
                <p className="text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pr-10"
                  {...registerField("password")}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}

              {passwordValue.length > 0 &&
                missingPasswordRequirements.length > 0 && (
                  <p
                    aria-live="polite"
                    className="text-xs leading-5 text-red-600"
                  >
                    Password must include{" "}
                    {missingPasswordRequirements.join(", ")}.
                  </p>
                )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password
              </Label>

              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="pr-10"
                  {...registerField("confirmPassword")}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              {errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Backend Error */}
            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-sm text-red-600">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Create Account Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* OR Separator */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>

            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Continue with Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleRegister}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="mr-2 h-5 w-5"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.01 13.22l7.98 6.19C12.87 13.72 17.96 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.73 6C44.43 37.96 46.98 31.86 46.98 24.55Z"
              />
              <path
                fill="#FBBC05"
                d="M10.99 28.59A14.4 14.4 0 0 1 10.2 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.58 10.78l8.41-6.19Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.04 0-11.13-4.22-13.01-9.91l-8.41 6.19C6.51 43.62 14.62 48 24 48Z"
              />
            </svg>

            Continue with Google
          </Button>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-medium text-slate-900 hover:underline"
            >
              Login
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          By creating an account, you agree to our terms and policies.
        </p>
      </div>
    </div>
  );
}
