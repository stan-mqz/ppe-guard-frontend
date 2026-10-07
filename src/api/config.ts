/** true cuando la app corre contra el backend simulado de src/mocks. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

/** MJPEG de la cámara IA del servidor (GET /api/v1/stream). */
export const STREAM_URL = `${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/stream`;

/**
 * URL absoluta de una evidencia. `evidencia_url` llega como ruta del servidor
 * ("/static/evidence/..."); en desarrollo Vite ya hace proxy de /static.
 */
export function urlEvidencia(ruta: string): string {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  return /^https?:\/\//.test(base) ? new URL(ruta, base).href : ruta;
}
