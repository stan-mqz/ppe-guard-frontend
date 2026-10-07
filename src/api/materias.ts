import axios from "axios";
import { apiClient } from "@/api/client";
import type {
  AlumnoEnMateriaOut,
  AlumnoEnrollRequest,
  ListarMateriasParams,
  MateriaCreate,
  MateriaInDB,
  MateriaUpdate,
} from "@/types";

export async function listarMaterias(params?: ListarMateriasParams): Promise<MateriaInDB[]> {
  const { data } = await apiClient.get<MateriaInDB[]>("/materias", { params });
  return data;
}

export function listarMateriasDocente(docenteId: string): Promise<MateriaInDB[]> {
  return listarMaterias({ docente_id: docenteId });
}

/** GET /materias/{id}: el backend responde 403 si el docente no imparte esa materia. */
export async function obtenerMateriaDocente(
  _docenteId: string,
  materiaId: string,
): Promise<MateriaInDB | null> {
  try {
    const { data } = await apiClient.get<MateriaInDB>(`/materias/${materiaId}`);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && [403, 404, 422].includes(error.response?.status ?? 0)) return null;
    throw error;
  }
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

export async function listarAlumnosMateria(materiaId: string): Promise<AlumnoEnMateriaOut[]> {
  const { data } = await apiClient.get<AlumnoEnMateriaOut[]>(`/materias/${materiaId}/alumnos`);
  return data;
}

/** Quitar es por `_id` del alumno (matricular es por código). Devuelve la materia actualizada. */
export async function darDeBajaAlumno(materiaId: string, alumnoId: string): Promise<MateriaInDB> {
  const { data } = await apiClient.delete<MateriaInDB>(
    `/materias/${materiaId}/alumnos/${alumnoId}`,
  );
  return data;
}

export async function actualizarMateria(materiaId: string, cambios: MateriaUpdate): Promise<MateriaInDB> {
  const { data } = await apiClient.patch<MateriaInDB>(`/materias/${materiaId}`, cambios);
  return data;
}
