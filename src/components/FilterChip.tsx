import clsx from "clsx";
import type { ReactNode } from "react";

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

export const FilterChip = ({ active, onClick, children }: FilterChipProps) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={clsx(
      "rounded-lg px-4 py-2 text-sm font-semibold transition",
      active
        ? "bg-brand text-white shadow-sm"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    )}
  >
    {children}
  </button>
);
