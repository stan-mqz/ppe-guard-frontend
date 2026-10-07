import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Mensaje para <Toast>. Arranca con el que otra pantalla haya dejado al
 * navegar: navigate("/app/alumnos", { state: { toast: "..." } }).
 */
export function useToast() {
  const location = useLocation();
  const inicial = (location.state as { toast?: string } | null)?.toast ?? null;
  const [toast, setToast] = useState<string | null>(inicial);
  const cerrar = useCallback(() => setToast(null), []);
  return { toast, setToast, cerrar };
}
