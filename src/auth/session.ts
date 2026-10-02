import { jwtDecode } from "jwt-decode";
import type { JwtPayload, Rol } from "@/types";

const TOKEN_KEY = "ppe_guard_token";
const NOMBRE_KEY = "ppe_guard_nombre";

export interface Session {
  token: string;
  payload: JwtPayload;
  nombre: string;
}

export function saveSession(token: string, nombre: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NOMBRE_KEY, nombre);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NOMBRE_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Lee la sesión actual desde localStorage, validando que el JWT no haya
 * expirado. El rol embebido en el token es solo para la UI (mostrar/ocultar
 * enlaces); la autorización real siempre la aplica el backend por rol.
 */
export function getSession(): Session | null {
  const token = getToken();
  const nombre = localStorage.getItem(NOMBRE_KEY);
  if (!token || !nombre) return null;

  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) {
      clearSession();
      return null;
    }
    return { token, payload, nombre };
  } catch {
    clearSession();
    return null;
  }
}

export function hasRole(session: Session | null, ...roles: Rol[]): boolean {
  if (!session) return false;
  // Igual que ROLE_EXPANSION en el backend: admin hereda permisos de coordinador.
  const effective = new Set<Rol>([session.payload.rol]);
  if (session.payload.rol === "admin") effective.add("coordinador");
  return roles.some((r) => effective.has(r));
}
