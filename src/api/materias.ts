import { apiClient } from "@/api/client";
import type {
  AlumnoEnrollRequest,
  ListarMateriasParams,
  MateriaCreate,
  MateriaInDB,
  UsuarioOut,
} from "@/types";

export async function listarMaterias(params?: ListarMateriasParams): Promise<MateriaInDB[]> {
  const { data } = await apiClient.get<MateriaInDB[]>("/materias", { params });
  return data;
}

export function listarMateriasDocente(docenteId: string): Promise<MateriaInDB[]> {
  return listarMaterias({ docente_id: docenteId });
}

/**
 * El backend aún no expone GET /materias/{id}; se filtra la lista del docente.
 * Esto además evita que un docente vea materias ajenas pegando otro ID en la URL.
 * Cuando exista el endpoint, reemplazar el cuerpo por:
 *   const { data } = await apiClient.get<MateriaInDB>(`/materias/${materiaId}`);
 *   return data;
 */
export async function obtenerMateriaDocente(
  docenteId: string,
  materiaId: string,
): Promise<MateriaInDB | null> {
  const materias = await listarMateriasDocente(docenteId);
  return materias.find((m) => m._id === materiaId) ?? null;
}

export async function crearMateria(payload: MateriaCreate): Promise<MateriaInDB> {
  const { data } = await apiClient.post<MateriaInDB>("/materias", payload);
  return data;
}

export async function matricularAlumno(
  materiaId: string,
  payload: AlumnoEnrollRequest,
): Promise<MateriaInDB> {
  const { data } = await apiClient.post<MateriaInDB>(`/materias/${materiaId}/alumnos`, payload);
  return data;
}

/**
 * PENDIENTE EN BACKEND: GET /api/v1/materias/{materia_id}/alumnos -> UsuarioOut[]
 */
export async function listarAlumnosMateria(materiaId: string): Promise<UsuarioOut[]> {
  const { data } = await apiClient.get<UsuarioOut[]>(`/materias/${materiaId}/alumnos`);
  return data;
}

/**
 * PENDIENTE EN BACKEND: DELETE /api/v1/materias/{materia_id}/alumnos/{alumno_id}
 * -> MateriaInDB actualizada (igual que el POST de matrícula).
 */
export async function darDeBajaAlumno(materiaId: string, alumnoId: string): Promise<MateriaInDB> {
  const { data } = await apiClient.delete<MateriaInDB>(
    `/materias/${materiaId}/alumnos/${alumnoId}`,
  );
  return data;
}