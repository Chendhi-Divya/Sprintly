import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Eye, EyeOff } from "lucide-react";

import { useResetPasswordMutation } from "../services/authApi";


const resetPasswordSchema = z
  .object({
    otp: z
      .string()
      .length(6, "OTP must be 6 digits")
      .regex(
        /^\d+$/,
        "OTP must contain only numbers"
      ),

    newPassword: z
      .string()
      .min(
        8,
        "Password must be at least 8 characters"
      ),

    confirmPassword: z.string(),
  })
  .refine(
    (data) =>
      data.newPassword === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );


type ResetPasswordFormData =
  z.infer<typeof resetPasswordSchema>;


export default function ResetPassword() {

  const [errorMessage, setErrorMessage] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const navigate = useNavigate();

  const location = useLocation();

  const email = location.state?.email;


  const [resetPassword, { isLoading }] =
    useResetPasswordMutation();


  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });


  const onSubmit = async (
    data: ResetPasswordFormData
  ) => {

    setErrorMessage("");

    try {

      await resetPassword({
        email: email,
        otp: data.otp,
        newPassword: data.newPassword,
      }).unwrap();

      navigate("/login");

    } catch (error: any) {

      setErrorMessage(
        error?.data?.message ||
        "Something went wrong"
      );
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center">

      <div className="w-full max-w-md p-6">

        <h1 className="text-2xl font-bold text-center">
          Reset Password
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Enter the OTP and your new password
        </p>


        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 mt-6"
        >

          {/* OTP */}

          <div className="space-y-2">

            <Label htmlFor="otp">
              OTP
            </Label>

            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              {...register("otp")}
            />

            {errors.otp && (
              <p className="text-sm text-red-500">
                {errors.otp.message}
              </p>
            )}

          </div>


          {/* New Password */}

          <div className="space-y-2">

            <Label htmlFor="newPassword">
              New Password
            </Label>

            <div className="relative">

              <Input
                id="newPassword"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter new password"
                className="pr-10"
                {...register("newPassword")}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>

            </div>

            {errors.newPassword && (
              <p className="text-sm text-red-500">
                {errors.newPassword.message}
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
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Confirm new password"
                className="pr-10"
                {...register("confirmPassword")}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
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
            <p className="text-sm text-red-500 text-center">
              {errorMessage}
            </p>
          )}


          {/* Reset Password Button */}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading
              ? "Resetting..."
              : "Reset Password"}
          </Button>

        </form>

      </div>

    </div>
  );
}