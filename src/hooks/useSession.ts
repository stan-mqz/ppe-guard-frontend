import { useState } from "react";
import { getSession, type Session } from "@/auth/session";

/**
 * Sesión del usuario dentro de las rutas protegidas. requireAuth() ya
 * garantizó que existe antes de renderizar, por eso no devuelve null.
 */
export function useSession(): Session {
  const [session] = useState(() => getSession());
  return session!;
}
