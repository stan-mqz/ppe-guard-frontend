import { redirect } from "react-router-dom";
import { getSession, hasRole } from "@/auth/session";
import type { Rol } from "@/types";

/**
 * Loader que protege una ruta: si no hay sesión válida, redirige a /login
 * conservando la URL de destino. Si se pasan roles, también valida que el
 * usuario pertenezca a alguno de ellos (igual que require_role en el backend,
 * pero aquí es solo para UX: la autorización real la aplica el backend).
 */
export function requireAuth(...roles: Rol[]) {
  return ({ request }: { request: Request }) => {
    const session = getSession();
    if (!session) {
      const from = new URL(request.url).pathname;
      throw redirect(`/login?from=${encodeURIComponent(from)}`);
    }
    if (roles.length > 0 && !hasRole(session, ...roles)) {
      throw redirect("/app");
    }
    return { session };
  };
}
