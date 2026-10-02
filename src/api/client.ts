import axios from "axios";
import type { ApiError } from "@/types";
import { getToken, clearSession } from "@/auth/session";

export const apiClient = axios.create({
  // Vacío en dev: Vite hace proxy de /api hacia el backend (ver vite.config.ts).
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado (el backend lo rechaza en
      // app/api/v1/dependencies.py) -> se limpia la sesión local.
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje legible del `detail` que devuelve FastAPI. */
export function getApiErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado"): string {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.detail ?? fallback;
  }
  return fallback;
}
