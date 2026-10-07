import clsx from "clsx";
import { Check } from "lucide-react";
import { Fragment } from "react";

interface StepperProps {
  steps: string[];
  /** Índice (desde 0) del paso actual. */
  current: number;
}

export const Stepper = ({ steps, current }: StepperProps) => (
  <ol className="flex items-center">
    {steps.map((step, i) => (
      <Fragment key={step}>
        {i > 0 && <li aria-hidden="true" className={clsx("mx-3 h-0.5 flex-1", i <= current ? "bg-emerald-500" : "bg-slate-200")} />}
        <li className="flex items-center gap-2" aria-current={i === current ? "step" : undefined}>
          <span
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
              i < current && "bg-emerald-500 text-white",
              i === current && "bg-brand text-white",
              i > current && "bg-slate-200 text-slate-500",
            )}
          >
            {i < current ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
          </span>
          <span className={clsx("text-sm font-semibold", i > current ? "text-slate-400" : "text-slate-800")}>
            {step}
          </span>
        </li>
      </Fragment>
    ))}
  </ol>
);
