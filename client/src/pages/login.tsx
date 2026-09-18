import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import { useLoginMutation } from "../services/authApi";
import { login } from "../store/authSlice";

//Validation rules for login form.
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .pipe(z.email("Enter a valid email")),

  password: z
    .string()
    .min(1, "Password is required"),
});

//Create TypeScript type from Zod schema.
type LoginFormData = z.infer<typeof loginSchema>;

function Login() {

  //Used to navigate to dashboard.
  const navigate = useNavigate();

  //Used to update Redux.
  const dispatch = useDispatch();

  //Connect Login page to login API.
  const [loginUser, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {

    try {

      //Send email and password to backend.
      const result = await loginUser(data).unwrap();

      console.log(result);

      //Store token and user information in Redux.
      dispatch(
        login({
          token: result.token,
          user: result.user,
        })
      );

      //Go to dashboard after successful login.
      navigate("/dashboard");

    } catch (error) {

      console.log(error);
    }
  };

  return (
    <div>

      <h1>Login</h1>

      <form onSubmit={handleSubmit(onSubmit)}>

        <div>
          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            {...register("email")}
          />

          {errors.email && (
            <p>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            {...register("password")}
          />

          {errors.password && (
            <p>{errors.password.message}</p>
          )}
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>

      </form>

    </div>
  );
}

export default Login;