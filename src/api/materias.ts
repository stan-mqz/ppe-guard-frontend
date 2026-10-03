import { apiClient } from "@/api/client";
import type {
  AlumnoEnrollRequest,
  ListarMateriasParams,
  MateriaCreate,
  MateriaInDB,
} from "@/types";

export async function listarMaterias(params?: ListarMateriasParams): Promise<MateriaInDB[]> {
  const { data } = await apiClient.get<MateriaInDB[]>("/materias", { params });
  return data;
}

export function listarMateriasDocente(docenteId: string): Promise<MateriaInDB[]> {
  return listarMaterias({ docente_id: docenteId });
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