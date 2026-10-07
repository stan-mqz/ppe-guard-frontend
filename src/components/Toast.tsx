import { CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

/** Aviso de éxito que se cierra solo a los 5 segundos. */
export const Toast = ({ message, onClose }: ToastProps) => {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-lg"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-800">{message}</p>
      <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="text-slate-400 hover:text-slate-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
