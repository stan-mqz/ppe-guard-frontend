/** true cuando la app corre contra el backend simulado de src/mocks. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

/** MJPEG de la cámara IA del servidor (GET /api/v1/stream). */
export const STREAM_URL = `${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/stream`;
