
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import {
  setCredentials,
  setSelectedOrganization,
} from "../store/authSlice";

import { Button } from "../components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Eye, EyeOff } from "lucide-react";

import {
  useLoginMutation,
  useLazyGetCurrentUserQuery,
} from "../services/authApi";

import {
  useLazyGetOrganizationsQuery,
  useLazyGetProjectsQuery,
  useAcceptOrganizationInvitationByTokenMutation,
} from "../services/taskApi";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Please enter a valid email"),

  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const googleProcessed = useRef(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loginUser, { isLoading: isLoginLoading }] =
    useLoginMutation();

  const [getCurrentUser] = useLazyGetCurrentUserQuery();

  const [
    getOrganizations,
    { isFetching: isOrganizationsLoading },
  ] = useLazyGetOrganizationsQuery();

  const [
    getProjects,
    { isFetching: isProjectsLoading },
  ] = useLazyGetProjectsQuery();

  const [acceptInvitation, { isLoading: isInvitationLoading }] =
    useAcceptOrganizationInvitationByTokenMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Complete login and workspace navigation for both login methods
  const completeAuthentication = async (
    token: string,
    user: {
      id: string;
      name: string;
      email: string;
    }
  ) => {
    // Save authentication details
    dispatch(
      setCredentials({
        token,
        user,
      })
    );

    // Check whether the user has an organization invitation
    let invitedOrganization = null;
    let invitedProjectId = "";

    const invitationToken = sessionStorage.getItem(
      "organizationInvitationToken"
    );

    if (invitationToken) {
      const invitationResponse = await acceptInvitation({
        token: invitationToken,
      }).unwrap();

      invitedOrganization = invitationResponse.organization;
      invitedProjectId =
        invitationResponse.invitedProjectId ?? "";

      sessionStorage.removeItem(
        "organizationInvitationToken"
      );
    }

    // Open the organization from the invitation
    if (invitedOrganization) {
      dispatch(setSelectedOrganization(invitedOrganization));

      const projectResponse = await getProjects(
        invitedOrganization._id
      ).unwrap();

      const firstProject = projectResponse.projects?.[0];

      navigate("/dashboard", {
        replace: true,
        state: {
          selectedProjectId:
            invitedProjectId || firstProject?._id || "",
        },
      });

      return;
    }

    // Fetch organizations
    const organizationResponse =
      await getOrganizations().unwrap();

    const organizations =
      organizationResponse.organizations ?? [];

    // No organizations or multiple organizations
    if (
      organizations.length === 0 ||
      organizations.length > 1
    ) {
      navigate("/organizations", { replace: true });
      return;
    }

    // Exactly one organization
    const organization = organizations[0];

    dispatch(setSelectedOrganization(organization));

    // Fetch projects
    const projectResponse = await getProjects(
      organization._id
    ).unwrap();

    const projects = projectResponse.projects ?? [];

    // No projects: create the first project
    if (projects.length === 0) {
      navigate("/projects/create", { replace: true });
      return;
    }

    // Projects exist: open dashboard
    navigate("/dashboard", { replace: true });
  };

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.hash.substring(1)
    );

    const googleToken = params.get("token");

    if (window.location.search.includes("google=failed")) {
      setErrorMessage(
        "Google authentication failed. Please try again."
      );
      window.history.replaceState(
        null,
        "",
        window.location.pathname
      );
      return;
    }

    if (!googleToken || googleProcessed.current) {
      return;
    }

    googleProcessed.current = true;

    // Remove token from the URL after reading it
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );

    const processGoogleLogin = async () => {
      try {
        // Store token so RTK Query can use it in Authorization header
        localStorage.setItem("token", googleToken);

        // Fetch the logged-in user's details
        const response = await getCurrentUser().unwrap();

        // Complete authentication using the same workspace logic
        await completeAuthentication(
          googleToken,
          response.user
        );
      } catch (error: any) {
        console.error("Google login failed:", error);

        localStorage.removeItem("token");

        setErrorMessage(
          error?.data?.message ||
            "Google authentication failed. Please try again."
        );
      }
    };

    void processGoogleLogin();
  }, []);

  // Normal email and password login
  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage("");

    try {
      const response = await loginUser({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      }).unwrap();

      if (!response.token) {
        setErrorMessage(
          "Login successful, but authentication token was not received."
        );
        return;
      }

      await completeAuthentication(
        response.token,
        response.user
      );
    } catch (error: any) {
      console.error("Login or workspace loading failed:", error);

      setErrorMessage(
        error?.data?.message ||
          "Unable to log in or load your workspace. Please try again."
      );
    }
  };

  // Start Google OAuth
  const handleGoogleLogin = () => {
    setErrorMessage("");

    window.location.href = `${
      import.meta.env.VITE_API_URL
    }/auth/google`;
  };

  const isLoading =
    isLoginLoading ||
    isOrganizationsLoading ||
    isProjectsLoading ||
    isInvitationLoading;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-center">
          Login
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Login to your Sprintly account
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 mt-6"
        >
      

          {/* OR Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-sm text-gray-500">OR</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>

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

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="pr-10"
                {...register("password")}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {errors.password && (
              <p className="text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm underline"
            >
              Forgot password?
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p className="text-sm text-red-500 text-center">
              {errorMessage}
            </p>
          )}

          {/* Login Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Please wait..." : "Login"}
          </Button>
          {/* OR Divider */}
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t border-gray-200" />
  </div>

  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-white px-3 text-gray-400">
      Or continue with
    </span>
  </div>
</div>

{/* Continue with Google */}
<Button
  type="button"
  variant="outline"
  className="w-full flex items-center justify-center gap-3"
  onClick={handleGoogleLogin}
  disabled={isLoading}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    className="h-5 w-5"
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.05 13.22l7.98 6.19C11.92 13.72 17.48 9.5 24 9.5Z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.99 46.98 31.86 46.98 24.55Z"
    />
    <path
      fill="#FBBC05"
      d="M10.03 28.59A14.4 14.4 0 0 1 9.25 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.05 10.78l7.98-6.19Z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.52 0-12.08-4.22-14.07-10.09l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
    />
  </svg>

  Continue with Google
</Button>

          {/* Register Link */}
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="underline text-black"
            >
              Register
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
