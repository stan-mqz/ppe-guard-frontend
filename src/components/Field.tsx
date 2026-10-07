import clsx from "clsx";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const CONTROL =
  "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Etiqueta + control + mensaje de error. */
export const Field = ({ label, required, error, className, children }: FieldProps) => (
  <label className={clsx("block", className)}>
    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </span>
    {children}
    {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
  </label>
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={clsx(CONTROL, className)} {...props} />
);

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={clsx(CONTROL, "pr-8", className)} {...props} />
);

/** Par etiqueta/valor de solo lectura (perfiles). */
export const ReadOnlyField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <dt className="text-[11px] font-semibold uppercase text-slate-500">{label}</dt>
    <dd className="flex min-h-[42px] items-center rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-800">
      {children ?? <span className="italic text-slate-400">No registrado</span>}
    </dd>
  </div>
);
