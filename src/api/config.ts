import { getToken } from "@/auth/session";

/** true cuando la app corre contra el backend simulado de src/mocks. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

// El navegador no puede mandar el header Authorization desde un <img> ni desde
// un WebSocket: el stream, las evidencias y el socket reciben el token como ?token=.
const conToken = (url: string) =>
  `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(getToken() ?? "")}`;

/**
 * MJPEG de la cámara IA del servidor (GET /api/v1/stream?token=). Roles:
 * docente, coordinador y admin; sin token válido el <img> simplemente queda roto.
 */
export function urlStream(): string {
  return conToken(`${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/stream`);
}

/**
 * URL absoluta de una evidencia, con el token. `evidencia_url` llega como ruta
 * del servidor ("/static/evidence/..."); en desarrollo Vite ya hace proxy de
 * /static. Cada quien ve solo lo suyo (403 fuera de su alcance).
 */
export function urlEvidencia(ruta: string): string {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  return conToken(/^https?:\/\//.test(base) ? new URL(ruta, base).href : ruta);
}

/** URL del WebSocket de eventos en vivo, con el token. */
export function urlSocket(): string {
  return conToken(import.meta.env.VITE_WS_URL || `${location.origin.replace(/^http/, "ws")}/ws/detections`);
}
