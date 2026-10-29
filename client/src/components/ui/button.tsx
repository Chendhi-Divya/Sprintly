import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export function Button({
  className = "",
  variant = "default",
  ...props
}: ButtonProps) {
  const variantClasses =
    variant === "outline"
      ? "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
      : "bg-primary text-primary-foreground hover:opacity-90";

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${variantClasses} ${className}`}
      {...props}
    />
  );
}