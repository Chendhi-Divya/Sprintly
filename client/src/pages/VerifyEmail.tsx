
import { useRef, useState } from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { useVerifyEmailMutation } from "../services/authApi";
import { useDispatch } from "react-redux";

import {
  setCredentials,
  setSelectedOrganization,
} from "../store/authSlice";

import {
  useAcceptOrganizationInvitationByTokenMutation,
} from "../services/taskApi";

const verifyEmailSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

type VerifyEmailFormData = z.infer<
  typeof verifyEmailSchema
>;

export default function VerifyEmail() {
  const [errorMessage, setErrorMessage] = useState("");

  const [otpDigits, setOtpDigits] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const otpInputRefs = useRef<
    Array<HTMLInputElement | null>
  >([]);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const email = location.state?.email as
    | string
    | undefined;

  const inviteToken = location.state?.inviteToken as
    | string
    | undefined;

  const [verifyEmail, { isLoading }] =
    useVerifyEmailMutation();

  const [
    acceptInvitation,
    { isLoading: isAcceptingInvitation },
  ] = useAcceptOrganizationInvitationByTokenMutation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Keep OTP boxes and React Hook Form value synchronized.
  function updateOtp(nextDigits: string[]) {
    setOtpDigits(nextDigits);

    setValue("otp", nextDigits.join(""), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  // Handle typing and pasting OTP.
  function handleOtpChange(
    index: number,
    rawValue: string
  ) {
    const digits = rawValue.replace(/\D/g, "");

    if (!digits) {
      const next = [...otpDigits];
      next[index] = "";
      updateOtp(next);
      return;
    }

    const next = [...otpDigits];

    // A pasted OTP fills all boxes from the beginning.
    const startIndex = digits.length > 1 ? 0 : index;
    const availableDigits = digits.slice(
      0,
      6 - startIndex
    );

    for (let offset = 0; offset < availableDigits.length; offset++) {
      next[startIndex + offset] = availableDigits[offset];
    }

    updateOtp(next);

    const focusIndex = Math.min(
      startIndex + availableDigits.length,
      5
    );

    otpInputRefs.current[focusIndex]?.focus();
  }

  // Handle Backspace and arrow keys.
  function handleOtpKeyDown(
    index: number,
    key: string
  ) {
    if (
      key === "Backspace" &&
      !otpDigits[index] &&
      index > 0
    ) {
      otpInputRefs.current[index - 1]?.focus();
    }

    if (key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }

    if (
      key === "ArrowRight" &&
      index < 5
    ) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

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
      // STEP 1: Verify email using OTP.
      const response = await verifyEmail({
        email,
        otp: data.otp,
      }).unwrap();

      console.log("Email verification successful:", response);

      // STEP 2: Save verified user credentials.
      // Include the token only if the API returns one.
      if (response.token) {
        dispatch(
          setCredentials({
            user: response.user,
            token: response.token,
          })
        );
      }

      // STEP 3: Accept invitation if the user
      // registered through an organization invite.
      if (inviteToken) {
        try {
          const invitationResponse =
            await acceptInvitation({
              token: inviteToken,
            }).unwrap();

          const organization =
            invitationResponse.organization;

          if (!organization) {
            throw new Error(
              "Organization information was not returned."
            );
          }

          dispatch(
            setSelectedOrganization({
              _id: organization._id,
              org_id: organization.org_id,
              org_name: organization.org_name,
            })
          );

          navigate("/dashboard", {
            replace: true,
          });

          return;
        } catch (invitationError: unknown) {
          console.error(
            "Invitation acceptance failed:",
            invitationError
          );

          const apiError = invitationError as {
            data?: { message?: string };
            message?: string;
          };

          setErrorMessage(
            apiError?.data?.message ||
              apiError?.message ||
              "Your email was verified, but the invitation could not be accepted. Please sign in and try again."
          );

          return;
        }
      }

      // STEP 4: Normal registration.
      navigate("/organizations", {
        replace: true,
      });
    } catch (error: unknown) {
      console.error("OTP verification failed:", error);

      const apiError = error as {
        data?: { message?: string };
      };

      setErrorMessage(
        apiError?.data?.message ||
          "Invalid or expired OTP."
      );
    }
  };

  const isSubmitting =
    isLoading || isAcceptingInvitation;

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
            <Label htmlFor="otp-0">
              OTP
            </Label>

            <input
              type="hidden"
              {...register("otp")}
            />

            <div
              className="flex justify-center gap-2 sm:gap-3"
              role="group"
              aria-label="Six-digit verification code"
            >
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  ref={(element) => {
                    otpInputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={
                    index === 0
                      ? "one-time-code"
                      : "off"
                  }
                  maxLength={6}
                  value={digit}
                  aria-label={`OTP digit ${index + 1}`}
                  onChange={(event) =>
                    handleOtpChange(
                      index,
                      event.target.value
                    )
                  }
                  onKeyDown={(event) =>
                    handleOtpKeyDown(
                      index,
                      event.key
                    )
                  }
                  onPaste={(event) => {
                    const pasted = event.clipboardData
                      .getData("text")
                      .replace(/\D/g, "");

                    if (!pasted) return;

                    event.preventDefault();
                    handleOtpChange(0, pasted);
                  }}
                  className="h-12 w-11 rounded-md border border-input bg-background p-0 text-center text-lg font-semibold tracking-wide outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 sm:w-12"
                />
              ))}
            </div>

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
            disabled={isSubmitting}
          >
            {isAcceptingInvitation
              ? "Joining organization..."
              : isLoading
                ? "Verifying..."
                : "Verify Email"}
          </Button>
        </form>
      </div>
    </div>
  );
}
