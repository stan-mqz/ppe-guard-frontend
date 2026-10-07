import clsx from "clsx";
import type { HTMLAttributes } from "react";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLElement>) => (
  <section className={clsx("rounded-xl border border-slate-200 bg-white p-6", className)} {...props} />
);

/** Etiqueta dorada en mayúsculas ("HISTORIAL INDIVIDUAL", "SECCIÓN ACTIVA • QO101"). */
export const Eyebrow = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={clsx("text-xs font-semibold uppercase tracking-wide text-accent", className)} {...props} />
);

/** Bloque animado para los estados de carga. */
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx("animate-pulse rounded bg-slate-200", className)} />
);
