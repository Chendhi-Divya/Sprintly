import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../store/authSlice";

import { Button } from "../components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Eye, EyeOff } from "lucide-react";

import { useLoginMutation } from "../services/authApi";


const loginSchema = z.object({
  email: z
    .string()
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

  const navigate = useNavigate();

  const [loginUser, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });


  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage("");

    try {
      const response = await loginUser({
        email: data.email,
        password: data.password,
      }).unwrap();

      console.log("Login successful:", response);
      dispatch(
        setCredentials({
            token: response.token,
            user: response.user,
  })
);

navigate("/dashboard");

    } catch (error: any) {
      console.error("Login failed:", error);

      setErrorMessage(
        error?.data?.message || "Invalid email or password"
      );
    }
  };


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

          {/* Email */}
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
                {...register("password")}
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
              onClick={() =>
                navigate("/forgot-password")
              }
              className="text-sm underline"
            >
              Forgot password?
            </button>

          </div>


          {/* Backend Error */}
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
            {isLoading ? "Logging in..." : "Login"}
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