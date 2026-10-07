import clsx from "clsx";
import type { ReactNode } from "react";

export type PillTone = "success" | "danger" | "neutral" | "warning";

const TONES: Record<PillTone, [string, string]> = {
  success: ["bg-emerald-50 text-emerald-600", "bg-emerald-500"],
  danger: ["bg-red-50 text-red-600", "bg-red-500"],
  warning: ["bg-amber-50 text-amber-700", "bg-amber-500"],
  neutral: ["bg-slate-100 text-slate-500", "bg-slate-400"],
};

interface StatusPillProps {
  tone?: PillTone;
  /** false para las pills de tabla ("Activo"), que no van en mayúsculas. */
  uppercase?: boolean;
  children: ReactNode;
}

export const StatusPill = ({ tone = "success", uppercase = true, children }: StatusPillProps) => (
  <span
    className={clsx(
      "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
      uppercase && "uppercase",
      TONES[tone][0],
    )}
  >
    <span className={clsx("h-1.5 w-1.5 rounded-full", TONES[tone][1])} />
    {children}
  </span>
);
