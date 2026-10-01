import { useState } from "react";

import { useForm } from "react-hook-form"; //imports useForm from React Hook Form to manage the form.
import { z } from "zod"; //imports Zod to create validation rules for the form.
import { zodResolver } from "@hookform/resolvers/zod"; //connects Zod validation with React Hook Form.

import { useNavigate } from "react-router-dom";
import { useRegisterMutation } from "../services/authApi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

//Think of a schema as a set of rules for your registration form.
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

//This tells TypeScript what data our registration form contains.
type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  //This allows us to move the user to another page.
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  //This connects the Register page to our register API.
  const [registerUser, { isLoading }] = useRegisterMutation();

  //This stores registration error messages.
  const [errorMessage, setErrorMessage] = useState("");

  const {
  register: registerField,
  handleSubmit,
  formState: { errors },
  setError,
} = useForm<RegisterFormData>({
  resolver: zodResolver(registerSchema),
});

  //This function runs after the form is successfully submitted through handleSubmit.
  const onSubmit = async (data: RegisterFormData) => {
    console.log("Register button clicked");
    console.log("Form data:", data);

    //Clear previous error message.
    setErrorMessage("");

    try {
      //Send the user's name, email and password to the backend.
      const response = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
      }).unwrap();

      console.log("Registration successful:", response);

      //After successful registration, move to the email verification page.
      navigate("/verify-email", {
        state: {
          email: data.email,
        },
      });
  } catch (error: any) {
  console.log(
    "Registration error:",
    JSON.stringify(error, null, 2)
  );

  console.log("Error data:", error?.data);

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

  setErrorMessage(
    error?.data?.message ||
      "Registration failed. Please try again."
  );
}
  };

  //This function runs if Zod validation fails.
  const onInvalid = (errors: any) => {
    console.error("Validation errors:", errors);
  };

  //UI
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
              Enter your details to get started.
            </p>
          </div>

          {/* Registration Form */}
          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="space-y-5"
          >

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name
              </Label>

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
              <Label htmlFor="email">
                Email
              </Label>

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
              <Label htmlFor="password">
                Password
              </Label>

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
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
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
                  placeholder="Confirm your password"
                  className="pr-10"
                  {...registerField("confirmPassword")}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
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

            {/* Register Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >

              {isLoading
                ? "Creating Account..."
                : "Create Account"}
            </Button>
          </form>

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
          By creating an account, you agree to our terms and
          policies.
        </p>
      </div>
    </div>
  );
}