import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

const TONES = {
  navy: ["bg-slate-100 text-slate-500", "text-brand"],
  success: ["bg-emerald-50 text-emerald-600", "text-emerald-600"],
  neutral: ["bg-slate-100 text-slate-500", "text-slate-500"],
  warning: ["bg-amber-50 text-amber-600", "text-amber-600"],
  danger: ["bg-red-50 text-red-500", "text-red-500"],
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string | null;
  tone?: keyof typeof TONES;
  /** Atenúa la cifra (dato desactualizado, p. ej. sin conexión). */
  dimmed?: boolean;
}

export const StatCard = ({ icon: Icon, label, value, tone = "navy", dimmed }: StatCardProps) => (
  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
    <span className={clsx("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", TONES[tone][0])}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <div className={clsx(dimmed && "opacity-40")}>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      {value === null ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className={clsx("text-3xl font-bold leading-tight", TONES[tone][1])}>{value}</p>
      )}
    </div>
  </div>
);
