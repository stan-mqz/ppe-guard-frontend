import { apiClient } from "@/api/client";
import type { AlumnoCreate, CoordinadorCreate, DocenteCreate, UsuarioOut } from "@/types";

export async function crearCoordinador(payload: CoordinadorCreate): Promise<UsuarioOut> {
  const { data } = await apiClient.post<UsuarioOut>("/usuarios/coordinadores", payload);
  return data;
}

export async function crearDocente(payload: DocenteCreate): Promise<UsuarioOut> {
  const { data } = await apiClient.post<UsuarioOut>("/usuarios/docentes", payload);
  return data;
}

export async function crearAlumno(payload: AlumnoCreate): Promise<UsuarioOut> {
  const { data } = await apiClient.post<UsuarioOut>("/usuarios/alumnos", payload);
  return data;
}

/** GET /usuarios/{id} (coordinador, docente): 403 si el usuario está fuera de su cargo. */
export async function obtenerUsuario(usuarioId: string): Promise<UsuarioOut> {
  const { data } = await apiClient.get<UsuarioOut>(`/usuarios/${usuarioId}`);
  return data;
}
