import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "accent" | "success" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-slate-200 bg-slate-100 text-brand hover:bg-slate-200",
  outline: "border border-brand bg-white text-brand hover:bg-slate-50",
  accent: "bg-accent text-brand-dark hover:brightness-95",
  success: "bg-emerald-500 text-white hover:bg-emerald-600",
  danger: "bg-red-500 text-white hover:bg-red-600",
};

/** Clases del botón, para usarlas también en un <Link>. */
export function buttonClass(variant: ButtonVariant = "primary", extra?: string): string {
  return clsx(
    "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 text-sm font-semibold transition",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = ({ variant = "primary", className, type = "button", ...props }: ButtonProps) => (
  <button type={type} className={buttonClass(variant, className)} {...props} />
);
