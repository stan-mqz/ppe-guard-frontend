import { apiClient } from "@/api/client";
import type { Rol } from "@/types";
import type {
  ImportacionAlumnos,
  ResumenCoordinacion,
  UsuarioDetalle,
  UsuarioUpdate,
} from "@/types/portal";

// PPE_Guard expone los POST de creación (src/api/usuarios.ts), GET /usuarios,
// GET /usuarios/{id}, GET /auth/me y GET /coordinacion/resumen. Lo demás de
// este archivo (editar, activar/desactivar, padrón, importar, cambiar
// contraseña) y los campos extra de UsuarioDetalle son PENDIENTE EN BACKEND.

/** GET /auth/me -> el usuario autenticado (sin los campos extra de UsuarioDetalle). */
export async function obtenerMiPerfil(): Promise<UsuarioDetalle> {
  const { data } = await apiClient.get<UsuarioDetalle>("/auth/me");
  return data;
}

/**
 * GET /usuarios?rol=... (coordinador, docente). El backend acota por cargo: el
 * coordinador ve sus docentes y los alumnos de sus materias; el docente, los
 * alumnos de sus materias; el admin, todos.
 */
export async function listarUsuarios(rol: Rol): Promise<UsuarioDetalle[]> {
  const { data } = await apiClient.get<UsuarioDetalle[]>("/usuarios", { params: { rol } });
  return data;
}

/** GET /usuarios/{id}: misma visibilidad que el listado, más uno mismo (403 fuera de ella). */
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

/** GET /coordinacion/resumen -> métricas del panel: lo del cargo del coordinador, o los totales para el admin. */
export async function obtenerResumenCoordinacion(): Promise<ResumenCoordinacion> {
  const { data } = await apiClient.get<ResumenCoordinacion>("/coordinacion/resumen");
  return data;
}
