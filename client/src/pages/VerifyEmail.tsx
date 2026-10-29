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
import { setCredentials, setSelectedOrganization } from "../store/authSlice";
import { useAcceptOrganizationInvitationMutation } from "../services/taskApi";

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
  const invitationId = location.state?.invitationId as string | undefined;

  const [verifyEmail, { isLoading }] =
    useVerifyEmailMutation();
  const [acceptInvitation, { isLoading: isAcceptingInvitation }] =
    useAcceptOrganizationInvitationMutation();

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
          user: response.user,
        })
      );

      if (invitationId) {
        try {
          const invitationResponse = await acceptInvitation(invitationId).unwrap();
          dispatch(setSelectedOrganization({
            _id: invitationResponse.organization._id,
            org_id: invitationResponse.organization.org_id,
            org_name: invitationResponse.organization.org_name,
          }));
          navigate("/dashboard", { replace: true });
          return;
        } catch {
          navigate("/settings/organization", { replace: true });
          return;
        }
      }

      // Organization selection redirects to the workspace when one exists,
      // or displays the create-organization form when the user has none.
      navigate("/organizations", { replace: true });
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
            disabled={isLoading || isAcceptingInvitation}
          >
            {isLoading || isAcceptingInvitation
              ? isAcceptingInvitation ? "Joining organization..." : "Verifying..."
              : "Verify Email"}
          </Button>

        </form>

      </div>
    </div>
  );
}