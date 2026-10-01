import { useState } from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useVerifyEmailMutation } from "../services/authApi";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/authSlice";

const verifyEmailSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

type VerifyEmailFormData =
  z.infer<typeof verifyEmailSchema>;

export default function VerifyEmail() {
  const [errorMessage, setErrorMessage] =
    useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const email = location.state?.email;

  const [verifyEmail, { isLoading }] =
    useVerifyEmailMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
  });

  const onSubmit = async (
    data: VerifyEmailFormData
  ) => {
    setErrorMessage("");

    if (!email) {
      setErrorMessage(
        "Email information is missing. Please register again."
      );
      return;
    }

    try {
      const response = await verifyEmail({
        email: email,
        otp: data.otp,
      }).unwrap();

      console.log(
        "Email verification successful:",
        response
      );

      dispatch(
        setCredentials({
          token: response.token,
          user: response.user,
        })
      );

      navigate("/dashboard");
    } catch (error: any) {
      console.error(
        "OTP verification failed:",
        error
      );

      setErrorMessage(
        error?.data?.message ||
          "Invalid or expired OTP"
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6">

        <h1 className="text-2xl font-bold text-center">
          Verify Your Email
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Enter the 6-digit OTP sent to your email
        </p>

        {email && (
          <p className="text-center text-sm mt-2">
            OTP sent to{" "}
            <span className="font-medium">
              {email}
            </span>
          </p>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 mt-6"
        >

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

          {errorMessage && (
            <p className="text-sm text-red-500 text-center">
              {errorMessage}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading
              ? "Verifying..."
              : "Verify Email"}
          </Button>

        </form>

      </div>
    </div>
  );
}