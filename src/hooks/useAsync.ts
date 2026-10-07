import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/api/client";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Ejecuta un servicio de src/api y expone los tres estados que pide el diseño
 * para tablas y tarjetas: cargando, error (con `reload` para reintentar) y datos.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], fallback = "No se pudieron cargar los datos") {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => vigente && setState({ data, loading: false, error: null }))
      .catch(
        (error) =>
          vigente && setState({ data: null, loading: false, error: getApiErrorMessage(error, fallback) }),
      );
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intento]);

  const reload = useCallback(() => setIntento((n) => n + 1), []);
  return { ...state, reload };
}
