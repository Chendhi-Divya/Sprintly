import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useForgotPasswordMutation } from "../services/authApi";


const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
});


type ForgotPasswordFormData =
  z.infer<typeof forgotPasswordSchema>;


export default function ForgotPassword() {

  const [errorMessage, setErrorMessage] =
    useState("");

  const navigate = useNavigate();

  const [forgotPassword, { isLoading }] =
    useForgotPasswordMutation();


  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });


  const onSubmit = async (
    data: ForgotPasswordFormData
  ) => {

    setErrorMessage("");

    try {

      await forgotPassword({
        email: data.email,
      }).unwrap();

      navigate("/reset-password", {
        state: {
          email: data.email,
        },
      });

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
          Forgot Password
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Enter your email to reset your password
        </p>


        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 mt-6"
        >

          <div className="space-y-2">

            <Label htmlFor="email">
              Email
            </Label>

            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register("email")}
            />

            {errors.email && (
              <p className="text-sm text-red-500">
                {errors.email.message}
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
              ? "Sending..."
              : "Send OTP"}
          </Button>


          <p className="text-center text-sm">

            Remember your password?{" "}

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="underline"
            >
              Login
            </button>

          </p>

        </form>

      </div>

    </div>
  );
}