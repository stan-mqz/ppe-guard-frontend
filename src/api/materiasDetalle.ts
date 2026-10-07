import { apiClient } from "@/api/client";
import { listarPracticas } from "@/api/practices";
import type { PracticeInDB } from "@/types";
import type { Facultad, MateriaDetalle, MateriaPayload, MateriaVista, TemaPractica } from "@/types/portal";

// El catálogo de EPP por área es secundario: si falla, la materia se muestra sin EPP.
const catalogoEpp = () => listarPracticas().catch(() => [] as PracticeInDB[]);

function conEpp(materia: MateriaDetalle, catalogo: PracticeInDB[]): MateriaVista {
  return {
    ...materia,
    epp: materia.epp ?? catalogo.find((p) => p.area === materia.area)?.ppe_requerido ?? [],
  };
}

/**
 * GET /materias con el EPP de cada materia ya resuelto.
 * PENDIENTE EN BACKEND: el filtro `alumno_id` (materias donde está inscrito un alumno).
 */
export async function listarMateriasDetalle(params?: {
  docente_id?: string;
  alumno_id?: string;
}): Promise<MateriaVista[]> {
  const [{ data }, catalogo] = await Promise.all([
    apiClient.get<MateriaDetalle[]>("/materias", { params }),
    catalogoEpp(),
  ]);
  return data.map((m) => conEpp(m, catalogo));
}

/**
 * PENDIENTE EN BACKEND: GET /api/v1/materias/{materia_id}. Mientras no exista
 * se busca en el listado, que el backend ya filtra según el rol.
 */
export async function obtenerMateria(materiaId: string): Promise<MateriaVista> {
  const catalogo = await catalogoEpp();
  try {
    const { data } = await apiClient.get<MateriaDetalle>(`/materias/${materiaId}`);
    return conEpp(data, catalogo);
  } catch (error) {
    const { data } = await apiClient.get<MateriaDetalle[]>("/materias");
    const materia = data.find((m) => m._id === materiaId);
    if (!materia) throw error;
    return conEpp(materia, catalogo);
  }
}

/** POST /materias (crear) o PUT /materias/{id} (PENDIENTE EN BACKEND). */
export async function guardarMateria(payload: Partial<MateriaPayload>, materiaId?: string): Promise<MateriaDetalle> {
  const { data } = materiaId
    ? await apiClient.put<MateriaDetalle>(`/materias/${materiaId}`, payload)
    : await apiClient.post<MateriaDetalle>("/materias", payload);
  return data;
}

/** PENDIENTE EN BACKEND: DELETE /api/v1/materias/{materia_id} */
export async function eliminarMateria(materiaId: string): Promise<void> {
  await apiClient.delete(`/materias/${materiaId}`);
}

/** PENDIENTE EN BACKEND: GET /api/v1/materias/{materia_id}/temas -> prácticas del programa. */
export async function listarTemas(materiaId: string): Promise<TemaPractica[]> {
  const { data } = await apiClient.get<TemaPractica[]>(`/materias/${materiaId}/temas`);
  return data;
}

/** PENDIENTE EN BACKEND: GET /api/v1/catalogos/facultades */
export async function listarFacultades(): Promise<Facultad[]> {
  const { data } = await apiClient.get<Facultad[]>("/catalogos/facultades");
  return data;
}
