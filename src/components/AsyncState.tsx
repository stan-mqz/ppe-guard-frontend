import { AlertTriangle } from "lucide-react";

/** Mensaje de error con botón para reintentar la carga. */
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
    <AlertTriangle className="h-6 w-6 text-red-500" aria-hidden="true" />
    <p className="text-sm font-medium text-red-600">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-brand hover:bg-slate-50"
      >
        Reintentar
      </button>
    )}
  </div>
);
