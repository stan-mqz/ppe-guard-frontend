import { apiClient } from "@/api/client";
import type { Rol } from "@/types";
import type {
  ImportacionAlumnos,
  ResumenCoordinacion,
  UsuarioDetalle,
  UsuarioUpdate,
} from "@/types/portal";

// Todo este archivo es PENDIENTE EN BACKEND: hoy PPE_Guard solo expone los POST
// de creación (src/api/usuarios.ts).

/** GET /usuarios/me -> perfil completo del usuario autenticado. */
export async function obtenerMiPerfil(): Promise<UsuarioDetalle> {
  const { data } = await apiClient.get<UsuarioDetalle>("/usuarios/me");
  return data;
}

/** GET /usuarios?rol=... */
export async function listarUsuarios(rol: Rol): Promise<UsuarioDetalle[]> {
  const { data } = await apiClient.get<UsuarioDetalle[]>("/usuarios", { params: { rol } });
  return data;
}

/** GET /usuarios/{id} */
export async function obtenerUsuario(usuarioId: string): Promise<UsuarioDetalle> {
  const { data } = await apiClient.get<UsuarioDetalle>(`/usuarios/${usuarioId}`);
  return data;
}

/** PUT /usuarios/{id} */
export async function actualizarUsuario(usuarioId: string, payload: UsuarioUpdate): Promise<UsuarioDetalle> {
  const { data } = await apiClient.put<UsuarioDetalle>(`/usuarios/${usuarioId}`, payload);
  return data;
}

/** PATCH /usuarios/{id}/estado -> activa o desactiva el acceso al portal. */
export async function cambiarEstadoUsuario(usuarioId: string, activo: boolean): Promise<UsuarioDetalle> {
  const { data } = await apiClient.patch<UsuarioDetalle>(`/usuarios/${usuarioId}/estado`, { activo });
  return data;
}

/** GET /usuarios/padron/{codigo} -> alumno del padrón institucional (404 si no existe). */
export async function buscarEnPadron(codigo: string): Promise<UsuarioDetalle> {
  const { data } = await apiClient.get<UsuarioDetalle>(`/usuarios/padron/${encodeURIComponent(codigo)}`);
  return data;
}

/** POST /usuarios/alumnos/importar -> CSV con columnas código, nombre, carrera, facultad. */
export async function importarAlumnos(archivo: File): Promise<ImportacionAlumnos> {
  const contenido = await archivo.text();
  const { data } = await apiClient.post<ImportacionAlumnos>("/usuarios/alumnos/importar", { contenido });
  return data;
}

/** POST /auth/cambiar-password */
export async function cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
  await apiClient.post("/auth/cambiar-password", {
    password_actual: passwordActual,
    password_nueva: passwordNueva,
  });
}

/** GET /coordinacion/resumen -> métricas del panel general. */
export async function obtenerResumenCoordinacion(): Promise<ResumenCoordinacion> {
  const { data } = await apiClient.get<ResumenCoordinacion>("/coordinacion/resumen");
  return data;
}
