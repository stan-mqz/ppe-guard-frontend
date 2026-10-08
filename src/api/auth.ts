import { apiClient } from "@/api/client";
import { getSession, saveSession } from "@/auth/session";
import type { TokenResponse, UsuarioLogin, UsuarioOut } from "@/types";

export async function login(credentials: UsuarioLogin): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", credentials);
  return data;
}

/** GET /auth/me -> el usuario dueño del token (401 si fue eliminado). */
export async function obtenerYo(): Promise<UsuarioOut> {
  const { data } = await apiClient.get<UsuarioOut>("/auth/me");
  return data;
}

/** POST /auth/refresh -> token nuevo con otras 8 horas. Solo sirve con un token todavía válido. */
export async function refrescarToken(): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/refresh");
  return data;
}

/** Al token le queda menos de esto -> se renueva al entrar a la app. */
const RENOVAR_SI_QUEDAN_MS = 2 * 60 * 60 * 1000;

let renovando: Promise<boolean> | null = null;

/**
 * Renueva el token guardado y devuelve true si quedó uno nuevo. Sin `forzar`
 * solo lo hace cuando está por vencer. Un 401 (token vencido o usuario
 * eliminado) lo resuelve el interceptor de apiClient mandando a /login.
 */
export function renovarSesion(forzar = false): Promise<boolean> {
  const session = getSession();
  if (!session) return Promise.resolve(false);
  if (!forzar && session.payload.exp * 1000 - Date.now() > RENOVAR_SI_QUEDAN_MS) return Promise.resolve(false);

  // Una sola petición aunque varios loaders la pidan a la vez.
  renovando ??= refrescarToken()
    .then(({ access_token, nombre }) => {
      saveSession(access_token, nombre);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      renovando = null;
    });
  return renovando;
}
