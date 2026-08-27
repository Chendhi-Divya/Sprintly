import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const registerSchema = z //Think of a schema as a set of rules for your registration form.
  .object({
    name: z.string().min(1, { message: "Name is required" }),

    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters long"),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function Register() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),//connects React Hook Form with Zod.
  });

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <div>
      <h1>Create An Account</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Name</label>

          <input
            type="text"
            placeholder="Enter your name"
            {...register("name")}
          />

          {errors.name && <p>{errors.name.message}</p>}
        </div>

        <div>
          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            {...register("email")}
          />

          {errors.email && <p>{errors.email.message}</p>}
        </div>

        <div>
          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            {...register("password")}
          />

          {errors.password && <p>{errors.password.message}</p>}

          <div>
            <label>Confirm Password</label>

            <input
              type="password"
              placeholder="Confirm your password"
              {...register("confirmPassword")}
            />

            {errors.confirmPassword && (
              <p>{errors.confirmPassword.message}</p>
            )}
          </div>

          <div>
            <button type="submit">Create Account</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Register;